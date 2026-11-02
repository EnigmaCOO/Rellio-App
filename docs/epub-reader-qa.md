# EPUB Reader QA Notes

This doc explains how to verify each fix from the EPUB reader stabilization
work. Open any book under `/reader/:id` and run through the checklist below
on both desktop and mobile viewports.

## 1. No clipping (top / bottom / right edge)

- **Test (paginated):** Flip through several pages of a long chapter
  on desktop. Watch the bottom edge of every page.
- **Expect:** Every line — including the last one — renders in full.
  No truncated characters along the bottom or right edge of the column.
- **Test (scroll):** On mobile, scroll a chapter from top to bottom.
  Check the very first line of the section and the very last line.
- **Expect:** Both fully visible. Neither the top toolbar nor the
  bottom progress footer overlap any text.
- **Test:** Slide the Margin slider in the type panel from minimum
  to maximum. The text reflows, but no line ever gets clipped.
- **Why it works:**
  - The reader page is a CSS grid (`grid-rows-[auto_1fr_auto]`) so
    the toolbar/footer take real rows instead of overlaying the viewer.
  - Side and vertical breathing room are applied via a wrapper
    *around* the rendition iframe — never via padding on `<body>`
    inside the iframe. That keeps epub.js's column math correct
    (padding on the body shifts columns inside the measured area,
    clipping the last line of every page).
  - When the margin slider changes the wrapper width, we call
    `rendition.resize()` so epub.js re-measures and re-paginates.

## 1b. Paragraph indentation, stanzas, and verse spacing preserved

- **Test:** Open a book that uses paragraph indentation (most Bibles)
  or stanza spacing (Bhagavad Gita verses, Psalms).
- **Expect:** First-line indents, stanza gaps, drop caps, and list
  padding all render the way the publisher intended — not collapsed
  into a single wall of text.
- **Why it works:** We no longer apply `body * { max-width: 100% !important }`
  or force `margin: 0` over every element. Our injected CSS only sets
  theme color, font, and line-height, plus defensive overrides for
  fixed/absolute positioning. The EPUB's own typography survives.

## 2. Scroll mode actually scrolls

- **Test:** Open the type panel (Aa) → set **Reading mode = Scroll**.
- **Expect:** The book becomes vertically scrollable inside the reader
  viewport. Long chapters can be read in one continuous column.
- **Mobile default:** First-time mobile users land in scroll mode
  automatically (controlled by `loadPrefs()` in `client/src/pages/reader.tsx`).
- **Desktop default:** Page-flip (paginated). Both can be switched
  freely; the choice persists in `localStorage` under `rellio.reader.prefs`.

## 3. Selection / copy never flips the page

- **Test:** In paginated mode, long-press / drag-select a sentence in
  the middle of a page. Tap **Copy** in the selection toolbar.
- **Expect:** The selection toolbar appears. The page does NOT advance
  while you are selecting, releasing, or copying.
- **Why it works:** Page-turn handlers are no longer attached to the
  full content body. We track `selectionchange` and `pointerdown/up`
  inside the iframe; edge zones refuse to navigate while a selection
  is active or a pointer drag is in progress.

## 4. Page flips only via clear edge zones

- **Test:** In paginated mode, click anywhere in the wide center area
  of the page.
- **Expect:** The center tap toggles the toolbar/footer chrome, it
  does not flip the page.
- **Test:** Click the leftmost or rightmost ~6% of the page (or use
  arrow keys / the chevron buttons that appear on desktop ≥ md).
- **Expect:** Page flips backward / forward.
- **Scroll mode:** Edge zones are not rendered; navigation is via
  the chevron buttons, arrow keys, or the TOC.

## 5. Clean reading mode hides front/back-matter

- **Test:** Open a Bible / Quran / Tanakh EPUB that has a cover,
  title page, copyright, and a raw TOC at the start.
- **Expect:** With **Clean reading mode = ON** (default), the reader
  opens directly on the first scripture/chapter section. The TOC drawer
  in the side panel shows only readable chapters, not the EPUB's own
  copyright or contents pages.
- **Toggle:** Turn clean mode OFF in the type panel to see the original
  full EPUB structure including front-matter.
- **Implementation:** `client/src/lib/epubSections.ts` classifies each
  spine item by href patterns, EPUB navigation labels, and spine
  properties (e.g. `cover-image`).

## 6. Mobile uses one-column scroll, desktop premium paginated

- **Test:** Resize to a phone width (≤ 767px) and reload.
- **Expect:** Reader loads in scroll mode by default. Reading is one
  continuous vertical column with comfortable side margins.
- **Test:** Resize to desktop and reload.
- **Expect:** Reader loads in paginated mode by default with edge tap
  zones, chevron buttons, and a center area for chrome toggling.

## 7. Progress reflects only readable content

- **Test:** With clean mode ON, open a book whose first few EPUB
  spine items are cover/title/copyright/TOC pages.
- **Expect:** The bottom progress bar shows ~0% on the first real
  chapter, not 8–15% (which is what would happen if hidden pages
  counted toward the percentage). Reaching the final readable section
  shows ~100%, not less.
- **Implementation:** `EpubReader.tsx` computes percentage as
  `(cleanedSectionIndex + intraSectionFraction) / cleanedSectionCount`.

## 8. Footnote behaviour

- **Test:** Open a book with footnote markers (e.g. Bhagavad Gita
  commentary, study Bibles). Tap a footnote anchor.
- **Expect:** A bottom sheet (mobile) or side popover (desktop)
  appears with the footnote content. Closing the sheet returns you
  to the exact same passage; the page did not flip and your scroll
  position did not change.
- **Detection:** Anchors with `epub:type="noteref"`, `role="doc-noteref"`,
  classes containing `footnote`/`fn`/`endnote`, or same-document `#fn…`
  fragments are intercepted. Other internal links still navigate
  normally.

## 9. EPUB CSS doesn't break layout

- **Test:** Open a heavily-styled EPUB (one with images, tables, or
  publisher CSS). Switch between light/sepia/gray/dark themes.
- **Expect:** Images and tables fit within the viewport. Text colour
  follows the chosen theme. No content overflows horizontally.
  Absolutely-positioned EPUB elements no longer escape the page.
- **Implementation:** `buildContentCss()` in `EpubReader.tsx` injects
  overrides into every loaded section.

## 10. Switching reading mode mid-book

- **Test:** Mid-chapter, open the type panel and switch from page-flip
  to scroll (or vice versa).
- **Expect:** The book reopens in the chosen mode and tries to land
  near the previous CFI. No clipping; no error.
- **Why:** epub.js's `flow` cannot be toggled at runtime, so we tear
  down and re-create the rendition when `readingMode` changes. The
  last saved CFI is reapplied.
