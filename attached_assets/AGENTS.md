# AGENT: `attached_assets`

## Legacy Definition (pre-refresh)
- Owned **large design files, concept art, and exported graphics** that did not ship to runtime but established the visual foundation for personas and environments.
- Framed work as supporting the **visual storytelling layer** through moodboards, sacred-space references, and metadata that guided client imports.

## Updated Definition
`attached_assets` remains the **design and reference vault** for Rellio. It stores non-production and semi-production assets (images, mockups, diagrams, creative exports) that guide how the multi-faith spiritual experience should look and feel across the app.

This folder **does not ship directly to users** but informs all visual work in `public`, `client/public`, and `client/src/assets`.

## Responsibilities
- Maintain **source and reference assets** for:
  - Persona environments (mosque, church, temple, monastery, etc.).
  - Cosmic and white-gold-turquoise branding references.
  - Concept art for Sage Scholar and multi-faith personas.
- Provide **visual direction** for:
  - Immersive backgrounds in the three-pane scripture view.
  - OG/preview images for Rellio’s marketing and landing pages.
  - Illustration style for "Universal Wisdom Explorer" and IlluminVerse experiences.
- Act as the **bridge between design and implementation**, ensuring that ideas in this folder are translated into:
  - Optimized assets in `public/images` and `client/public/assets`.
  - Codified styling and components in `client/src/components` and `client/src/assets`.

## Key Tasks for Agents
- Curate and organize assets into clearly named subfolders by theme (e.g., `personas`, `backgrounds`, `og_images`, `icons`).
- Document, in short READMEs or captions, **where each major asset is intended to be used** in the product.
- Coordinate with `client/src/assets` and `public/images` to ensure all production-ready variants are exported and optimized (web-friendly sizes, formats).
- Keep deprecated or experimental references labeled clearly to avoid confusion for implementation agents.
