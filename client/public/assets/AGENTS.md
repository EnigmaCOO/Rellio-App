# AGENT: `client/public/assets`

## Legacy Definition (pre-refresh)
- Owned **application-facing media** (persona portraits, environmental art, scripture icons) imported from `attached_assets`, organized by category and compressed for performance.
- Included JSON context about asset meaning and client fallbacks to preserve brand emotion.

## Updated Definition
This directory contains **static assets** directly referenced by the frontend but not managed via module imports (e.g., legacy images, static illustrations, audio samples).

## Responsibilities
- Store images and static content that must be available by URL (e.g., `/assets/...`).
- Serve as a **bridge area** during migration from older asset patterns to more structured locations like `public/images` and `client/src/assets`.

## Key Tasks for Agents
- Audit which assets are still actively used; deprecate or move legacy ones to archive if unused.
- Prefer future assets to live in **`public/images` or `client/src/assets`** for clarity and maintainability.
- Keep this directory small and intentional; avoid turning it into a catch-all dump.
