---
name: Vitest JSX / component-test config
description: Why component (.tsx) tests need extra vitest config in this repo, and how render tests are wired without testing-library.
---

# Vitest component tests

**Rule:** To run a `.tsx` test that imports a real React component, `vitest.config.ts` must set `oxc: { jsx: { runtime: 'automatic' } }` and add `tests/**/*.test.tsx` to `test.include`.

**Why:** Vitest 4 runs on rolldown-vite (vite 8) and transforms with **oxc**, which inherits `jsx: "preserve"` from the root `tsconfig.json`. With preserve, JSX is left untransformed and vite's import-analysis throws "content contains invalid JS syntax". The `@vitejs/plugin-react` (babel) plugin does NOT fix this here — oxc wins and ignores the esbuild jsx option. Setting `oxc.jsx.runtime` is what actually overrides it.

**How to apply:** Any new component/render test under `tests/`. Default test env is `node`; add `// @vitest-environment jsdom` at the top of render tests.

# Render tests without testing-library

`@testing-library/react` is NOT installed. Render tests mount with `react-dom/client` `createRoot` + `act` (from `react-dom/test-utils`), wrapped in a `QueryClientProvider`. Set `globalThis.IS_REACT_ACT_ENVIRONMENT = true`, mock `fetch` via `vi.stubGlobal`, and flush react-query with `await act(async () => { await new Promise(r => setTimeout(r, 0)); })`. `wouter`'s `useLocation` works under jsdom without a Router. Assert against `container.textContent`.
