import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  TtlCache,
  hashKey,
  normalizeQuestion,
  isEngineCacheEnabled,
  isEngineCacheBypassed,
  cacheCanRead,
  cacheCanWrite,
} from "../../server/services/engineCache";

describe("normalizeQuestion", () => {
  it("trims, lowercases, and collapses whitespace", () => {
    expect(normalizeQuestion("  What  is\tMercy?\n")).toBe("what is mercy?");
  });
  it("treats case/spacing-only variants as equal", () => {
    expect(normalizeQuestion("Who is GOD")).toBe(normalizeQuestion("who   is god"));
  });
});

describe("hashKey", () => {
  it("is deterministic for the same parts", () => {
    expect(hashKey("a", "b", "c")).toBe(hashKey("a", "b", "c"));
  });
  it("is sensitive to part boundaries (no delimiter collisions)", () => {
    expect(hashKey("a", "bc")).not.toBe(hashKey("ab", "c"));
  });
});

describe("TtlCache", () => {
  it("stores and retrieves values; reports stats", () => {
    const cache = new TtlCache<number>(10, null);
    expect(cache.get("x")).toBeUndefined();
    cache.set("x", 42);
    expect(cache.get("x")).toBe(42);
    const stats = cache.stats();
    expect(stats.hits).toBe(1);
    expect(stats.misses).toBe(1);
    expect(stats.size).toBe(1);
  });

  it("expires entries after the TTL", () => {
    vi.useFakeTimers();
    try {
      const cache = new TtlCache<string>(10, 1000);
      cache.set("k", "v");
      expect(cache.get("k")).toBe("v");
      vi.advanceTimersByTime(1001);
      expect(cache.get("k")).toBeUndefined();
    } finally {
      vi.useRealTimers();
    }
  });

  it("never expires permanent (null TTL) entries", () => {
    vi.useFakeTimers();
    try {
      const cache = new TtlCache<string>(10, null);
      cache.set("k", "v");
      vi.advanceTimersByTime(10 * 60 * 60 * 1000);
      expect(cache.get("k")).toBe("v");
    } finally {
      vi.useRealTimers();
    }
  });

  it("evicts the oldest entry once over capacity", () => {
    const cache = new TtlCache<number>(2, null);
    cache.set("a", 1);
    cache.set("b", 2);
    cache.set("c", 3); // evicts "a"
    expect(cache.get("a")).toBeUndefined();
    expect(cache.get("b")).toBe(2);
    expect(cache.get("c")).toBe(3);
  });

  it("refreshes recency on re-set so a rewritten key is not the eviction victim", () => {
    const cache = new TtlCache<number>(2, null);
    cache.set("a", 1);
    cache.set("b", 2);
    cache.set("a", 11); // a is now newest
    cache.set("c", 3); // evicts "b"
    expect(cache.get("a")).toBe(11);
    expect(cache.get("b")).toBeUndefined();
    expect(cache.get("c")).toBe(3);
  });
});

describe("flag gating", () => {
  const original = { ...process.env };
  beforeEach(() => {
    delete process.env.ENGINE_CACHE;
    delete process.env.ENGINE_CACHE_BYPASS;
    delete process.env.NODE_ENV;
  });
  afterEach(() => {
    process.env = { ...original };
  });

  it("defaults ON outside production", () => {
    process.env.NODE_ENV = "development";
    expect(isEngineCacheEnabled()).toBe(true);
  });

  it("defaults OFF in production", () => {
    process.env.NODE_ENV = "production";
    expect(isEngineCacheEnabled()).toBe(false);
  });

  it("explicit ENGINE_CACHE overrides the default", () => {
    process.env.NODE_ENV = "production";
    process.env.ENGINE_CACHE = "1";
    expect(isEngineCacheEnabled()).toBe(true);
    process.env.ENGINE_CACHE = "false";
    expect(isEngineCacheEnabled()).toBe(false);
  });

  it("bypass skips reads but still allows writes (refresh-on-bypass)", () => {
    process.env.NODE_ENV = "development";
    process.env.ENGINE_CACHE_BYPASS = "1";
    expect(isEngineCacheBypassed()).toBe(true);
    expect(cacheCanRead()).toBe(false);
    expect(cacheCanWrite()).toBe(true);
  });

  it("when fully disabled, neither reads nor writes are allowed", () => {
    process.env.NODE_ENV = "production";
    expect(cacheCanRead()).toBe(false);
    expect(cacheCanWrite()).toBe(false);
  });
});
