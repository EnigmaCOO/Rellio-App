import { createHash } from "crypto";

/**
 * Scholar Engine cache — a small, dependency-free in-process cache used by the
 * three Scholar Engine caching layers:
 *
 *   1. Embeddings      — permanent (the scripture corpus is static, so the same
 *                        text always embeds to the same vector).
 *   2. Retrieved context (GroundedContext) — TTL'd per
 *                        (tradition, refId-range / scope, question-hash).
 *   3. Full answers    — TTL'd per (scholarId, passage, normalized-question).
 *
 * All caching is gated behind the ENGINE_CACHE flag (default ON in development,
 * OFF in production). A dev cache-bypass flag (ENGINE_CACHE_BYPASS) forces reads
 * to miss so a developer always gets a freshly computed result; writes still
 * refresh the entry so the cache is repopulated.
 *
 * This module is deliberately dependency-light (only Node's crypto) so it can be
 * imported from the embedding wrapper, which is also pulled in by the offline
 * ingestion script.
 */

/**
 * Feature flag for all Scholar Engine caching.
 * Default ON in development; OFF in production unless explicitly enabled.
 * Set ENGINE_CACHE to "true"/"1" or "false"/"0" to override.
 */
export function isEngineCacheEnabled(): boolean {
  const raw = process.env.ENGINE_CACHE;
  if (raw === undefined || raw === "") {
    return process.env.NODE_ENV !== "production";
  }
  return raw === "true" || raw === "1";
}

/**
 * Dev cache-bypass. When set (ENGINE_CACHE_BYPASS=true/1), cache reads are
 * skipped so every request recomputes from source — useful for debugging or
 * forcing fresh results. Writes still happen so the cache stays warm/refreshed.
 */
export function isEngineCacheBypassed(): boolean {
  const raw = process.env.ENGINE_CACHE_BYPASS;
  return raw === "true" || raw === "1";
}

/** True when a cached value may be served (cache on AND not bypassed). */
export function cacheCanRead(): boolean {
  return isEngineCacheEnabled() && !isEngineCacheBypassed();
}

/** True when a computed value may be stored (cache on; writes refresh on bypass). */
export function cacheCanWrite(): boolean {
  return isEngineCacheEnabled();
}

function envPositiveInt(name: string, fallback: number): number {
  const raw = process.env[name];
  const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

interface CacheEntry<V> {
  value: V;
  /** Absolute expiry (ms epoch), or null for a permanent entry. */
  expiresAt: number | null;
}

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
}

/**
 * A tiny TTL cache with insertion-order ("oldest first") eviction once it
 * exceeds `maxEntries`. Not an LRU — kept intentionally simple; the Scholar
 * Engine working set is small and bounded by the max-entries cap.
 */
export class TtlCache<V> {
  private readonly store = new Map<string, CacheEntry<V>>();
  private hits = 0;
  private misses = 0;

  constructor(
    private readonly maxEntries: number,
    /** Default TTL in ms for set() calls; null = permanent. */
    private readonly defaultTtlMs: number | null,
  ) {}

  get(key: string): V | undefined {
    const entry = this.store.get(key);
    if (!entry) {
      this.misses += 1;
      return undefined;
    }
    if (entry.expiresAt !== null && entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      this.misses += 1;
      return undefined;
    }
    this.hits += 1;
    return entry.value;
  }

  set(key: string, value: V, ttlMs?: number | null): void {
    const ttl = ttlMs === undefined ? this.defaultTtlMs : ttlMs;
    const expiresAt = ttl === null ? null : Date.now() + ttl;
    // Re-insert at the end so eviction order reflects recency of writes.
    this.store.delete(key);
    this.store.set(key, { value, expiresAt });
    if (this.store.size > this.maxEntries) {
      const oldest = this.store.keys().next().value;
      if (oldest !== undefined) this.store.delete(oldest);
    }
  }

  clear(): void {
    this.store.clear();
    this.hits = 0;
    this.misses = 0;
  }

  stats(): CacheStats {
    return { hits: this.hits, misses: this.misses, size: this.store.size };
  }
}

/** Stable cache key from parts. Long inputs are hashed to keep keys bounded. */
export function hashKey(...parts: string[]): string {
  return createHash("sha1").update(parts.join("\u0000")).digest("hex");
}

/** Normalize a free-text question so trivially-different phrasings share a key. */
export function normalizeQuestion(question: string): string {
  return question.trim().toLowerCase().replace(/\s+/g, " ");
}

// Layer 1: embeddings — permanent (corpus/text is static).
export const embeddingCache = new TtlCache<number[]>(
  envPositiveInt("ENGINE_CACHE_EMBED_MAX_ENTRIES", 5000),
  null,
);

// Layer 2: retrieved GroundedContext — TTL'd (retrieval results can change as the
// store grows). Default 10 minutes.
export const contextCache = new TtlCache<unknown>(
  envPositiveInt("ENGINE_CACHE_CONTEXT_MAX_ENTRIES", 1000),
  envPositiveInt("ENGINE_CACHE_CONTEXT_TTL_MS", 10 * 60 * 1000),
);

// Layer 3: full answers — TTL'd. Default 30 minutes.
export const answerCache = new TtlCache<string>(
  envPositiveInt("ENGINE_CACHE_ANSWER_MAX_ENTRIES", 1000),
  envPositiveInt("ENGINE_CACHE_ANSWER_TTL_MS", 30 * 60 * 1000),
);
