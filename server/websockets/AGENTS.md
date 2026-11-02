# server/websockets/AGENTS.md

## Agent: WebSocket Layer (Voice Handler)
**Owns:** The `/ws/voice` pipeline for real-time voice chat between users and Rellio’s AI scholars.

---

### End Goal Contribution
This agent gives Rellio **its voice** — literally. It merges real-time input/output, making divine dialogue possible.

---

### Tasks Toward End Goal
- Implement binary streaming for user mic input.
- Stream AI TTS responses to client.
- Add ping/pong heartbeats and reconnection.
- Integrate persona context in WS sessions.
- Log latency metrics and audio quality.
