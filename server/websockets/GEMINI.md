# GEMINI Playbook — server/websockets

## Purpose
Provide Gemini with steps to build and harden WebSocket handlers for real-time voice and chat streaming.

## How to Work with Requests
1. Identify the voice/chat flows to support (audio upload, TTS streaming, context sync).
2. Define connection lifecycle rules: authentication, heartbeat, timeouts, retries.
3. Clarify payload formats, especially binary audio handling.

## Execution Steps
- Recommend handler structure with clear separation between transport handling and business logic in `server/services`.
- Outline buffering/backpressure strategies and how to surface partial results for live subtitle display.
- Specify observability hooks (connection metrics, error logging) and rate limits for protection.

## Completion Checklist
- Authenticated, resilient connection plan.
- Binary payload handling and recovery paths described.
- Monitoring and performance expectations captured.
