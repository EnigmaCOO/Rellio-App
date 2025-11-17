# AGENT: `client/src/components/IlluminVerse`

## Legacy Definition (pre-refresh)
- Owned the **ambient visual layer**: dynamic persona/faith backgrounds, gradients, and 3D-ready particle scenes powering immersive browsing, persona previews, and the real-time dashboard.
- Connected theme state, verse meaning, and voice cues to animated ambience while honoring reduced-motion preferences and mobile GPU limits.

## Updated Definition
`IlluminVerse` houses components for the **core scripture exploration experience** — the heart of Rellio’s “read, reflect, and compare” flow.

## Responsibilities
- Implement:
  - Multi-faith scripture list and verse navigation.
  - Verse spotlight / verse card.
  - Auto-reading controls and ElevenLabs-based audio playback.
  - Cross-scripture comparison views.
- Provide the core UI where:
  - Users select chapters/verses.
  - Compare teachings across faiths in a respectful way.
  - Trigger AI-guided explanations of the verse.

## Key Tasks for Agents
- Ensure scripture loading is **fast and robust**, integrating properly with backend scripture APIs.
- Implement intuitive **Compare Grid / cross-faith views** while respecting theological nuance and avoiding false equivalence.
- Build hooks into reflection logging and “save verse” actions, so this area connects tightly with the community/reflection roadmap.
- Integrate voice playback smoothly with the chat and reading sessions (e.g., start/stop/resume reading).
