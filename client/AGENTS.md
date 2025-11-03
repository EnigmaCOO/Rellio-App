# client/AGENTS.md

## Agent: Client (React + Vite)
**Owns:** The main Single Page Application (SPA) where users interact with Rellio’s AI scholars, scriptures, and visual environments.

---

### End Goal Contribution
The **Client Agent** is Rellio’s window to the world — transforming backend intelligence and sacred texts into a *living, breathing interface* that feels intuitive and divine.
It now anchors the refreshed product charter by choreographing:
- **Interactive Book Browsing** with tactile verse navigation, persona annotations, and audio-assisted reading.
- **Persona Preview loops** that spotlight the Priest, Mufti, and Universal Guide before the user enters a dialogue.
- The **real-time 3D dashboard** that unites IlluminVerse ambience, progress telemetry, and live persona presence.

---

### Tasks Toward End Goal
- Architect the **three-pane layout** (Scripture Navigation | Verse Card | AI Chat Guide) so browsing feels cinematic yet focused.
- Implement **dynamic route-based rendering** (e.g., `/faith/:id`, `/verse/:id`) that can surface persona previews inline.
- Integrate **TanStack Query** for API caching and state management.
- Add **voice control hooks** and connect to `/ws/voice`.
- Build global theme system (Faith-based color palette + 3D dashboard handoffs).
- Connect the client with `/server` REST endpoints for scripture, personas, and moderation.
- Optimize lazy loading and hydration for fast load times across immersive and 3D views.
- Integrate PWA capabilities for offline access and push notifications.
- Keep `replit.md` & automation prompts synced with these objectives whenever onboarding new collaborators.
