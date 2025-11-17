# GEMINI Playbook — client/src/hooks

## Purpose
Guide Gemini outputs for reusable hooks that encapsulate data fetching, state, and side effects (including voice and WebSocket logic).

## How to Work with Requests
1. Determine the domain of the hook (voice socket, scripture data, persona selection, auth/session, UI state).
2. Align inputs/outputs with shared schemas and backend contracts.
3. Emphasize testability and composability for component consumers.

## Execution Steps
- Propose hook signatures, return values, and error/loading semantics.
- Describe integration with TanStack Query or state stores where appropriate.
- Include guidance for cleanup, reconnection, and performance considerations for real-time features.

## Completion Checklist
- Hook responsibilities and dependencies defined.
- Typing, error, and lifecycle behaviors documented.
- Usage examples or notes provided for consuming components.
