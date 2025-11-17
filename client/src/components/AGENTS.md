# AGENT: `client/src/components`

## Legacy Definition (pre-refresh)
- Owned the **interactive building blocks** that manifested persona teasers, immersive browsing widgets, and 3D-dashboard-ready HUD panels using shadcn/ui and Radix primitives.
- Emphasized motion, responsiveness, and persona-specific avatars/voice indicators tied to the interactive browsing, persona preview, and 3D dashboard trio.

## Updated Definition
This directory contains **React components** that assemble the Rellio user experience: scripture viewing, AI chat, persona selection, progress, and UI primitives.

## Responsibilities
- Implement **reusable, composable UI** for:
  - The three-pane experience (nav, verse card, AI panel).
  - Persona-specific experiences and environments.
  - Progress tracking and profile views.
- Provide the building blocks for:
  - Daily reflection flows.
  - Voice-enabled chat UI.
  - Cross-faith comparison views.

## Key Tasks for Agents
- Keep components **focused and declarative**, with heavy logic pushed into hooks/lib where possible.
- Maintain a clear division:
  - Feature modules (e.g., `IlluminVerse`, `chat`, `auth`, `profile`, `progress`).
  - UI primitives (`ui`).
- Ensure all components:
  - Are responsive (mobile → desktop).
  - Respect the brand system (colors, type, spacing).
  - Are accessible (ARIA, keyboard navigation, proper semantics).
