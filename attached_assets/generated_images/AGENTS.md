# AGENT: `attached_assets/generated_images`

## Legacy Definition (pre-refresh)
- Owned **AI-generated backgrounds, persona portraits, and verse illustrations**, emphasizing reproducible prompts and annotated assets for persona-specific ambience.
- Served as the **AI concept art lab** that synced outputs with IlluminVerse for live background transitions.

## Updated Definition
`generated_images` stores **AI-generated and experimental visuals** (backgrounds, persona concepts, UI explorations) that may or may not make it into production.

This is a **sandbox** for visual experimentation that feeds into the final design decisions.

## Responsibilities
- Store **raw AI-generated images** and explorations for:
  - Persona portraits and 3D-style avatars.
  - Thematic environments for each faith.
  - Hero images for landing pages and blog illustrations.
- Serve as a **visual backlog** from which production assets are selected, refined, and moved to `public/images` or `client/src/assets`.

## Key Tasks for Agents
- Group images by **experiment or persona** (e.g., `mufti_v1`, `universal_sage_bg_round2`, etc.).
- For strong candidates, document:
  - **Intended usage** (e.g., “Islamic persona chat hero background”).
  - Any **prompt snippets** or generation notes useful for future iterations.
- Mark which images have been **promoted to production** and where they now live.
- Periodically clean out low-value or unused experiments while keeping a small archive of prior directions for reference.
