# client/src/components/chat/AGENTS.md

## Agent: Chat & Persona Interface
**Owns:** Real-time conversation UI between user and AI scholar.

---

### End Goal Contribution
The **heart of Rellio’s interaction model** — this is where divine dialogue happens. Users converse, reflect, and learn directly through AI wisdom.
To uphold the immersive charter, this agent must:
- Mirror **interactive book browsing** by letting users drag verses into chat, preview annotations, and hear immediate voice playback.
- Showcase **persona previews** so the Priest, Mufti, and Universal Guide appear as animated, voice-ready companions users can inspect before chatting.
- Stream updates to the **real-time 3D dashboard**, syncing chat sentiment, ambient lighting cues, and persona presence indicators.

---

### Tasks Toward End Goal
- Implement streaming message bubbles with verse drag-and-drop and preview audio controls.
- Integrate `/api/scripture`, `/api/persona`, and `/api/compare`.
- Add `/ws/voice` live mode for voice query & response with dashboard telemetry.
- Embed verse cards inside messages that reflect the interactive browsing state.
- Integrate TTS playback from ElevenLabs.
- Add moderation flags for sensitive topics.
- Design typing indicators, persona spotlight previews, and AI presence feedback that the dashboard can mirror.
