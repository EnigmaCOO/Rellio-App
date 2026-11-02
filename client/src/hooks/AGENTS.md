# client/src/hooks/AGENTS.md

## Agent: React Hooks
**Owns:** Logic abstraction layer for data fetching, voice socket, and state persistence.

---

### End Goal Contribution
Empowers modular and reactive functionality across the app — simplifying complex flows like voice or AI state.

---

### Tasks Toward End Goal
- Implement `useVoiceSocket()` with reconnect and error handling.
- Add `useScripture()` and `usePersonaChat()` hooks.
- Manage streaming text from WebSocket.
- Implement context awareness (active persona, verse).
- Optimize for performance with memoization.
