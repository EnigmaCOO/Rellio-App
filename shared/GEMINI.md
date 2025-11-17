# GEMINI Playbook — shared

## Purpose
Equip Gemini to maintain shared schemas and types that align the client and server around scripture, chat/voice payloads, reflections, and personas.

## How to Work with Requests
1. Identify the domain being modeled (scripture, chat message, voice packet, persona config, reflection/daily verse).
2. Ensure compatibility with both backend services and frontend consumers.
3. Consider versioning and validation impacts when changing schemas.

## Execution Steps
- Propose Zod (or equivalent) schema updates with clear field definitions and defaults.
- Outline how to propagate type changes to consuming modules and handle migrations if needed.
- Recommend validation and parsing patterns for requests/responses on both sides.

## Completion Checklist
- Schema fields and constraints defined with rationale.
- Cross-system impact and migration notes provided.
- Validation and typing usage documented for client and server.
