# Phase 7 — Path · Ascend · Quest Lite · Me Redesign

## Overview

Phase 7 gives users a clear sense of ongoing spiritual progress without building heavy social systems. The Me screen is rebuilt from a simple saved-items list into a full spiritual dashboard that surfaces real data from the user's reading history.

## Product Goal

Give users a strong personal home base and a light but meaningful sense of continuity and progress.

---

## What Was Built

### 1. Me / Profile Redesign (`client/src/pages/me.tsx`)

The Me page is rebuilt around eight clear sections:

| Section | What it shows |
|---|---|
| **User Header** | Avatar (initials or photo), display name, email, member-since date, streak badge |
| **Progress Stats** | Four stat chips: streak days, total sessions, total reading time, traditions explored |
| **Continue Reading** | CTA card for the most recent reading session with time-ago label |
| **Recent Activity** | Timeline of the last 5 reading sessions (book, chapter, tradition, date, duration) |
| **Routine Builder** | Four time-slot toggles (Morning / Midday / Evening / Flexible) — stored in localStorage |
| **Achievements** | Six derivation-based badges unlocked from real data (see Ascend Lite) |
| **Challenges** | Three curated challenges with progress bars derived from live data (see Quest Lite) |
| **Saved Library** | Tabs: Bookmarks · Notes · Highlights · Comparisons |

Guest users see only the sign-in upsell banner and the Routine Builder + Saved Library (bookmarks only).

---

### 2. Path Lite (profile landing + progress)

- User header pulls `firstName`, `lastName`, `email`, `username`, `profileImageUrl` from `AuthContext`.
- Journey stats (`currentStreak`, `longestStreak`, `totalReadingSessions`, `totalTimeMinutes`, `favoriteReligion`, `startDate`) come from `GET /api/progress/journey`.
- Traditions explored is derived at render time from the reading-sessions list (`GET /api/progress/sessions`).
- Recent activity timeline uses the same sessions endpoint (last 5 entries).

---

### 3. Routine Builder

A lightweight daily reading routine picker. Four slots:

- **Morning** — 6–9 am
- **Midday** — 11 am – 1 pm
- **Evening** — 7–9 pm
- **Flexible** — Anytime

State is stored in `localStorage` under the key `rellio_routine`. No database round-trip is required. Each toggle fires a `routine_slot_toggled` analytics event.

---

### 4. Ascend Lite — Achievements

Six achievements derived from real user behaviour, checked at render time. No fake counters.

| Achievement | Unlock condition |
|---|---|
| First Light ✨ | `totalReadingSessions >= 1` |
| Seeker 🔍 | `totalReadingSessions >= 5` |
| Steadfast 🔥 | `currentStreak >= 3` OR `longestStreak >= 3` |
| Archivist 📚 | `bookmarks.length >= 3` |
| Reflective Mind ✍️ | `notes.length >= 1` |
| Cross-Tradition Scholar ⚖️ | `savedComparisons.length >= 1` |

Locked achievements are greyed out and show a lock icon. Unlocked achievements display their emoji and glow in their accent colour. A `achievement_unlocked` analytics event is available for future server-side unlocks.

---

### 5. Quest Lite — Challenges

Three curated challenges, each with a progress bar derived from live API data.

| Challenge | Tracks | Goal |
|---|---|---|
| 7-Day Journey 🔥 | `currentStreak` from journey API | 7 days |
| Tradition Explorer 📖 | Unique traditions in reading sessions | 3 traditions |
| Deep Reflection ⭐ | `notes.length` | 5 notes |

Join state is stored in `localStorage` under `rellio_challenges` (array of joined challenge IDs). Progress is re-derived on every render so it never goes stale. Joining fires a `challenge_joined` analytics event.

---

### 6. Library Continuity

The Saved Library tab bar now includes four tabs:

- **Bookmarks** — `GET /api/v1/bookmarks` (or localStorage for guests)
- **Notes** — `GET /api/v1/notes`
- **Highlights** — `GET /api/v1/highlights`
- **Comparisons** — `GET /api/v1/comparisons` (Phase 6)

Delete mutations use the correct `apiRequest(url, { method: "DELETE" })` signature and invalidate their respective query keys.

---

### 7. Analytics Events Added

| Event | When |
|---|---|
| `routine_slot_toggled` | User toggles a time slot in the routine builder |
| `challenge_joined` | User taps "Join" on a challenge |
| `achievement_unlocked` | Available for future server-side unlock moments |
| `me_tab_changed` | User switches tabs in the Saved Library |
| `saved_item_opened` | Available for future tap-to-open flows |

---

## Technical Notes

- **Event derivation is stable and idempotent**: achievements and challenge progress are computed from cumulative counts, not from transient events. Refreshing the page never resets them.
- **Streak logic**: `currentStreak` is owned by the backend (`/api/progress/journey`) and updated by the reading session lifecycle. The Me page only reads it.
- **No hardcoded counters**: every stat shown comes from a real API or localStorage entry that tracks real user actions.
- **Routine/challenge state in localStorage** keeps the implementation lightweight. Migrating to a backend table is a straightforward future step when reminders or server-side challenge validation are needed.

---

## APIs Consumed

| Endpoint | Purpose |
|---|---|
| `GET /api/progress/journey` | Streak, sessions, time, start date |
| `GET /api/progress/sessions` | Recent reading history, traditions explored |
| `GET /api/v1/bookmarks` | Saved passages count + list |
| `GET /api/v1/notes` | Personal notes count + list |
| `GET /api/v1/highlights` | Highlights count + list |
| `GET /api/v1/comparisons` | Saved comparisons count + list |

---

## Acceptance Criteria

- [x] Profile reflects real data (streak, sessions, time from journey API)
- [x] Me clearly helps users continue where they left off (Continue Reading card)
- [x] Achievements unlock from real actions (derivation logic, no fake counters)
- [x] Challenge progress updates consistently (derived from live API data on each render)
- [x] Streak logic is coherent across surfaces (single source of truth: `/api/progress/journey`)
