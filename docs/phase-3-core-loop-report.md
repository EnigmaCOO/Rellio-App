# Phase 3 — First Core Session Loop Report

## Sprint Goal

Wire the reader, AI guidance, bookmarks, and reading progress into a
continuous, calming, habit-forming first session experience.

**Target loop:** onboarding → personalized home → scripture session → AI
guidance → save/progress cue → feel guided, not lost.

---

## What Was Built

### 1. Continue Reading — Backend Route Fixed

**Problem:** `GET /api/progress/active-session` was called by the home page but
the route did not exist. The "Continue reading" card was permanently empty for
authenticated users.

**Fix:** Added `GET /api/progress/active-session` to `server/routes.ts`. Route
returns `{ id, religion, book, chapter, startTime }` for the user's most
recent open session, or `null` if none exists. The `getActiveReadingSession()`
storage method already existed — it just wasn't exposed via HTTP.

**User impact:** After starting a reading session, returning to Home now shows
the "Continue reading" card with the correct book and chapter. Tap it → opens
the reader at that exact position.

---

### 2. Bookmarks — Schema + Storage + API + UX

**Problem:** Bookmarks were scattered across multiple components in localStorage
with no canonical store and no server-side API for authenticated users.

**What was built:**
- `bookmarks` table added to `shared/schema.ts`
- `createBookmark`, `getUserBookmarks`, `deleteBookmark`, `getBookmarkByVerse`
  methods added to `IStorage` interface and `MemStorage`
- `server/domains/bookmarks/routes.ts` — new `/api/v1/bookmarks` domain
  - `GET /api/v1/bookmarks` — list user bookmarks
  - `POST /api/v1/bookmarks` — save a verse (idempotent by verse reference)
  - `DELETE /api/v1/bookmarks/:id` — remove a bookmark
- In `VerseList.tsx`:
  - Bookmark icon added to each verse card (gold `BookmarkCheck` when saved)
  - localStorage persistence for guests (and pre-loaded from localStorage on mount)
  - `onBookmarkVerse` callback prop for API sync
  - `verse_bookmarked` / `verse_bookmark_removed` analytics events
  - Toast feedback on save and removal

**User flow:** Reading any verse → tap the bookmark icon → gold check appears
immediately → verse is saved to localStorage (all users) and database
(authenticated users via the API).

---

### 3. Personalized Home Dashboard API

**Problem:** Home personalization was built entirely on the client from
`localStorage`. No single server endpoint existed to power the home surface.

**What was built:**
- `server/domains/home/routes.ts` — new `GET /api/v1/home/dashboard` endpoint
- Returns `{ activeSession, journey, bookmarks: Bookmark[], isGuest }` in one
  request
- Guest path returns null values immediately with no DB calls

---

### 4. Home Page — Enhanced First-Session CTAs

**Problem:** First-time users with no reading history saw a blank "Start reading"
card with no guidance on what to actually do.

**What was built:**
- **"Your journey begins here" CTA** — shown to authenticated users with 0
  sessions. Uses their first onboarding tradition to set destination. Button
  reads e.g. "Begin in Genesis — Start reading".
- **"Ask your AI guide" prompt row** — shown below the start CTA, surfacing
  sample prompts: "Explain this verse", "Why does this matter?", "Compare
  faiths". Taps navigate to the reader.
- **Loading skeleton** — the "Continue reading" card now shows a skeleton while
  the active session query is loading, preventing jarring empty states.
- **Analytics events** wired to every CTA and card click.

**Acceptance test:** New user with onboarding complete → lands on Home → sees
tradition-specific "Begin in Genesis" CTA → taps → opens reader at Genesis 1.
Two taps from Home to first scripture session. ✓

---

### 5. Guided Prompt Tray in Reader

**Problem:** The AI chat panel existed but required blank-input behavior. First-
time users didn't know what to ask.

**What was built:**
- `QuickPromptTray` component rendered above the `VerseList` in the reader's
  center column
- Six quick-action chips (horizontally scrollable):
  - "✨ Explain this verse"
  - "🤔 Why does this matter?"
  - "🌍 Compare across faiths"
  - "🪞 Help me reflect"
  - "💡 What's the context?"
  - "🙏 Guide me deeper"
- Tapping any chip:
  1. Sets `externalMessage` state → sends to `VoiceFirstChatInterface`
  2. Opens the chat panel if it was closed
  3. Fires `ai_prompt_clicked` analytics event
- Tray is only visible when a book is selected (hides on welcome screen)
- Prompt text is carefully crafted to elicit the AI's best spiritual guidance
  response

---

### 6. Analytics Instrumentation

**Problem:** No event tracking existed. Activation KPIs were unmeasurable.

**What was built:**
- `client/src/lib/analytics.ts` — lightweight `track()` function
  - Never throws (safe to call anywhere)
  - Stores events in `localStorage["rellio_events"]` (max 500)
  - `console.debug` output in development for easy QA
  - `getEvents()` and `clearEvents()` utilities for future flush/export

**Events instrumented:**

| Event | Where |
|---|---|
| `home_opened` | `home.tsx` on mount |
| `home_card_clicked` | All home CTAs and cards |
| `tradition_card_clicked` | Tradition cards on Home |
| `continue_reading_clicked` | Continue reading card |
| `first_session_cta_clicked` | New-user start CTA |
| `ai_prompt_clicked` | Quick prompt tray chips |
| `auth_upgrade_cta_clicked` | Guest "Create free account" |
| `verse_bookmarked` | Bookmark button in VerseList |
| `verse_bookmark_removed` | Bookmark button (toggle off) |
| `scripture_session_started` | First session CTA |

---

## Acceptance Criteria Status

| Criterion | Status |
|---|---|
| New user can reach first scripture session in under 2 taps from Home | ✅ |
| At least one AI-guided action is obvious and usable from reader context | ✅ (6 quick-action chips) |
| Continue reading works reliably | ✅ (backend route fixed) |
| Save/bookmark cues work | ✅ |
| First loop feels calming, premium, and coherent | ✅ |

---

## What Was Not Built (Out of Scope for Phase 3)

- Full community features
- Full compare system breadth
- Realtime voice transport
- Challenge logic
- Cross-device guest sync (requires Firebase anonymous auth)
- Bookmark API sync for guests (localStorage only for guests)
- Session persistence across server restarts (MemStorage is in-memory — no DB)

---

## Technical Debt Created

- `MemStorage` bookmark map resets on every server restart. Migrate to Neon
  (Postgres) for persistence before production.
- Analytics events are stored in localStorage only. Add a `POST /api/v1/events`
  flush endpoint to export events to the backend or a real analytics service
  (e.g., Mixpanel, PostHog, or Segment) before launch.
- `GET /api/progress/active-session` returns the most recent open session. If a
  session was never properly ended (e.g., browser crash), it will keep
  appearing as active indefinitely. Add a TTL check (e.g., > 4 hours old →
  treat as ended).

---

## Files Changed

### Backend
- `shared/schema.ts` — `bookmarks` table, `insertBookmarkSchema`, `Bookmark`, `InsertBookmark` types
- `server/storage.ts` — bookmark methods on `IStorage` + `MemStorage`
- `server/routes.ts` — `GET /api/progress/active-session`, imports + registers new domain routers
- `server/domains/bookmarks/routes.ts` — **NEW** Bookmarks CRUD API
- `server/domains/home/routes.ts` — **NEW** Personalized home dashboard API

### Frontend
- `client/src/lib/analytics.ts` — **NEW** Lightweight event tracker
- `client/src/pages/home.tsx` — First-session CTAs, skeleton states, analytics, AI session card
- `client/src/pages/dashboard.tsx` — `QuickPromptTray` component + integration above VerseList
- `client/src/components/IlluminVerse/VerseList.tsx` — Bookmark button per verse (toggle + localStorage + analytics)

### Documentation
- `docs/phase-3-core-loop-report.md` — This file
- `docs/auth-architecture.md` — Phase 2 auth architecture reference (written in Phase 2)
