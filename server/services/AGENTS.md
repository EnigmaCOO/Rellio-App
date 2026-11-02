# server/services/AGENTS.md

## Agent: Server Services
**Owns:** Business logic for AI, scripture retrieval, authentication, moderation, and TTS.

---

### End Goal Contribution
Connects all backend intelligence — forming the “Sage Scholar Engine” that powers persona responses.

---

### Tasks Toward End Goal
- Create `xai.ts` persona engine with prompt templates.
- Build scripture parser and comparator.
- Implement content moderation using OpenAI API.
- Develop ElevenLabs TTS wrapper for streaming.
- Add caching for repeat AI requests.
- Handle all errors with structured retry and circuit breakers.
