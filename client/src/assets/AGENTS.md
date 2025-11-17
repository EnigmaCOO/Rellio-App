# AGENT: `client/src/assets`

## Legacy Definition (pre-refresh)
- Owned **inline-imported visuals for UI elements and quick-loading backgrounds**, bundling SVG/PNG assets to improve initial render experiences and shimmer placeholders.
- Coordinated with `/public/assets` for fallback loading while keeping assets typed and organized.

## Updated Definition
`client/src/assets` holds **imported frontend assets**: images, icons, sound snippets, and other media used by React components.

## Responsibilities
- Provide **versioned, importable assets** for:
  - Persona backgrounds and overlays.
  - Logos, icons, and badges (e.g., streaks, progress indicators).
  - Small audio cues or UI sounds, if applicable.
- Keep asset usage **discoverable and typed** where possible (e.g., export maps).

## Key Tasks for Agents
- Organize assets by usage (`personas`, `backgrounds`, `branding`, `icons`).
- Ensure any image or media here:
  - Is optimized for the web.
  - Has a clear consumer component (no orphaned files).
- Work with `attached_assets` to bring selected concept art into production form.
