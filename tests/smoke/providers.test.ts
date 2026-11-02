import { describe, it, expect, beforeEach } from 'vitest';

describe('provider factory', () => {
  beforeEach(() => {
    // Ensure XAI key is absent so we can test the fallback path
    delete process.env.XAI_API_KEY;
  });

  it('returns an OpenAI provider (name==="openai") when XAI_API_KEY is absent and preferred=xai', async () => {
    // Dynamic import so the module picks up the env changes above
    const { getChatProvider } = await import('../../server/integrations/providers.js');
    const provider = await getChatProvider('xai');
    expect(provider.name).toBe('openai');
  });

  it('returns an OpenAI provider by default (preferred=openai)', async () => {
    const { getChatProvider } = await import('../../server/integrations/providers.js');
    const provider = await getChatProvider('openai');
    expect(provider.name).toBe('openai');
  });

  it('provider has a generateResponse method', async () => {
    const { getChatProvider } = await import('../../server/integrations/providers.js');
    const provider = await getChatProvider('openai');
    expect(typeof provider.generateResponse).toBe('function');
  });
});
