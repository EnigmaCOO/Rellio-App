# AGENT: `server/websockets`

## Legacy Definition (pre-refresh)
- Owned **WebSocket handlers** for voice/real-time layers, streaming audio both ways, syncing conversational context, and managing lifecycles/heartbeats.
- Focused on graceful disconnect handling, binary payload efficiency, and coordination with ElevenLabs/AI services under proper auth and rate limits.

## Updated Definition
This directory defines **WebSocket handlers**, notably for the voice/real-time interaction layer.

## Responsibilities
- Implement low-latency, robust WebSocket endpoints for:
  - Streaming audio from clients.
  - Streaming TTS responses back to clients.
  - Keeping conversational context synchronized with voice flows.
- Manage connection lifecycles and heartbeats.

## Key Tasks for Agents
- Harden the voice WebSocket implementation:
  - Handle disconnects, timeouts, and retries gracefully.
  - Support binary audio payloads efficiently.
- Coordinate with `server/services/elevenlabs.ts` and AI services to deliver near real-time experiences.
- Enforce auth and rate limiting where appropriate to protect infrastructure.
