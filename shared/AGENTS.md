# AGENT: `shared`

## Legacy Definition (pre-refresh)
- Hosted **shared schemas and domain models** ensuring client/server agreement on scripture entities, chat/voice payloads, reflections, and persona configurations.
- Focused on versioned, stable Zod definitions driving validation in handlers and forms while preparing daily-verse and comparison entities.

## Updated Definition
`shared` hosts **code and types shared between client and server**, such as schemas and domain models.

## Responsibilities
- Define **source-of-truth schemas** (e.g., via Zod) for:
  - Scripture entities.
  - Chat/voice message payloads.
  - Reflections and user-facing data structures.
- Ensure the client and server **agree on shapes and constraints**.

## Key Tasks for Agents
- Expand `schema.ts` to cover:
  - Persona configurations.
  - Daily verse and reflection structures.
  - Any cross-faith comparison entities.
- Keep schemas versioned and stable; coordinate changes with both frontend and backend.
- Use schemas to drive validation in:
  - Request handlers (server).
  - Form handling and data parsing (client).
