# Phase 3 — Core Session Loop + Home Redesign

**Sprint date:** April 2026  
**Status:** Complete

---

## Objective

Make the first core user session feel smooth, premium, calming, and habit-forming.

A new user completing onboarding should be able to:
1. Land on a **personalized Home** that clearly answers "what should I do next?"
2. **Open a scripture session** in ≤ 2 taps
3. Access **AI guidance** without any friction
4. **Save or continue** something meaningful
5. Leave feeling **guided rather than lost**

---

## What was built

### 1. Personalized Home (redesigned)

**File:** `client/src/pages/home.tsx`

Completely rebuilt using Phase 4 design system primitives.

**Layout hierarchy:**
1. Greeting header — personalized name + active intention from onboarding
2. **Hero slot** — context-adaptive (3 modes):
   - _Active session_: Gold "Continue reading" card with book/chapter, single `PrimaryButton`
   - _First session_: Violet "Begin your journey" card with tradition entry point, single `PrimaryButton`
   - _Returning / no active session_: Teal "Open your library" card
3. **AI prompt chip rail** — horizontal scroll row of 6 quick-action chips
4. **Traditions rail** — horizontal `RailCard` scroll based on onboarding selections
5. **Daily reflection** — `QuoteCard` with tradition-matched scripture (Cormorant Garamond serif)
6. **Progress stats** — 3-tile grid (Time / Streak / Sessions) if data exists
7. **Challenge card** — `ChallengeCard` with progress bar
8. **Saved items shortcut** — bookmarks quick-link
9. **Guest upsell** — violet glass card, subtle, bottom of page only

### 2. Continue Reading logic

- `GET /api/progress/active-session` surfaces the user's open reading session
- On tap → navigates directly to `/read?religion=&book=&chapter=` restoring exact context
- While loading: skeleton shimmer card (no blank state)
- Session is tracked via `POST /api/readings` on the reader side

### 3. Recommended entry points

- Tradition rail items are derived from `onboarding.traditions` (localStorage / DB)
- Fallback: all 5 traditions if no preferences are set
- "Browse all" rail card always appears last
- Weekly reflection quote is topic-matched from `onboarding.topics`

### 4. First AI guidance moment

Prominently placed above-the-fold as a horizontal chip rail:

| Chip | Intent |
|------|--------|
| ✨ Explain this verse | Contextual clarification |
| 🤔 Why does this matter? | Relevance + application |
| 🪞 Help me reflect | Inward contemplation |
| 🌍 Compare faiths | Cross-tradition lens |
| 💡 What's the context? | Historical + cultural background |
| 🙏 Guide me deeper | Extended spiritual direction |

Tapping any chip: fires `ai_prompt_clicked` analytics event → navigates to reader.  
Inside the reader, these chips activate the `QuickPromptTray` which routes to `VoiceFirstChatInterface`.

### 5. High-intent persistence cues

- Per-verse bookmark icon (gold `BookmarkCheck` when saved) in `VerseList.tsx`
- "Saved verses & insights" quick-link on Home → profile bookmarks page
- `ChallengeCard` progress bar as a visual streak cue
- `StatTile` grid for sessions, streak, time (returned users)

### 6. Analytics events

All canonical events are wired in `client/src/lib/analytics.ts`:

| Event | Trigger |
|-------|---------|
| `home_opened` | On mount |
| `home_card_clicked` | Any card/button tap, with `card` context |
| `continue_reading_clicked` | Hero "Continue" button |
| `scripture_session_started` | Any navigation to reader |
| `ai_prompt_clicked` | Any chip tap |
| `tradition_card_clicked` | Tradition rail card |
| `first_session_cta_clicked` | Hero first-session button |
| `auth_upgrade_cta_clicked` | Guest upsell button |
| `verse_bookmarked` | Bookmark icon in reader (VerseList) |
| `verse_bookmark_removed` | Bookmark icon remove |

Events are stored in `localStorage["rellio_events"]` (max 500), never throw, use `console.debug` in dev.

---

## Acceptance criteria — all passed

| Criterion | Status |
|-----------|--------|
| New user reaches first scripture session in ≤ 2 taps from Home | ✅ Home → tap Hero CTA → reader |
| Home clearly answers "what should I do next?" | ✅ Adaptive hero + AI chips |
| Continue reading works reliably | ✅ Active session API + deep-link |
| At least one AI-guided action obvious from reading context | ✅ QuickPromptTray chips in reader |
| First loop feels calm, premium, and coherent | ✅ Violet cosmic system, glass cards, serif text |

---

## Design system components used

All from `client/src/components/rellio/index.tsx`:

- `Card` (variant: default / gold / violet) — stats, fallback reading, challenge
- `QuoteCard` — daily reflection with gold left-border accent + Cormorant Garamond
- `ChallengeCard` — weekly challenge with progress bar
- `RailCard` + `HorizontalRail` — traditions scroll
- `PrimaryButton` — hero CTAs
- `SecondaryButton` — journey start fallback
- `Chip` — AI prompt chips
- `Divider` — section separators

Loading states from `client/src/components/StateViews.tsx`:
- `SkeletonBox` — hero skeleton while active session loads

---

## Technical notes

- Guest mode: all content works from `loadOnboardingProfile()` (localStorage). No API calls gated by auth leak info.
- Guest upsell card is shown only at bottom of page — non-intrusive.
- The home dashboard endpoint `/api/v1/home/dashboard` exists for future aggregation (returns `{ activeSession, journey, bookmarks, isGuest }`). The current home page makes individual queries to maintain cache granularity.
- Sessions use `MemStorage` — resets on server restart. Migrate to Neon before production.

---

## Files changed

| File | Change |
|------|--------|
| `client/src/pages/home.tsx` | Full rebuild with design system primitives |
| `client/src/components/rellio/index.tsx` | Phase 4 — primitives library (prior sprint) |
| `client/src/components/StateViews.tsx` | Phase 4 — skeleton/empty/error states (prior sprint) |
| `client/src/index.css` | Phase 4 — design tokens (prior sprint) |

---

## What was intentionally NOT built

- Full community system
- Full compare feature (breadth)
- Real-time voice chat
- Full challenge system with DB persistence
- Notification system

These are deferred to Phase 5+.
