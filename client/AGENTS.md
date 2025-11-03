# client/AGENTS.md

## Agent: Client (React + Vite)
**Owns:** The main Single Page Application (SPA) where users interact with Rellio’s AI scholars, scriptures, and visual environments.

---

### End Goal Contribution
The **Client Agent** is Rellio’s window to the world — transforming backend intelligence and sacred texts into a *living, breathing interface* that feels intuitive and divine.  
It merges scripture, AI, and visual art into a unified spiritual experience.

---

### Tasks Toward End Goal
- Architect the **three-pane layout** (Scripture Navigation | Verse Card | AI Chat Guide).
- Implement **dynamic route-based rendering** (e.g., `/faith/:id`, `/verse/:id`).
- Integrate **TanStack Query** for API caching and state management.
- Add **voice control hooks** and connect to `/ws/voice`.
- Build global theme system (Faith-based color palette).
- Connect the client with `/server` REST endpoints for scripture, personas, and moderation.
- Optimize lazy loading and hydration for fast load times.
- Integrate PWA capabilities for offline access and push notifications.
