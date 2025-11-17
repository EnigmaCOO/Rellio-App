# GEMINI Playbook — client/src/lib

## Purpose
Guide Gemini responses for client-side utilities and API helpers that support scripture retrieval, persona chat, and voice workflows.

## How to Work with Requests
1. Identify which helper or API surface is involved and its consumers.
2. Ensure typings align with `shared` schemas and backend contracts.
3. Keep utilities small, testable, and reusable across pages/components.

## Execution Steps
- Propose function signatures, error handling, and data transformations.
- Describe how utilities should integrate with hooks or data-fetching layers (e.g., TanStack Query).
- Highlight performance considerations such as caching or debouncing for voice/text input flows.

## Completion Checklist
- Inputs/outputs and error behaviors defined.
- Alignment with shared types confirmed.
- Testing notes or examples provided for new helpers.
