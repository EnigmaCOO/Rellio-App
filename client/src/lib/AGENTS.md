# AGENT: `client/src/lib`

## Legacy Definition (pre-refresh)
- Owned **client utilities and setup** (Query client, HTTP helpers, formatting) bridging components with `/api` and `/ws/voice`, ensuring typed, centralized data access for scripture, persona, and comparison flows.
- Standardized error/loading handling and prepared search, daily-verse, and persona suggestion helpers.

## Updated Definition
`lib` hosts **client-side utilities and setup code**, such as TanStack Query clients and shared helpers.

## Responsibilities
- Configure and export shared utilities:
  - Query client.
  - HTTP/API helpers.
  - Generic utility functions (e.g., formatting, parsing).
- Serve as a thin layer between React components and backend endpoints.

## Key Tasks for Agents
- Ensure API helpers are **typed and centralized**, rather than scattering `fetch` logic in components.
- Standardize error handling and loading states via shared utilities.
- Prepare library functions for:
  - Scripture search and filtering.
  - Daily-verse retrieval.
  - Persona suggestion / quick action calls.
