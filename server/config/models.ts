/**
 * Central model configuration — the single source of truth for which models the
 * in-book Scholar (and, later, the Ask pipeline) use.
 *
 * Values are read from the environment at call time so the model can be swapped
 * by changing an env var and restarting — no code edits required.
 *
 * - SCHOLAR_MODEL      — Gemini model id used by the in-book Scholar.
 * - ASK_MODEL          — read here for completeness, but NOT yet consumed by the
 *                        Ask pipeline (Ask is intentionally untouched this phase).
 * - SCHOLAR_MAX_TOKENS — answer length ceiling for the in-book Scholar (default 2000).
 */

const DEFAULT_SCHOLAR_MODEL = "gemini-2.5-flash";
const DEFAULT_ASK_MODEL = "gemini-2.5-flash";
const DEFAULT_SCHOLAR_MAX_TOKENS = 2000;
const DEFAULT_EMBEDDING_MODEL = "gemini-embedding-001";

/**
 * Fixed embedding dimension for the scripture vector store. Pinned here, in the
 * `scripture_chunks` table (shared/schema.ts), and at table-creation time
 * (scripts/setup-pgvector.ts). All three must agree. The default model
 * (gemini-embedding-001) natively outputs 3072 dims but is reduced to this size
 * via the `dimensions` request parameter. Changing this requires a re-ingest.
 */
export const EMBEDDING_DIMENSIONS = 768;

/** Gemini model id for the in-book Scholar. */
export function getScholarModel(): string {
  const raw = process.env.SCHOLAR_MODEL?.trim();
  return raw && raw.length > 0 ? raw : DEFAULT_SCHOLAR_MODEL;
}

/**
 * Model id intended for the Ask pipeline. Read into the central config now so
 * there is one place to configure it, but NOT wired into Ask behavior yet.
 */
export function getAskModel(): string {
  const raw = process.env.ASK_MODEL?.trim();
  return raw && raw.length > 0 ? raw : DEFAULT_ASK_MODEL;
}

/** Answer length ceiling (max output tokens) for the in-book Scholar. */
export function getScholarMaxTokens(): number {
  const raw = process.env.SCHOLAR_MAX_TOKENS;
  const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_SCHOLAR_MAX_TOKENS;
}

/**
 * Embedding model id used to build the scripture vector store. Defaults to
 * Gemini gemini-embedding-001 (served via GEMINI_API_KEY), reduced to
 * EMBEDDING_DIMENSIONS via the `dimensions` request parameter. Must produce
 * vectors of EMBEDDING_DIMENSIONS length; changing the model means re-ingesting.
 */
export function getEmbeddingModel(): string {
  const raw = process.env.EMBEDDING_MODEL?.trim();
  return raw && raw.length > 0 ? raw : DEFAULT_EMBEDDING_MODEL;
}
