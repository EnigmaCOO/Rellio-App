# Feature Flags & Incomplete Feature Map

This document tracks features that are partially implemented, disabled, or require fallback behavior. Update it when a feature graduates to fully shipped or is explicitly cut.

---

## Voice / TTS

| Feature | Status | Fallback |
|---|---|---|
| ElevenLabs TTS speech output | ⚠️ Requires paid tier | Text-only chat response |
| Voice interruption (barge-in) | 🟡 Partial – frontend only | N/A |
| Real-time WebSocket audio streaming | 🟡 Partial – HTTP fallback active | HTTP `/api/elevenlabs/speak` |
| Speech-to-text input | ✅ Working via Web Speech API | None (browser-only) |

**Fallback behavior**: When ElevenLabs fails (401/quota), the chat UI displays the response as text. No crash. Users are not notified of the TTS failure.

---

## 3D Persona / Scene

| Feature | Status | Fallback |
|---|---|---|
| 3D animated scholar avatar | 🔴 Not shipped – hooks wired, no 3D assets | 2D static persona card |
| Persona scene bridge | 🟡 Events emitted, no consumer | Silent no-op |

**Fallback behavior**: `PersonaSurface` renders a static portrait card. The `usePersonaSceneBridge` hook emits events that are currently unclaimed by any 3D renderer.

---

## AI Providers

| Feature | Status | Fallback |
|---|---|---|
| In-book Scholar via Gemini (Google AI Studio) | 🟡 Requires `GEMINI_API_KEY`. Model/limit set centrally via `SCHOLAR_MODEL` (default `gemini-2.5-flash`) and `SCHOLAR_MAX_TOKENS` (default 2000) in `server/config/models.ts` | **None — explicit error on failure (no silent cross-provider fallback).** Only active for the grounded in-book path; when injection is off / no passage resolves, the legacy Grok-2 → OpenAI path is used instead |
| Rolling in-book memory (last 3 verbatim turns + running summary) | ✅ Working — replaces the fixed 5-message window for the in-book Scholar; summary folded via Gemini and persisted per session | Recent turns only if summarization fails |
| `ASK_MODEL` central config | 🔴 Read into central config, not yet wired into the Ask pipeline | Ask pipeline unchanged |
| xAI / Grok responses | 🟡 Quota-limited (persona, comparison, and legacy in-book fallback paths) | Falls back to OpenAI automatically |
| OpenAI GPT-4o | ✅ Primary provider for non-Scholar chat paths | N/A |
| Multi-religious comparative AI | ✅ Working | N/A |
| In-book passage injection (real verse text in scholar prompt) | 🟡 Flagged via `IN_BOOK_PASSAGE_INJECTION` (default ON in dev, OFF in prod) | Legacy chapter-context prompt (Grok-2 → OpenAI) when off or no passage resolves |
| In-book commentary + semantic retrieval (named commentary + question-relevant passages in scholar prompt) | 🟡 Flagged via `IN_BOOK_RETRIEVAL` (default ON in dev, OFF in prod). Tunables: `IN_BOOK_RETRIEVAL_SCRIPTURE_K` (4), `IN_BOOK_RETRIEVAL_COMMENTARY_K` (6), `IN_BOOK_RETRIEVAL_CHAR_BUDGET` (6000). `commentaryAvailable` reflects what was truly retrieved, so thin/absent-commentary traditions degrade honestly | Phase-2 focusPassage-only context (no commentary, `commentaryAvailable: false`) when off, when there is no question, or on any retrieval/embedding/DB error |
| Ask page grounded retrieval (home chat answers from REAL retrieved passages via the shared prompt core; references rebuilt from the store, citations validated) | 🟡 Flagged via `ASK_GROUNDED` (default ON in dev, OFF in prod). Uses `ASK_MODEL` (Gemini). Tunables: `ASK_RETRIEVAL_SCRIPTURE_K` (6), `ASK_RETRIEVAL_COMMENTARY_K` (3), `ASK_RETRIEVAL_CHAR_BUDGET` (6000), `ASK_MAX_TOKENS` (1800). Mode is still chosen by the existing `routeResponseMode`; output is the same `StructuredChatResponse` shape and still passes the tradition-boundary validator | Legacy memory-trusting Ask builders (OpenAI gpt-4o) when off or on any grounded-path error (Gemini failure, unparseable JSON); retrieval errors degrade to an empty grounded context |
| In-book citation grounding + single regeneration retry | 🟡 Flagged via `CITATION_VALIDATION` (default ON in dev, OFF in prod). Fuzzy quote-match is a stub (refId-existence check only) | Answer returned with unverified citations flagged if regeneration still fails |
| Scholar Engine 3-layer caching (embeddings, retrieved context, full answers) | 🟡 Flagged via `ENGINE_CACHE` (default ON in dev, OFF in prod). Layers: (1) `embedText` embeddings cached permanently (corpus is static); (2) `GroundedContext` cached with TTL for both in-book (keyed tradition+book+chapter+question, conversation summary re-applied fresh on hit) and Ask (keyed mode+sources+traditions+question); (3) full in-book answers cached per (scholarId, book+chapter, normalized-question) — a hit skips both grounding and model generation. Dev bypass via `ENGINE_CACHE_BYPASS` skips reads but still writes (recompute + refresh). Tunables: `ENGINE_CACHE_CONTEXT_TTL_MS` (10min), `ENGINE_CACHE_ANSWER_TTL_MS` (30min), `ENGINE_CACHE_*_MAX_ENTRIES` | When off (or fully disabled), every request recomputes embeddings, context, and answers exactly as before — no behavior change |

---

## Scripture & Content

| Feature | Status | Fallback |
|---|---|---|
| API.Bible (Christian scriptures) | 🟡 External – may be unavailable | Local seeded fallback |
| AlQuran.cloud (Quran) | 🟡 External – may be unavailable | Local seeded fallback |
| Sefaria (Jewish texts) | 🟡 External – may be unavailable | Local seeded fallback |
| Hadith API (Bukhari/Muslim) | 🟡 External – may be unavailable | Local seeded fallback |
| Bhagavad Gita | ✅ Local JSON | N/A |
| Dhammapada (Buddhist) | ✅ Local JSON | N/A |

**Fallback behavior**: If external APIs fail, the seeding layer serves locally stored verses. Demo-critical content (Genesis 1, Al-Fatihah, John 1, Bhagavad Gita 1) is always seeded locally.

---

## Auth

| Feature | Status | Fallback |
|---|---|---|
| Guest mode | ✅ Working | N/A |
| Email OTP | 🟡 Requires SendGrid key | Auth unavailable |
| Phone OTP | 🟡 Requires Twilio keys | Auth unavailable |
| Google OAuth | 🟡 Requires Google client credentials | Auth unavailable |
| Facebook / Twitter / Instagram OAuth | 🔴 Not shipped | N/A |

---

## Progress & Gamification

| Feature | Status | Fallback |
|---|---|---|
| Reading session tracking | ⚠️ Bug – session end fails for guests | Sessions silently fail |
| Journey milestones | 🟡 Logic exists, requires auth | Silently skipped for guests |
| Streak tracking | 🟡 Partial | N/A |
| Achievements / badges | 🔴 Schema exists, UI not wired | N/A |
| Community challenges | 🔴 Not shipped | N/A |

---

## Community

| Feature | Status | Fallback |
|---|---|---|
| Community posts/feed | 🔴 Not shipped | N/A |
| User-to-user messaging | 🔴 Not shipped | N/A |

---

## Subscription / Monetization

| Feature | Status | Fallback |
|---|---|---|
| Subscription tiers | 🔴 Not shipped | All features open |
| Payment integration | 🔴 Not shipped | N/A |

---

## Legend

| Symbol | Meaning |
|---|---|
| ✅ | Fully working |
| 🟡 | Partial / degraded |
| ⚠️ | Working but fragile / known bug |
| 🔴 | Not shipped / placeholder |
