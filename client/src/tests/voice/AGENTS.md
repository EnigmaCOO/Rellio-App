# AGENT: `client/src/tests/voice`

## Legacy Definition (pre-refresh)
- Focused on **voice-first interaction experiments**: recording, auto-send strategies, timeouts, and UI affordances while simulating poor networks and long responses.
- Served as proving ground for the voice WebSocket/HTTP stack before promoting patterns into chat and IlluminVerse components.

## Updated Definition
`voice` tests focus specifically on **voice-first interaction flows**: recording, sending, receiving, and playing back audio messages.

## Responsibilities
- Experiment with:
  - Different auto-send strategies.
  - Error handling and timeouts in voice flows.
  - UX affordances for recording (icons, states, animations).
- Validate performance and reliability of the **voice WebSocket/HTTP stack** before changes hit production.

## Key Tasks for Agents
- Build scenarios that simulate:
  - Poor network conditions.
  - Long responses.
  - Interruptions and cancellations.
- Use insights from these tests to **harden production voice components** in `client/src/components/chat` and `IlluminVerse`.
