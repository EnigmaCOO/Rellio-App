# Phase 6 — Dark Cosmic Theme + AI Guidance UX

**Sprint scope**: Complete the dark cosmic theme across all reading/chat/progress surfaces and improve AI guidance UX.

---

## What changed

### Dark theme completions

| Surface | Status |
|---|---|
| Dashboard (`dashboard.tsx`) | ✅ Done (Phase 5) |
| NavigationPanel dropdowns | ✅ Done (Phase 5) |
| ProgressDashboard | ✅ Done (Phase 6, T001) |
| VoiceFirstChatInterface | ✅ Done (Phase 6, T002) |

**VoiceFirstChatInterface surfaces converted:**
- Header bar + compare-mode toggle
- Active-verse panel + compare-mode results panel
- Compare-mode theme buttons (PREDEFINED_THEMES palette converted from light pastels to dark-tinted versions)
- Message bubbles (user: violet glass; AI: frosted dark)
- Text input + Send button (gold accent)
- Voice button disabled states, status labels
- Transcript display
- History panel sidebar (fixed inset, `#0f0d1e` bg)
- Error banners (red glass)
- Text-chat-mode placeholder (dark glass)

### AI response formatting (T003)

- **Perspective colors** updated from light pastel (`bg-blue-50`, `bg-green-50` …) to dark tinted (`bg-blue-950/30`, `border-blue-700/40`, `text-blue-300` …) for all five traditions plus Sikhism.
- All `perspectiveColors` entries now use `/` opacity Tailwind modifiers — safe on the dark `#0d0823` canvas.

### Save Insight flow (T004)

- **"Save insight" button** appears on hover below every AI response bubble.
- Clicking it POSTs to `POST /api/v1/notes` with the current chapter context (`religion`, `book`, `chapter`, `verse: 1`) and the first 600 chars of the AI response prefixed with `[Sage]`.
- On success: cache for `/api/v1/notes` is invalidated → insight immediately visible in **Me › Notes**.
- Button transitions to ✨ Saved state (gold) once saved.
- Guest users see a 401 toast ("Couldn't save insight") prompting sign-in.

### Analytics (T005)

**New events added to `AnalyticsEvent` union:**
- `ai_response_received` — fires on every successful AI reply
- `ai_voice_started` — placeholder for voice start tracking
- `compare_mode_opened` — placeholder
- `compare_theme_selected` — placeholder

**Events now wired:**
| Event | Trigger |
|---|---|
| `ai_question_sent` | Text submit (`handleTextSubmit`) |
| `ai_response_received` | `sendMessageMutation.onSuccess` |
| `insight_saved` | `saveInsightMutation.onSuccess` |

All events include `{ religion, book, chapter }` context properties. Events are stored to `localStorage` (key `rellio_events`, max 500 entries) via `track()` in `client/src/lib/analytics.ts`.

---

## Design tokens used

```
--app-bg / --bg-deep : #0d0823
--gold               : #D4AF37
--text-primary       : rgba(248,244,233,0.95)   (Ivory)
--text-secondary     : rgba(248,244,233,0.75)
--text-muted         : rgba(248,244,233,0.45)
--text-disabled      : rgba(248,244,233,0.25)
Violet               : #7C3AED  (user bubble accent)
Teal                 : #00D5FF  (AI accent, compare panel)
```

---

## Files touched

- `client/src/components/chat/VoiceFirstChatInterface.tsx` — T002, T003, T004, T005
- `client/src/components/progress/ProgressDashboard.tsx` — T001
- `client/src/lib/analytics.ts` — T005 (new event types)
- `client/src/index.css` — `--app-bg` CSS variable added

---

## Known limitations / next steps

- `ai_voice_started`, `compare_mode_opened`, `compare_theme_selected` events are typed but not yet wired to call sites.
- Save Insight uses `verse: 1` as a placeholder since AI chat isn't always tied to a specific verse. A future improvement could parse the cited verse from the AI response and use it as the verse coordinate.
- Analytics events are localStorage-only; a flush-to-server endpoint (`POST /api/v1/analytics`) should be added before production.
