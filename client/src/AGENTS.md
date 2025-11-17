# AGENT: `client/src`

## Legacy Definition (pre-refresh)
- Owned the **core React app logic** (routing, state, WebSockets) translating backend intelligence into interactive scripture browsing, persona previews, and the 3D dashboard state machine.
- Emphasized **Interactive Book Browsing**, persona staging (Priest, Mufti, Universal Guide), and Framer Motion-driven transitions aligned with `/ws/voice` and API hooks.

## Updated Definition
`client/src` contains the **TypeScript/React source code** for the Rellio frontend. It is where the multi-faith scripture experience, persona-based chat, and voice interactions are actually implemented.

## Responsibilities
- Own the **core React app structure**, including:
  - Layout and routing (`pages`).
  - Components (UI, chat, scripture viewer, profiles).
  - Hooks and utilities for state and data.
- Integrate with backend APIs for:
  - Scripture retrieval.
  - AI chat and persona logic.
  - Voice processing endpoints.
- Ensure the UX expresses the **vision of immersive, reverent, multi-faith exploration**.

## Key Tasks for Agents
- Maintain clear layering:
  - `components` → presentation & interactivity.
  - `hooks` → reusable logic.
  - `lib` → client utilities and API helpers.
  - `pages` → route-level composition.
- Keep code **typed, accessible, and testable**.
- Drive the roadmap items:
  - Daily Verse + Reflection flows.
  - Persona selection & environment switching.
  - Smooth voice-first chat with fallback to text.
