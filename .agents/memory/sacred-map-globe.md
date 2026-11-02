---
name: react-globe.gl / three / WebGL constraints
description: Version + environment gotchas when adding react-globe.gl (3D globe) to this app.
---

# react-globe.gl + three + WebGL

## Version coupling
react-globe.gl → globe.gl → three-globe. Recent three-globe (>=2.42) unconditionally
imports `three/webgpu` and `three/tsl`. Those subpath exports only exist in three r167+.
If `three` is pinned older (this repo was on 0.165), vite dep pre-bundle fails with
`Missing "./webgpu" / "./tsl" specifier in "three" package` and the app won't boot.

**Fix:** keep three aligned with what the installed three-globe targets (its devDep).
Before bumping three, grep for active `three` / `@react-three` imports — if the only
consumers are deprecated/disabled stubs, the upgrade is safe.

**Why:** prefer upgrading the shared dep over fragile transitive pinning of three-globe
(it's a grandchild via globe.gl, hard to control).

## WebGL is not available in the headless sandbox
The screenshot/`app_preview` tool's browser cannot create a WebGL context
(`THREE.WebGLRenderer: A WebGL context could not be created`). This is the same reason
Persona3DViewport was deprecated. An uncaught WebGL error white-screens the whole React
tree.

**How to apply:** any WebGL/3D component must (1) feature-detect WebGL up front and
(2) be wrapped in an error boundary, rendering a graceful fallback instead of crashing.
The real globe still renders fine in a user's normal browser tab — only the in-tool
screenshot can't show it. Don't interpret a blank screenshot as "the globe is broken."

## Harmless noise
"THREE.WARNING: Multiple instances of Three.js being imported." appears via the
react-globe.gl bundle; it's a warning, not a failure, and vite.config.ts is off-limits
to dedupe.
