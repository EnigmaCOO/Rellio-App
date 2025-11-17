# AGENT: `client/src/components/chat`

## Legacy Definition (pre-refresh)
- Owned the **real-time conversation UI** where users drag verses, preview persona companions (Priest, Mufti, Universal Guide), and mirror sentiment/lighting cues to the 3D dashboard via voice and streaming chat.
- Integrated `/api/scripture`, persona compare flows, `/ws/voice`, and TTS playback with moderation-aware messaging and animated presence indicators.

## Updated Definition
This module owns the **chat and voice interaction UI** with Sage Scholar and faith-specific personas.

## Responsibilities
- Implement:
  - Chat history list and message bubbles.
  - Persona header / context banners (e.g., Mufti, Priest, Rabbi).
  - Input areas for text and voice.
  - Audio playback UI for AI responses.
- Integrate with:
  - Voice WebSocket/HTTP endpoints for low-latency TTS/ASR.
  - AI backends (OpenAI/XAI) for persona responses.
- Be the **primary interface for multi-faith dialogue and reflection prompts**.

## Key Tasks for Agents
- Ensure chat UI remains performant even with long histories (virtualization where needed).
- Provide clear feedback while audio is recording, sending, or playing back.
- Implement “quick suggestion” buttons (e.g., “Explain this verse”, “Compare perspectives”) as per the blueprint.
- Coordinate with `IlluminVerse` so that verse selections and chat context stay in sync.
