# client/src/AGENTS.md

## Agent: Client Source Code (React)
**Owns:** Core logic of the front-end app — routing, state management, and integration with API and WebSocket layers.

---

### End Goal Contribution
This is the **interactive soul** of Rellio.
It translates backend intelligence into user experience — connecting scripture exploration, AI responses, IlluminVerse art, and now the charter’s spotlight moments:
- **Interactive Book Browsing** flows that feel like turning illuminated manuscripts with instant persona insights.
- **Persona Preview pipelines** that stage the Priest, Mufti, and Universal Guide in both 2D UI and 3D-ready states.
- A **real-time 3D dashboard** state machine that synchronizes chat, progress, and ambient layers.

---

### Tasks Toward End Goal
- Implement React Router routes: `/`, `/chat`, `/scripture`, `/profile` with hooks for persona preview summons.
- Build the AppProvider managing theme, persona, dashboard scenes, and user session.
- Integrate TanStack Query for fetching and caching.
- Use Zustand for persistent app state, including 3D dashboard context.
- Connect to `/server/api/*` and `/ws/voice`.
- Configure Framer Motion animations for route transitions and 3D dashboard reveal sequences.
- Implement error boundaries and global toasts that reference the active persona preview where relevant.
- Ensure contributor onboarding scripts (`replit.md`, GitHub templates) echo these objectives before coding starts.
