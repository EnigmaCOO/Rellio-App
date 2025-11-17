# GEMINI Playbook — server

## Purpose
Equip Gemini with guidance to deliver backend updates that power scripture APIs, persona-aware AI chat, and voice services securely and efficiently.

## How to Work with Requests
1. Identify which endpoints or services are affected (HTTP routes, WebSockets, auth, moderation).
2. Outline the needed data flows for scripture retrieval, AI orchestration, or voice streaming.
3. Emphasize security, latency, and observability expectations for every change.

## Execution Steps
- Recommend modular placement: route/controller layers delegate to `server/services` and voice logic to `server/websockets`.
- Specify typing, validation, and error-handling patterns to keep responses predictable for the frontend.
- Call out performance optimizations (caching, batching, streaming) and logging hooks that align with KPI tracking.

## Completion Checklist
- Clear plan for endpoints and services touched.
- Safety and auth considerations documented.
- Suggested tests or telemetry to verify latency and stability.
