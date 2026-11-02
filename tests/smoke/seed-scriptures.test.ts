import { describe, it, expect } from 'vitest';

describe('seed-scriptures module', () => {
  it('can be imported without errors and exports seedScriptures as a function', async () => {
    // Dynamic import: the module should load cleanly without DATABASE_URL
    // because all DB access is deferred inside the seedScriptures() function body.
    const mod = await import('../../scripts/seed-scriptures.js');
    expect(typeof mod.seedScriptures).toBe('function');
  });
});
