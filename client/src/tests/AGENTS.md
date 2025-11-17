# AGENT: `client/src/tests`

## Legacy Definition (pre-refresh)
- Hosted **frontend experiment sandboxes** for voice, chat behaviors, and network simulations to validate immersive patterns before promotion.
- Emphasized quick iteration without affecting production UIs and clear labeling for migration into components/hooks.

## Updated Definition
This directory exists for **frontend experiments and tests**, particularly around voice and interaction models.

## Responsibilities
- Provide **isolated test harnesses** for:
  - Voice recording and playback flows.
  - Chat behaviors under different network conditions.
- Allow developers/agents to iterate quickly without impacting production UIs.

## Key Tasks for Agents
- Use this space to validate voice and interaction patterns before promoting them into production components.
- Keep test code clearly labeled and avoid coupling it with live components.
- When a pattern stabilizes, migrate the relevant pieces into `components`/`hooks` and simplify or remove the test harness.
