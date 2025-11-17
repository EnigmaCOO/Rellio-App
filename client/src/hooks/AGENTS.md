# AGENT: `client/src/hooks`

## Legacy Definition (pre-refresh)
- Owned **reusable logic** for voice state, auto-send timing, scripture sessions, auth, and toasts, keeping components lean while syncing with `/ws/voice` and persona context.
- Prioritized composable, tested hooks that bridge chat, IlluminVerse ambience, and reflection management.

## Updated Definition
`hooks` contains reusable React hooks that encapsulate **client-side logic and state** for the app.

## Responsibilities
- Encapsulate complex logic for:
  - Voice state and auto-send behavior.
  - Reading sessions and auto-reading.
  - Authentication state.
  - Toasts/notifications.
- Keep components lean by moving behavior into well-typed hooks.

## Key Tasks for Agents
- Ensure hooks are **composable, documented, and tested**.
- Stabilize voice-related hooks so that:
  - Auto-send timing is reliable.
  - Errors are gracefully handled and surfaced to users.
- Build hooks for:
  - Reflection management (create, edit, list).
  - Persona context handling (current persona, environment, settings).
