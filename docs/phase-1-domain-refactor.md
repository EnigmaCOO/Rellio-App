# Phase 1 – Domain-First MVP Refactor

**Date**: April 2026  
**Scope**: Controlled refactor toward modular monolith with domain-first structure, shared contracts, and `/api/v1` routing

---

## Architectural Direction

The goal is a **modular monolith** — a single process, single deploy, but internally organized by product domain rather than by technical layer. All new feature work lands inside a domain folder. Legacy files are migrated incrementally, never in one large cut.

---

## What Was Created

### Domain Folder Structure

```
server/
  domains/
    auth/routes.ts          — /api/v1/auth domain router
    scriptures/routes.ts    — /api/v1/scriptures domain router  
    chat/routes.ts          — /api/v1/chat domain router
    progress/routes.ts      — /api/v1/progress domain router
  events/
    productEvents.ts        — Canonical event bus and event shapes

client/src/
  domains/                  — (empty, ready for frontend domain extraction)
  app/                      — (empty, ready for app-level layout/routing)

shared/
  contracts/
    auth.ts                 — Auth request/response DTOs
    scriptures.ts           — Scripture fetch/verse DTOs
    chat.ts                 — Chat message/request/response DTOs
    compare.ts              — Comparison request/response DTOs
    progress.ts             — Reading session/journey DTOs
    index.ts                — Re-exports all contracts
```

### `/api/v1` Route Group

Registered in `server/routes.ts` via a sub-`Router`:

```
GET    /api/v1/auth/me
GET    /api/v1/scriptures?religion=&book=&chapter=
POST   /api/v1/chat
GET    /api/v1/chat/:sessionId
GET    /api/v1/progress/journey
POST   /api/v1/progress/session/start
PATCH  /api/v1/progress/session/:sessionId/end
```

All `/api/v1` routes currently redirect to their `/api/*` equivalents. This is intentional — the namespace exists so new feature code can target `/api/v1` from day one, and legacy handlers are migrated domain-by-domain.

### Product Event System (`server/events/productEvents.ts`)

Defines typed event shapes for all core product actions:

| Event | Trigger |
|---|---|
| `reading_started` | User opens a book/chapter |
| `reading_updated` | Chapter progress updated |
| `verse_bookmarked` | User saves a verse |
| `note_created` | User writes a reflection |
| `comparison_saved` | User saves a cross-faith comparison |
| `challenge_joined` | User joins a community challenge |
| `streak_updated` | Daily streak recalculated |
| `achievement_unlocked` | Milestone reached |
| `community_post_created` | User posts in community feed |

Usage pattern:
```typescript
import { publishEvent, onEvent } from "@server/events/productEvents";

// Publish when a reading session starts
await publishEvent({
  type: "reading_started",
  payload: { userId, religion, book, chapter, sessionId, timestamp: new Date() },
});

// Subscribe in a domain handler (e.g., streak service)
onEvent("reading_started", async (event) => {
  await streakService.recordActivity(event.payload.userId);
});
```

### Shared Contracts (`shared/contracts/`)

Zod schemas for all major API boundaries. Import in both server routes and client API callers for end-to-end type safety:

```typescript
import { chatRequestDto, chatResponseDto } from "@shared/contracts";
```

---

## Migration Notes

### What Has NOT Been Moved Yet

The following are the largest files that need domain extraction in later sub-phases:

| File | Lines | Priority |
|---|---|---|
| `server/routes.ts` | ~1,600 | High — split into domain handlers |
| `client/src/components/chat/VoiceFirstChatInterface.tsx` | ~800+ | High — split voice/chat concerns |
| `server/services/externalScripture.ts` | ~650+ | Medium — move to `server/domains/scriptures/` |
| `server/services/auth.ts` | ~400+ | Medium — move to `server/domains/auth/` |

### Recommended Migration Order

1. **auth domain** — Extract `/api/auth/*` handlers into `server/domains/auth/` with proper service injection. Wire the real auth logic to `/api/v1/auth`.
2. **scriptures domain** — Move scripture fetching out of `routes.ts` into `server/domains/scriptures/service.ts`. Remove the v1 redirect shim and serve directly.
3. **chat domain** — Extract chat + persona logic into `server/domains/chat/`. Start wiring product events (`reading_started`, `note_created`).
4. **progress domain** — Move session/journey/milestone logic into `server/domains/progress/service.ts`. Wire `reading_started` and `reading_updated` events.
5. **community domain** — New domain; no legacy code to migrate. Build fresh against contracts.
6. **subscription domain** — New domain; build after community.

### Frontend Domain Structure

`client/src/domains/` is created but empty. As domain route modules stabilize, co-locate the corresponding React hooks and components:

```
client/src/domains/
  auth/         — useAuth hook, login forms
  scriptures/   — useScriptures, VerseList, NavigationPanel
  chat/         — VoiceFirstChatInterface (split), ScholarPersonas
  progress/     — ProgressDashboard, useReadingSession
  community/    — (future)
```

---

## Acceptance Criteria

| Criterion | Status |
|---|---|
| New feature work can land inside domains instead of giant files | ✅ Folder structure created |
| `/api/v1` exists and serves core MVP domains | ✅ Registered and routing |
| Event model is usable by progress/achievement/challenge flows | ✅ `publishEvent` / `onEvent` available |
| No regression in login, reading, or chat | ✅ Legacy routes untouched; v1 redirects |

---

## Next Steps (Phase 2+)

- Replace v1 redirect shims with real domain handlers
- Wire `publishEvent` calls into existing route handlers
- Extract frontend domain components
- Add integration tests per domain
- Introduce `/ws/v1/voice` WebSocket path alongside legacy `/ws/voice`
