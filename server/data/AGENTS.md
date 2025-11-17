# AGENT: `server/data`

## Legacy Definition (pre-refresh)
- Held **canonical scripture data** (e.g., Bhagavad Gita JSON) loaded by services for verse retrieval and cross-faith alignment, optimized for book/chapter/verse queries.
- Coordinated with shared schemas for type parity and documentation ahead of adding more texts and mapping data.

## Updated Definition
`server/data` holds **static or semi-static data sources** used by the backend—currently including scripture JSON (e.g., Bhagavad Gita).

## Responsibilities
- Store canonical JSON or structured data representations of scriptures or segments thereof that are:
  - Loaded by `server/services/scripture.ts` or related modules.
  - Used as the basis for verse retrieval and cross-faith alignment.

## Key Tasks for Agents
- Ensure data structures are:
  - Efficient for query patterns (by book/chapter/verse).
  - Well-documented (schema, expected fields).
- Coordinate with `shared/schema.ts` so that **type definitions match** backend data.
- Prepare for adding other texts and cross-faith mapping data.
