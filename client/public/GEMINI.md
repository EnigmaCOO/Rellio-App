# GEMINI Playbook — client/public

## Purpose
Direct Gemini responses for managing static assets bundled with the client build (favicons, manifest, OG images, audio, etc.).

## How to Work with Requests
1. Determine which static asset or metadata file is being added or updated.
2. Ensure filenames and paths align with Vite expectations and the Netlify deployment target.
3. Keep branding, accessibility, and performance (optimized formats/sizes) in mind.

## Execution Steps
- Recommend placement under `client/public` vs `client/public/assets` based on scope and reuse.
- Suggest optimization steps (compression, responsive sizes) and any manifest/meta updates required.
- Note how changes will surface in the app (e.g., favicon, OpenGraph card, audio sample).

## Completion Checklist
- Asset location and naming confirmed.
- Optimization guidance documented.
- Any required config/meta updates are called out.
