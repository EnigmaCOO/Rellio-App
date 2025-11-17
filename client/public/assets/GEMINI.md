# GEMINI Playbook — client/public/assets

## Purpose
Guide Gemini outputs for production-ready static assets shipped with the client (images, audio, fonts) that directly support the user experience.

## How to Work with Requests
1. Identify the asset type and intended in-app usage (backgrounds, persona art, icons, audio snippets).
2. Ensure assets are optimized for delivery (web-friendly formats, appropriate sizes, cache considerations).
3. Confirm naming and folder structure align with branding and ease of import in the React app.

## Execution Steps
- Recommend compression/resizing steps and any alt text or metadata needed for accessibility or SEO.
- Suggest how to reference the asset from components or pages, noting paths used by Vite.
- Flag duplication with `/public/images` or `attached_assets` and advise on consolidation if needed.

## Completion Checklist
- Optimized asset ready for shipping.
- Import/reference guidance provided.
- Redundancies or promotions from design vaults resolved.
