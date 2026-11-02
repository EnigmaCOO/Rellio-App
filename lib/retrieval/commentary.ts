/**
 * Commentary retrieval — read helpers over the `commentary_chunks` pgvector store.
 *
 * Scholar Engine building block, the commentary counterpart to
 * lib/retrieval/search.ts. Two access patterns:
 *   - getCommentaryForRefs   — exact lookup: "what does the canon say ON these
 *                              verses?" (anchored by onRef).
 *   - searchCommentary       — semantic cosine-NN search across a tradition's
 *                              commentary.
 * Plus getCommentaryAvailability, which reconciles the DECLARED canon
 * (config/scholars.ts) with what is ACTUALLY in the store — so callers can tell
 * "the canon names Rashi" from "Rashi has actually been ingested".
 *
 * NOTE: This is deliberately NOT imported anywhere yet. It is an add-only
 * capability for a later wiring phase; importing it now is out of scope.
 */

import { and, cosineDistance, eq, inArray, sql } from "drizzle-orm";
import { db } from "../../server/db";
import { commentaryChunks } from "../../shared/schema";
import { embedText } from "../../server/services/embeddings";
import { getCommentaryCanon, commentaryNamespace } from "../../config/scholars";
import type { CommentaryExcerpt } from "../../types/retrieval";
import type { CommentarySource, TraditionId } from "../../types/scholar";

export interface CommentarySearchOptions {
  /** Restrict to a single tradition's commentary corpus (required). */
  tradition: TraditionId;
  /** Number of nearest neighbours to return (default 8). */
  k?: number;
}

export interface CommentarySearchResult extends CommentaryExcerpt {
  /** Cosine similarity (1 - cosine distance). 1 = identical direction. */
  score: number;
}

export interface CommentarySourceAvailability extends CommentarySource {
  /** True only if at least one excerpt for this source is in the store. */
  ingested: boolean;
  /** How many excerpts of this source are currently ingested. */
  chunkCount: number;
}

function toExcerpt(row: {
  sourceId: string;
  sourceTitle: string;
  author: string;
  onRef: string;
  text: string;
  language: string;
}, tradition?: TraditionId): CommentaryExcerpt {
  return {
    sourceId: row.sourceId,
    sourceTitle: row.sourceTitle,
    author: row.author,
    onRef: row.onRef,
    text: row.text,
    language: row.language,
    tradition,
  };
}

/**
 * Exact, verse-anchored lookup: every ingested commentary excerpt that comments
 * ON one of `refIds` for the given tradition. Ordered by verse, then source,
 * then excerpt index. Sources that were never ingested are simply absent.
 */
export async function getCommentaryForRefs(
  refIds: string[],
  tradition: TraditionId,
): Promise<CommentaryExcerpt[]> {
  const refs = Array.from(
    new Set(refIds.map((r) => r.trim()).filter((r) => r.length > 0)),
  );
  if (refs.length === 0) return [];

  const rows = await db
    .select({
      sourceId: commentaryChunks.sourceId,
      sourceTitle: commentaryChunks.sourceTitle,
      author: commentaryChunks.author,
      onRef: commentaryChunks.onRef,
      text: commentaryChunks.text,
      language: commentaryChunks.language,
    })
    .from(commentaryChunks)
    .where(
      and(
        eq(commentaryChunks.tradition, tradition),
        inArray(commentaryChunks.onRef, refs),
      ),
    )
    .orderBy(
      commentaryChunks.onRef,
      commentaryChunks.sourceId,
      commentaryChunks.chunkIndex,
    );

  return rows.map((row) => toExcerpt(row, tradition));
}

/**
 * Semantic search: the commentary excerpts whose embeddings are closest to
 * `query`, scoped to one tradition. Embeds the query, then delegates to
 * searchCommentaryByVector. Returns up to `k` results, most similar first.
 */
export async function searchCommentary(
  query: string,
  options: CommentarySearchOptions,
): Promise<CommentarySearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const queryVector = await embedText(trimmed);
  return searchCommentaryByVector(queryVector, options);
}

/**
 * Lower-level search over an already-computed query embedding. Kept separate so
 * the cosine-NN path can be exercised without the embedding provider.
 */
export async function searchCommentaryByVector(
  queryVector: number[],
  options: CommentarySearchOptions,
): Promise<CommentarySearchResult[]> {
  const k = options.k && options.k > 0 ? options.k : 8;
  const distance = cosineDistance(commentaryChunks.embedding, queryVector);

  const rows = await db
    .select({
      sourceId: commentaryChunks.sourceId,
      sourceTitle: commentaryChunks.sourceTitle,
      author: commentaryChunks.author,
      onRef: commentaryChunks.onRef,
      text: commentaryChunks.text,
      language: commentaryChunks.language,
      distance: sql<number>`${distance}`,
    })
    .from(commentaryChunks)
    .where(eq(commentaryChunks.tradition, options.tradition))
    .orderBy(distance)
    .limit(k);

  return rows.map((row) => ({
    ...toExcerpt(row, options.tradition),
    score: 1 - Number(row.distance),
  }));
}

/**
 * Reconcile DECLARED vs INGESTED. Returns every source the canon declares for a
 * tradition, annotated with whether it has actually been ingested and how many
 * excerpts exist. The canon's static `availability` hint is preserved; `ingested`
 * is the ground truth from the store.
 */
export async function getCommentaryAvailability(
  tradition: TraditionId,
): Promise<CommentarySourceAvailability[]> {
  const canon = getCommentaryCanon(tradition);
  if (canon.length === 0) return [];

  const counts = await db
    .select({
      namespace: commentaryChunks.namespace,
      count: sql<number>`count(*)::int`,
    })
    .from(commentaryChunks)
    .where(eq(commentaryChunks.tradition, tradition))
    .groupBy(commentaryChunks.namespace);

  const countByNamespace = new Map(
    counts.map((c) => [c.namespace, Number(c.count)]),
  );

  return canon.map((source) => {
    const namespace = commentaryNamespace(tradition, source.id);
    const chunkCount = countByNamespace.get(namespace) ?? 0;
    return { ...source, ingested: chunkCount > 0, chunkCount };
  });
}
