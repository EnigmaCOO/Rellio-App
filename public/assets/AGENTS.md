# AGENT: `public/assets`

## Legacy Definition (pre-refresh)
- Held **general-purpose static assets** for marketing, embeds, or legacy tooling, acting as a bridge while structured storage matured.
- Emphasized duplication audits against `public/images` and cleanup of unused files.

## Updated Definition
This directory holds general-purpose **static assets** served from the root `public` space.

## Responsibilities
- Provide URLs for images or assets that may be used by:
  - Marketing pages.
  - Embeds or iframes.
  - Legacy or external tooling.

## Key Tasks for Agents
- Audit and minimize duplication with `public/images`.
- Confirm all assets here are actually used; remove or archive cruft.
- Prefer future, structured asset organization in `public/images` where possible.
