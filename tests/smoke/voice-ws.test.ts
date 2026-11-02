// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { resolveVoiceWsUrl } from '../../client/src/lib/voice-ws';

describe('resolveVoiceWsUrl', () => {
  it('returns a string starting with ws:// or wss://', () => {
    const url = resolveVoiceWsUrl();
    expect(url).toMatch(/^wss?:\/\//);
  });

  it('returns a URL ending with /ws/voice', () => {
    const url = resolveVoiceWsUrl();
    expect(url).toMatch(/\/ws\/voice$/);
  });

  it('uses wss: when page protocol is https:', () => {
    Object.defineProperty(window, 'location', {
      value: { protocol: 'https:', host: 'example.com' },
      writable: true,
      configurable: true,
    });
    const url = resolveVoiceWsUrl();
    expect(url.startsWith('wss:')).toBe(true);
  });

  it('uses ws: when page protocol is http:', () => {
    Object.defineProperty(window, 'location', {
      value: { protocol: 'http:', host: 'localhost:5000' },
      writable: true,
      configurable: true,
    });
    const url = resolveVoiceWsUrl();
    expect(url.startsWith('ws:')).toBe(true);
  });
});
