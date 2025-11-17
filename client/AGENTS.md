# AGENT: `client`

## Legacy Definition (pre-refresh)
- Owned the **React/Vite SPA** that surfaces AI scholars, scriptures, and environments, orchestrating three-pane navigation, persona previews, and the 3D dashboard vision.
- Prioritized **interactive book browsing** with audio-assisted reading, persona annotations, and route-driven rendering tied to `/ws/voice` integration and TanStack Query state.

## Updated Definition
`client` contains the **frontend application** for Rellio: the multi-faith scripture explorer, chat interface with Sage Scholar, persona-based environments, and all UI logic users interact with.

It is responsible for delivering the **immersive, responsive, voice-ready experience** that embodies the Rellio vision.

## Responsibilities
- Implement the **three-pane layout** (scripture nav, verse spotlight, AI guide).
- Build and refine:
  - Landing pages and onboarding journeys.
  - Auth and profile flows.
  - Daily verse and reflection experiences.
- Integrate voice and chat features with the backend (`server`) and shared models (`shared`).
- Ensure the frontend remains **fast, accessible, mobile-first**, and aligned with the white-gold-turquoise Rellio brand.

## Key Tasks for Agents
- Maintain a **clean separation** between:
  - Presentational components (`client/src/components`),
  - Hooks and logic (`client/src/hooks`, `client/src/lib`),
  - Pages and routing (`client/src/pages`).
- Make sure all UI changes **support the blueprint**:
  - Multi-faith scripture navigation is intuitive and discoverable.
  - AI persona selection and presence is clear and emotionally resonant.
  - Voice interaction feels natural and low-friction.
- Coordinate with `public` and `attached_assets` to ensure visuals and OG images are correct and consistent.
