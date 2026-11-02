---
name: Scholar Engine caching
description: Design constraints for the 3-layer ENGINE_CACHE (embeddings, context, answers) so future edits don't reintroduce stale/degraded-answer hazards.
---

# Scholar Engine caching (ENGINE_CACHE)

Three in-memory layers behind `ENGINE_CACHE` (default ON dev, OFF prod), with a dev
`ENGINE_CACHE_BYPASS` that **skips reads but still writes** (recompute + refresh).
`cacheCanRead()` = enabled && !bypassed; `cacheCanWrite()` = enabled.

## Layer 3 (full answers) — the dangerous one
The in-book answer cache must only ever memoize the **grounded** path, never the legacy
Grok-2 → OpenAI fallback.
- Gate the cache key itself on `isInBookPassageInjectionEnabled()` (plus religion+book) so
  reads/writes never happen when legacy is the expected path.
- Gate the *write* additionally on `grounding` being truthy.

**Why:** a transient grounding failure falls through to the legacy fallback; if that output
were cached it would be served (skipping grounding+generation) until TTL, pinning a degraded
answer. Caught in code review the first time this was wired.

**How to apply:** if you touch the in-book branch in `server/routes.ts`, keep both gates. If
you ever want to cache legacy answers too, give them a *different* key discriminator so the
two modes can't contaminate each other.

## Conversation-independence is intentional
The Layer 3 key is `(scholarId, book+chapter, normalizedQuestion)` — deliberately NOT keyed on
conversation history, so a repeated identical question on the same passage reuses the answer.
That is the acceptance criterion, not a bug. The in-book Layer 2 context cache likewise stores a
summary-free base context and re-applies the live `conversationSummary` on hit.
