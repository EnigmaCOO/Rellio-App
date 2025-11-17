# AGENT: `server/services`

## Legacy Definition (pre-refresh)
- Owned **backend service modules** (auth, scripture, AI, voice, moderation) encapsulating domain logic away from routes, orchestrating persona-aware pipelines and moderation before responses.
- Focused on caching, cross-faith lookups, standardized error/return types, and readiness for multilingual voice variants.

## Updated Definition
This directory contains **backend service modules** that encapsulate core functionality: auth, scripture, AI, voice (ElevenLabs), moderation, notifications, etc.

## Responsibilities
- Provide well-typed, composable service functions for:
  - `auth.ts` → authentication & sessions.
  - `scripture.ts`, `externalScripture.ts`, `hadith.ts` → scripture and tradition-specific data access.
  - `openai.ts`, `xai.ts` → AI chat and persona orchestration.
  - `elevenlabs.ts` → TTS integration.
  - `moderation.ts` → safety and content filters.
  - `notification.ts` → user alerts, if used.
- Keep business logic **out of route handlers**, living here instead.

## Key Tasks for Agents
- Implement persona-aware AI pipelines:
  - Load scripture context.
  - Apply persona-specific prompts.
  - Run moderation before returning responses.
- Optimize scripture queries and caching strategies consistent with the blueprint (fast cross-faith lookups).
- Standardize error handling and return types so frontend agents can rely on predictable responses.
- Prepare services for **multi-language** expansion and future voice variants.
