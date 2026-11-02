/**
 * Scripture retrieval — cosine nearest-neighbour search over the pgvector store.
 *
 * Scholar Engine building block. Embeds the query with the same central
 * embedding wrapper used for ingestion (server/services/embeddings.ts) and
 * returns the closest verses as ScriptureCitation[] (the contract the grounded
 * Scholar/Ask pipelines consume).
 *
 * NOTE: This is deliberately NOT imported anywhere yet. It is an add-only
 * capability for a later wiring phase; importing it now is out of scope.
 */

import { and, cosineDistance, eq, inArray, sql } from "drizzle-orm";
import { db } from "../../server/db";
import { scriptureChunks } from "../../shared/schema";
import { embedText } from "../../server/services/embeddings";
import type { ScriptureCitation } from "../../types/retrieval";
import type { TraditionId } from "../../types/scholar";

export interface SearchOptions {
  /** Restrict to these traditions (TraditionId values). Omit for all. */
  traditions?: TraditionId[];
  /** Restrict to a single corpus/edition namespace, e.g. "quran:en.asad". */
  namespace?: string;
  /** Number of nearest neighbours to return (default 8). */
  k?: number;
}

export interface ScriptureSearchResult extends ScriptureCitation {
  /**
   * Cosine similarity (1 - cosine distance). 1 = identical direction; typically
   * in [0, 1] for text embeddings, but can dip below 0 for opposing vectors.
   */
  score: number;
}

/**
 * Find the verses whose translation embeddings are closest to `query`.
 * Embeds the query, then delegates to `searchByVector`. Returns up to `k`
 * results ordered by descending similarity.
 */
export async function searchScripture(
  query: string,
  options: SearchOptions = {},
): Promise<ScriptureSearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const queryVector = await embedText(trimmed);
  return searchByVector(queryVector, options);
}

/**
 * Lower-level search over an already-computed query embedding. Kept separate so
 * the cosine-NN path can be exercised independently of the embedding provider.
 * Returns up to `k` results ordered by descending similarity.
 */
export async function searchByVector(
  queryVector: number[],
  options: SearchOptions = {},
): Promise<ScriptureSearchResult[]> {
  const k = options.k && options.k > 0 ? options.k : 8;

  const distance = cosineDistance(scriptureChunks.embedding, queryVector);

  const filters = [];
  if (options.traditions && options.traditions.length > 0) {
    filters.push(inArray(scriptureChunks.tradition, options.traditions));
  }
  if (options.namespace) {
    filters.push(eq(scriptureChunks.namespace, options.namespace));
  }

  const rows = await db
    .select({
      refId: scriptureChunks.refId,
      tradition: scriptureChunks.tradition,
      book: scriptureChunks.book,
      chapter: scriptureChunks.chapter,
      verse: scriptureChunks.verse,
      originalText: scriptureChunks.originalText,
      originalLang: scriptureChunks.originalLang,
      translation: scriptureChunks.translation,
      translationSource: scriptureChunks.translationSource,
      distance: sql<number>`${distance}`,
    })
    .from(scriptureChunks)
    .where(filters.length > 0 ? and(...filters) : undefined)
    .orderBy(distance)
    .limit(k);

  return rows.map((row) => ({
    refId: row.refId,
    tradition: row.tradition as TraditionId,
    book: row.book,
    chapter: row.chapter,
    verse: row.verse,
    reference: `${row.book} ${row.chapter}:${row.verse}`,
    originalText: row.originalText,
    originalLang: row.originalLang,
    translation: row.translation,
    translationSource: row.translationSource,
    score: 1 - Number(row.distance),
  }));
}
