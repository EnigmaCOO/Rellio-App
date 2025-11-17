# AGENT: `client/src/pages`

## Legacy Definition (pre-refresh)
- Owned **route-level composition** for landing, auth, dashboard, and legal pages, showcasing interactive browsing, persona previews, and 3D dashboard entry points.
- Managed global layout/providers and guided flows from landing to onboarding to scripture reading and AI chat with a voice-first emphasis.

## Updated Definition
This directory defines **route-level pages** for the Rellio app (landing, dashboard, auth, legal pages, etc.).

## Responsibilities
- Compose feature components into full pages:
  - Landing experiences (`landing.tsx`, `landing-luxury.tsx`).
  - Auth (`auth.tsx`).
  - Dashboard and profile (`dashboard.tsx`, `profile.tsx`).
  - Legal pages (`privacy.tsx`, `terms.tsx`).
- Manage **top-level layout**, including navigation bars, footers, and global providers.

## Key Tasks for Agents
- Ensure the **primary landing experience** clearly communicates:
  - Rellio’s multi-faith, AI-guided vision.
  - The voice-first and scripture-first nature of the platform.
- Implement seamless flows:
  - From landing → onboarding → first scripture reading → first AI conversation.
- Keep routing lightweight and fast, with proper 404 handling (`not-found.tsx`).
