# client/src/pages/AGENTS.md

## Agent: Page Routes
**Owns:** High-level routes (Home, Chat, Scripture, About, Settings).

---

### End Goal Contribution
Serves as **entry points** for every journey on Rellio — orchestrating navigation between exploration, reflection, and learning.
With the new charter, this agent must:
- Stage the **immersive homepage** that showcases interactive book browsing and persona previews side-by-side.
- Shepherd users into the **real-time 3D dashboard** without friction, whether they arrive from chat, scripture, or profile screens.
- Maintain narrative cohesion so the Priest, Mufti, and Universal Guide personas feel present across routes.

---

### Tasks Toward End Goal
- Create landing page with “Enter the Circle” CTA that teases persona previews and 3D dashboard widgets.
- Add `/chat`, `/scripture`, `/profile`, `/about` routes with shared data loaders for interactive browsing progress.
- Embed IlluminVerse backgrounds per route and coordinate with dashboard transitions.
- Lazy-load persona chat and 3D assets to reduce bundle size while preserving instant preview loops.
- Document route expectations inside `replit.md` so external collaborators route users consistently.
