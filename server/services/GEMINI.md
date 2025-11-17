# GEMINI Playbook — server/services

## Purpose
Guide Gemini outputs to design composable service modules for auth, scripture retrieval, AI persona orchestration, voice, moderation, and notifications.

## How to Work with Requests
1. Determine which domain service is impacted (auth, scripture, AI, voice, moderation, notification).
2. Clarify input/output shapes and align them with shared schemas.
3. Ensure business logic stays inside services, not route handlers.

## Execution Steps
- Propose function signatures and typing, including error handling and standardized return formats.
- Describe persona-aware pipelines: load scripture context, apply persona prompts, run moderation, then return responses.
- Highlight caching or performance optimizations for cross-faith lookups and voice flows.
- Note readiness for multilingual and voice variants where relevant.

## Completion Checklist
- Service responsibilities and dependencies are explicit.
- Data contracts align with `shared` schemas.
- Safety, localization, and performance considerations are documented.
