# AGENT: `server`

## Legacy Definition (pre-refresh)
- Owned **backend API and realtime stack** delivering scripture queries, persona-aware AI chat, and voice services with modular services and WebSocket handlers.
- Emphasized security, moderation, performance, and observability to support immersive, low-latency experiences.

## Updated Definition
`server` contains the **backend services** powering Rellio: scripture APIs, AI integration, voice services, and moderation.

## Responsibilities
- Provide HTTP and WebSocket endpoints for:
  - Scripture queries and cross-faith retrieval.
  - AI chat (OpenAI/XAI) and persona-specific contexts.
  - Voice services (TTS/ASR) and streaming.
- Enforce security, privacy, and ethical guardrails:
  - Authentication and session handling.
  - Moderation filters and safety checks.

## Key Tasks for Agents
- Keep backend **modular**:
  - Route handlers/controllers (if present).
  - Service modules (`server/services`).
  - WebSocket handlers (`server/websockets`).
- Optimize for:
  - Low-latency AI and scripture responses.
  - Scalability necessary for Q1 2026 global launch.
- Implement logging and observability appropriate for monitoring KPIs (latency, errors).
