# GEMINI Playbook — client/src/tests/voice

## Purpose
Provide Gemini with a focused guide for testing voice and WebSocket experiences in the client.

## How to Work with Requests
1. Determine the voice feature under test (recording, streaming responses, subtitles, reconnection).
2. Identify mocks/stubs needed for audio APIs, WebSockets, and TTS/STT services.
3. Emphasize timing, buffering, and error scenarios.

## Execution Steps
- Outline test cases covering connection lifecycle, backpressure, and UI reactions to streaming data.
- Recommend utilities or helpers to simulate binary payloads and latency.
- Specify assertions for accessibility cues (live region updates, recording indicators).

## Completion Checklist
- Voice/WebSocket scenarios enumerated with mocks.
- Timing and failure modes accounted for.
- Accessibility and user-feedback checks included.
