# client/src/AGENTS.md

## Agent: Client Source Code (React)
**Owns:** Core logic of the front-end app — routing, state management, and integration with API and WebSocket layers.

---

### End Goal Contribution
This is the **interactive soul** of Rellio.  
It translates backend intelligence into user experience — connecting scripture exploration, AI responses, and art.

---

### Tasks Toward End Goal
- Implement React Router routes: `/`, `/chat`, `/scripture`, `/profile`.
- Build the AppProvider managing theme, persona, and user session.
- Integrate TanStack Query for fetching and caching.
- Use Zustand for persistent app state.
- Connect to `/server/api/*` and `/ws/voice`.
- Configure Framer Motion animations for route transitions.
- Implement error boundaries and global toasts.
