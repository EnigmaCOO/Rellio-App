# Agent Guardrails — Scholar Engine Work

These guardrails apply to **every** task in the Scholar Engine effort.

1. Do ONLY what the current task says. Do not refactor, rename, reformat, or "improve"
   anything outside the task's stated scope.
2. Never delete a working code path. Gate new behavior behind a feature flag and leave
   the old path intact and reachable.
3. Integrate with existing files; do not greenfield parallel versions of things that exist.
   If unsure where something lives, do the discovery step and ASK before writing code.
4. One phase = one PR = one commit. Stop and report when the task's "Done when" is met.
5. Do not change the model, add a database, or touch the Ask pipeline unless the task
   explicitly says to.
6. If a task is ambiguous or would require touching files it didn't name, STOP and ask.
