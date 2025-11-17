# GEMINI Playbook — server/data

## Purpose
Instruct Gemini on maintaining static and semi-static backend data sources such as scripture JSON used for verse retrieval.

## How to Work with Requests
1. Confirm which scripture set or data file is involved and how it is queried (book/chapter/verse).
2. Align data structures with expectations in `server/services` and `shared` schemas.
3. Consider documentation needs for schemas and fields.

## Execution Steps
- Propose formats and indexing that keep lookups fast for common patterns.
- Recommend validation or linting checks to ensure data consistency before loading.
- Note any cross-faith mapping requirements or preparation for additional texts.

## Completion Checklist
- Data layout supports efficient queries.
- Schema notes match shared definitions.
- Any new datasets include documentation of fields and provenance.
