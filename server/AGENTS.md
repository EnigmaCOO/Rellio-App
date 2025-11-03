# server/AGENTS.md

## Agent: Server (Express Backend)
**Owns:** Core backend logic — authentication, scripture APIs, persona AI, moderation, and websocket routing.

---

### End Goal Contribution
The **intelligence engine** of Rellio — turning spiritual content into responsive, AI-enhanced experiences.

---

### Tasks Toward End Goal
- Implement `/api/scripture`, `/api/persona`, `/api/explain`, `/api/compare`.
- Integrate OpenAI API and ElevenLabs TTS.
- Configure rate limiting, Helmet, and CSRF.
- Store verses, sessions, and persona data in Postgres.
- Add Redis for caching and session persistence.
- Implement structured logging (pino).
- Deploy healthcheck endpoints.
