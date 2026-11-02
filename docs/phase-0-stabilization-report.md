# Phase 0 – Stabilization Report

**Date**: April 2026  
**Scope**: Rellio MVP Stabilization Pass — reliability hardening before fast iteration begins

---

## What Was Fixed

### 1. Environment Validation (`server/env.ts`)
Created a centralized `validateEnv()` module called at the very top of `server/index.ts` (before any service boots). Required vars (`DATABASE_URL`, `OPENAI_API_KEY`) throw immediately if missing. Optional vars (`ELEVENLABS_API_KEY`, `XAI_API_KEY`, `TWILIO_*`, `GOOGLE_CLIENT_*`, `SENDGRID_API_KEY`) emit `console.warn` so degraded features are visible without crashing.

### 2. ElevenLabs Deprecated Model
Updated `server/services/elevenlabs.ts` from `eleven_monolingual_v1` (removed from free tier) to `eleven_multilingual_v2`. This resolves the recurring `401 subscription_required / model_deprecated_free_tier` errors seen in production logs.

### 3. Session End Bug (`PATCH /api/progress/session/:sessionId/end`)
The `updateReadingSessionSchema` requires `sessionId: z.number()` in the request body, but the route extracts sessionId from the URL path param — so the body never provided it. Fixed with `.omit({ sessionId: true }).parse(req.body)` + explicit `isNaN` guard on the parsed path param. Eliminates the recurring `ZodError: sessionId – Required` 400s.

### 4. WebSocket URL — No `undefined` Host
`client/src/lib/voice-ws.ts` was already present and correct (derives URL from `window.location.host`, falls back to `localhost:5000` if host is invalid). All voice components now use `resolveVoiceWsUrl()` instead of inline construction. No further changes needed.

### 5. Vite HMR vs App WebSocket
`client/src/components/chat/VoiceErrorBoundary.tsx` was already filtering Vite HMR errors. Voice WebSocket is mounted at `/ws/voice` on the same HTTP server as the app, which Vite's dev proxy correctly forwards. No conflict found requiring changes.

### 6. Deep Links: Landing Page → Dashboard
Added URL search-param parsing to `DashboardContent` (runs once on mount). Params `religion`, `book`, `chapter` from landing-page CTAs are now applied on dashboard load. A `pendingDeepLink` ref defers book/chapter selection until the religion's book list loads from the API, so the full selection is reliable even on first load. The redundant "reset chapter on book change" effect was removed (handlers already reset it).

### 7. Scripture Seeding
`scripts/seed-scriptures.ts` and `npm run db:seed` were already present. The external scripture layer already falls back to local JSON when external APIs are unreachable. Demo-critical content (Al-Fatihah, Genesis, Bhagavad Gita 1) is locally seeded. No new changes were required beyond documenting the behavior.

### 8. Scripts — All Working
All scripts in `package.json` were already functional:
- `npm run lint` — ESLint across `client/src`, `server`, `shared`
- `npm run typecheck` — `tsc --noEmit`  
- `npm run test` — `vitest run`  
- `npm run db:seed` — `tsx scripts/seed-scriptures.ts`

---

## What Remains Fragile

| Area | Risk | Notes |
|---|---|---|
| ElevenLabs TTS | Voice fails for free-tier accounts | Fixed model, but paid tier is still required for any TTS |
| Guest reading sessions | Session end returns 401 | Sessions only tracked for authenticated users; guests get silent no-op |
| External scripture APIs | Rate-limited, may return 429/503 | Fallback exists but coverage is partial for some books |
| Google/Twilio/SendGrid auth | Unconfigured in dev | Auth flows other than Guest/Email depend on env vars |
| xAI / Grok quota | Hits limits quickly | Falls back to OpenAI automatically, but Grok personas are non-functional |
| 3D persona scene | Hooks wired, no 3D assets | `usePersonaSceneBridge` events are emitted but unclaimed |
| `voiceHandler` unused var | ESLint warning | Side-effect-only instantiation; prefix with `_` or restructure to suppress |

---

## What Should Be Tackled Next (Phase 1 Preview)

1. **Move domain logic out of the 1,600-line `routes.ts`** — domain route modules created under `server/domains/*`
2. **Wire `/api/v1`** — registered and routing; absorb legacy handlers incrementally
3. **Shared contracts** — Zod DTOs in `shared/contracts/*` for auth, scriptures, chat, compare, progress
4. **Product events** — `server/events/productEvents.ts` defines all event shapes and an in-process event bus
5. **Community and subscription** — not started; schema exists but no UI or routes
6. **Strict TypeScript** — 1,339 ESLint warnings; no errors. Safe to address incrementally

---

## Acceptance Criteria Check

| Criterion | Status |
|---|---|
| App boots reliably on Replit | ✅ |
| No WebSocket URL shows `undefined` | ✅ (was already fixed, validated) |
| Deep links from landing page select the intended experience | ✅ Fixed |
| Seeded scripture fallback works for demo-critical content | ✅ Already in place |
| Basic lint/typecheck/test scripts run without placeholder echos | ✅ Already working |
