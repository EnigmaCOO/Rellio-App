// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createElement } from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot, type Root } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ScripturePassage } from '@/features/sacred-map/SacredStory';
import type { ScriptureReference } from '@/features/sacred-map/types';
import eventsData from '../../client/public/data/events.json';

// React 18 needs this flag so act() flushes effects without warnings.
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

interface RawEvent {
  id: string;
  references?: ScriptureReference[];
}
const events = (eventsData as { events: RawEvent[] }).events;

function refById(eventId: string, refId: string): ScriptureReference {
  const event = events.find((e) => e.id === eventId);
  const ref = (event?.references ?? []).find((r) => r.id === refId);
  if (!ref) throw new Error(`fixture reference not found: ${eventId}/${refId}`);
  return ref;
}

// A whole-chapter /api/scriptures payload: Matthew chapter 1, verses 1..25.
function matthewChapterOne() {
  return Array.from({ length: 25 }, (_, i) => ({
    religion: 'christianity',
    book: 'Matthew',
    chapter: 1,
    verse: i + 1,
    text: `Matthew one verse ${i + 1} body.`,
    translation: 'WEB',
  }));
}

describe('ScripturePassage (Matthew 1:18-2:12 cross-chapter excerpt)', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.restoreAllMocks();
  });

  async function renderPassage(reference: ScriptureReference) {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    await act(async () => {
      root = createRoot(container);
      root.render(
        createElement(
          QueryClientProvider,
          { client: queryClient },
          createElement(ScripturePassage, { reference }),
        ),
      );
    });
    // Let the mocked fetch + react-query state update settle.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }

  it('fetches the start chapter, narrows to verses >= 18, and labels it an Excerpt', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => matthewChapterOne(),
    });
    vi.stubGlobal('fetch', fetchMock);

    await renderPassage(refById('evt_jesus_birth', 'ref_matthew_nativity'));

    // It fetched the start chapter (chapter 1), not the continuation chapter.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const requestedUrl = String(fetchMock.mock.calls[0][0]);
    expect(requestedUrl).toContain('religion=christianity');
    expect(requestedUrl).toContain('book=Matthew');
    expect(requestedUrl).toContain('chapter=1');

    const text = container.textContent ?? '';

    // Narrowing: verses before the start (1..17) are dropped...
    expect(text).not.toContain('Matthew one verse 1 body.');
    expect(text).not.toContain('Matthew one verse 17 body.');
    // ...and verses from 18 to the end of the fetched chapter are shown.
    expect(text).toContain('Matthew one verse 18 body.');
    expect(text).toContain('Matthew one verse 25 body.');

    // Cross-chapter citations are marked as an excerpt with a continuation note.
    expect(text).toContain('Excerpt');
    expect(text).toContain('the full citation continues into the next chapter');

    // The citation itself is always shown.
    expect(text).toContain('Matthew 1:18-2:12');
  });

  it('falls back to the citation note for an unfetchable source (hadith-api)', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await renderPassage(refById('evt_first_revelation', 'ref_bukhari_wahy'));

    // Unsupported source: no network call, just the citation + note fallback.
    expect(fetchMock).not.toHaveBeenCalled();
    const text = container.textContent ?? '';
    expect(text).toContain('Sahih al-Bukhari');
    expect(text).not.toContain('Excerpt');
  });
});
