# AGENT: `client/public`

## Legacy Definition (pre-refresh)
- Owned **static public files** (icons, manifests, logos) that set the cross-device visual identity, including PWA install assets and brand meta tags.
- Focused on keeping Tailwind colors, favicons, and touch icons synchronized for consistent presentation across browsers and mobile.

## Updated Definition
`client/public` holds **static assets** that are bundled with the frontend: icons, OG images, favicons, manifest files, and any assets needed by the client build directly.

This directory directly influences **SEO, link previews, and first impressions** of Rellio.

## Responsibilities
- Host:
  - Favicons, app icons, and manifest metadata.
  - Open Graph images for landing pages and profiles.
  - Static brand assets shared across the app.
- Ensure that assets here are **optimized and production-ready**, not raw design files.
- Act as a bridge between **design source** (`attached_assets`) and the **compiled app** (Vite / deployment).

## Key Tasks for Agents
- Maintain up-to-date OG and preview images that reflect the **Rellio spiritual intelligence brand**.
- Ensure filenames and paths match those referenced in HTML templates and Vite config.
- Coordinate with marketing and landing page updates to keep preview assets aligned with the latest product narrative.
