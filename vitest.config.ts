import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  // The root tsconfig sets `jsx: "preserve"`, which the test transformer would
  // otherwise inherit and leave JSX untransformed. Force the automatic runtime
  // so component (.tsx) tests can import and render React components.
  oxc: { jsx: { runtime: 'automatic' } },
  test: {
    // Default environment is Node — voice-ws tests override with @vitest-environment jsdom
    environment: 'node',
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
  },
  resolve: {
    alias: {
      '@': path.resolve(process.cwd(), './client/src'),
      '@shared': path.resolve(process.cwd(), './shared'),
    },
  },
});
