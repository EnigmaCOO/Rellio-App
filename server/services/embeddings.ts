import OpenAI from "openai";
import { getEmbeddingModel, EMBEDDING_DIMENSIONS } from "../config/models";
import { cacheCanRead, cacheCanWrite, embeddingCache, hashKey } from "./engineCache";

/**
 * Central client wrapper for scripture embeddings (Scholar Engine vector store).
 *
 * Embeddings are produced by Gemini (Google AI Studio) via the configured
 * EMBEDDING_MODEL (default gemini-embedding-001, reduced to EMBEDDING_DIMENSIONS
 * via the `dimensions` request parameter). Gemini exposes an OpenAI-compatible
 * endpoint, so we reuse the existing `openai` SDK pointed at the Gemini base URL
 * — matching how the in-book Scholar (scholarModel.ts) is wired.
 *
 * On any failure this throws an EXPLICIT error. There is deliberately NO
 * cross-provider fallback: a failure must surface, not silently degrade.
 *
 * Not wired into any runtime pipeline — used by the ingestion script
 * (scripts/ingest-scriptures.ts) and the retrieval helper (lib/retrieval).
 */

const GEMINI_OPENAI_BASE_URL =
  "https://generativelanguage.googleapis.com/v1beta/openai/";

let cachedClient: OpenAI | null = null;

function getGeminiClient(): OpenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Embeddings are not configured: GEMINI_API_KEY is missing. " +
        "Set the Gemini API key to enable scripture embeddings (EMBEDDING_MODEL).",
    );
  }
  if (!cachedClient) {
    cachedClient = new OpenAI({ apiKey, baseURL: GEMINI_OPENAI_BASE_URL });
  }
  return cachedClient;
}

/**
 * Embed a batch of texts in a single API call. Returns one vector per input, in
 * the same order. Throws an explicit error on failure or dimension mismatch.
 */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const model = getEmbeddingModel();

  let response;
  try {
    response = await getGeminiClient().embeddings.create({
      model,
      input: texts,
      dimensions: EMBEDDING_DIMENSIONS,
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new Error(`Embedding (Gemini ${model}) failed: ${detail}`);
  }

  if (!response.data || response.data.length !== texts.length) {
    throw new Error(
      `Embedding (Gemini ${model}) returned ${response.data?.length ?? 0} vectors ` +
        `for ${texts.length} inputs.`,
    );
  }

  // The OpenAI-compatible response is not guaranteed to be index-ordered.
  const ordered = [...response.data].sort((a, b) => a.index - b.index);
  return ordered.map((item) => {
    const vector = item.embedding as number[];
    if (!Array.isArray(vector) || vector.length !== EMBEDDING_DIMENSIONS) {
      throw new Error(
        `Embedding (Gemini ${model}) returned a vector of length ` +
          `${vector?.length ?? 0}, expected ${EMBEDDING_DIMENSIONS}.`,
      );
    }
    return vector;
  });
}

/**
 * Embed a single text. Throws an explicit error on failure.
 *
 * Layer 1 cache (ENGINE_CACHE): the same text always embeds to the same vector
 * (the corpus is static), so results are cached permanently. This is the hot
 * path for query embeddings — a repeated identical question reuses its vector
 * instead of re-calling the embedding provider.
 */
export async function embedText(text: string): Promise<number[]> {
  const key = hashKey("embed", getEmbeddingModel(), String(EMBEDDING_DIMENSIONS), text);

  if (cacheCanRead()) {
    const hit = embeddingCache.get(key);
    if (hit) {
      console.log("🧠 embedding cache HIT");
      return hit;
    }
  }

  const [vector] = await embedBatch([text]);
  if (!vector) {
    throw new Error("Embedding returned no vector for the provided text.");
  }

  if (cacheCanWrite()) embeddingCache.set(key, vector);
  return vector;
}
