# Phase 4 — ReadOn Retention Layer

**Sprint**: ReadOn Retention Layer + Premium Reader Redesign  
**Status**: Complete  
**Date**: April 2026

---

## Overview

Phase 4 adds a full per-verse retention layer — highlights, notes, bookmarks — with both authenticated (API-backed) and guest (localStorage) flows, a contextual `VerseActionTray` directly in the reader, and a dedicated **Me page** saved-content hub.

---

## What was built

### 1. Schema additions (`shared/schema.ts`)

| Table | Columns |
|---|---|
| `verseHighlights` | id, userId, religion, book, chapter, verse, color (`gold`/`violet`/`teal`), createdAt |
| `verseNotes` | id, userId, religion, book, chapter, verse, text, verseText?, createdAt, updatedAt |

Both tables have Zod insert schemas (`insertHighlightSchema`, `insertVerseNoteSchema`) and TypeScript select types.

### 2. Storage layer (`server/storage.ts`)

Added to `IStorage` interface and `MemStorage`:

**Highlights**: `createHighlight`, `getUserHighlights`, `getChapterHighlights`, `getHighlightByVerse`, `updateHighlight`, `deleteHighlight`

**Notes**: `createNote`, `getUserNotes`, `getChapterNotes`, `getNoteByVerse`, `updateNote`, `deleteNote`

### 3. API routes

| Route file | Mount |
|---|---|
| `server/domains/highlights/routes.ts` | `GET/POST /api/v1/highlights`, `GET /api/v1/highlights/chapter`, `DELETE /api/v1/highlights/:id` |
| `server/domains/notes/routes.ts` | `GET/POST /api/v1/notes`, `GET /api/v1/notes/chapter`, `DELETE /api/v1/notes/:id` |

Both registered in `server/routes.ts` alongside bookmarks.

### 4. Client hooks

| Hook | Purpose |
|---|---|
| `useReaderSettings.ts` | Font size / line height / theme — instant localStorage sync |
| `useReadingPosition.ts` | Persist/load/clear last read chapter, localStorage |
| `useVerseActions.ts` | Open/close state for `VerseActionTray` per verse |

### 5. VerseActionTray (`client/src/components/VerseActionTray.tsx`)

Contextual per-verse floating tray (opens above the verse card when ••• is tapped). Actions:

- **Save** — bookmarks via API (auth) or localStorage (guest); toggle with visual check
- **Highlight** — gold / violet / teal inline colour picker; API or local state
- **Note** — inline textarea, saves to API (auth) or discarded after close (guest)
- **Ask Sage** — forwards verse text to AI chat
- **Share** — Web Share API, falls back to clipboard copy

Guest users can save bookmarks locally; all other retention features prompt sign-in. Integrated into `VerseList.tsx`, replacing individual Bookmark/Copy icon buttons with a single ••• `MoreHorizontal` icon.

### 6. Me page (`client/src/pages/me.tsx`)

New **saved content hub** at `/me`, wired to AppShell bottom nav "Me" tab.

- **Tabs**: Saved · Notes · Highlights
- **Guest support**: bookmarks tab reads localStorage; Notes/Highlights show sign-in prompt
- **Guest upsell banner**: "Sign in to sync your saves" → `/auth`
- Authenticated tabs query `/api/v1/bookmarks`, `/api/v1/notes`, `/api/v1/highlights`
- Delete actions per item (with `queryClient.invalidateQueries`)

### 7. QuickPromptTray dark theme (`client/src/pages/dashboard.tsx`)

Updated from warm amber (`bg-amber-50`, `border-amber-200`) to dark violet cosmic palette:
- Background: `rgba(13,8,35,0.85)` with glass blur
- Border: `rgba(124,58,237,0.20)` violet
- Chips: violet tint background + `rgba(167,139,250,0.90)` text

### 8. AppShell routing

- "Me" tab in bottom nav now routes to `/me` (was `/profile`)
- `/profile` still accessible directly for account settings
- `/me` guarded by `OnboardingGuard`

---

## Design tokens used

| Token | Value |
|---|---|
| `--app-bg` | `#0d0823` |
| `--gold` | `#D4AF37` |
| Violet | `#7C3AED` |
| Teal | `#00D5FF` |
| `--text-muted` | CSS var set in index.css |

---

## Architecture notes

- All new routes follow the domain pattern: `server/domains/<domain>/routes.ts`
- MemStorage resets on restart — production should use Neon (PostgreSQL)
- Guest highlight state is component-local (not persisted); sign-in prompt encouraged for cross-device retention
