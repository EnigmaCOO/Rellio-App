import { useEffect, useRef, useState, useCallback } from "react";
import type { Book, Rendition, Contents, NavItem } from "epubjs";
import {
  classifySpine,
  buildCleanedToc,
  stripFragment,
  type ClassifiedSection,
  type RawSpineItem,
} from "@/lib/epubSections";

export type ReaderThemeId = "light" | "sepia" | "gray" | "dark";
export type ReadingMode = "scroll" | "paginated";

export interface ReaderTheme {
  id: ReaderThemeId;
  bodyBg: string;
  bodyColor: string;
  highlightBg: string;
}

export const READER_THEMES: ReaderTheme[] = [
  { id: "light", bodyBg: "#ffffff", bodyColor: "#1a1a1a", highlightBg: "#ffffff" },
  { id: "sepia", bodyBg: "#f5ecd9", bodyColor: "#3a2f1c", highlightBg: "#f5ecd9" },
  { id: "gray",  bodyBg: "#cfcfcf", bodyColor: "#1a1a1a", highlightBg: "#cfcfcf" },
  { id: "dark",  bodyBg: "#1a1a1a", bodyColor: "#e8e8e8", highlightBg: "#1a1a1a" },
];

export interface ReaderLocation {
  cfi: string;
  percentage: number;
  href: string;
}

export interface AnnotationLite {
  id: number;
  cfiRange: string;
  color: string;
  text?: string | null;
  note?: string | null;
}

export interface FootnotePayload {
  html: string;
  label?: string;
}

interface SearchHit { cfi: string; excerpt: string }

interface ReaderNavApi {
  next: () => void;
  prev: () => void;
  goTo: (cfi: string) => void;
  search: (q: string) => Promise<SearchHit[]>;
}

interface EpubRelocatedEvent {
  start?: { cfi?: string; href?: string; displayed?: { page?: number; total?: number } };
  end?: { cfi?: string; href?: string; displayed?: { page?: number; total?: number } };
}

interface EpubSpineItem {
  href: string;
  idref?: string;
  linear?: boolean | string;
  properties?: string[];
  index: number;
  load: (loader: (path: string) => Promise<unknown>) => Promise<unknown>;
  unload: () => void;
  find: (q: string) => SearchHit[];
}

interface EpubReaderProps {
  fileUrl: string;
  initialCfi?: string | null;
  fontSize: number;     // percentage 80–220
  fontFamily: string;
  lineHeight: number;   // 1.2 – 2.2
  marginPct: number;    // 0 – 20 (% of viewport on each side)
  theme: ReaderTheme;
  brightness: number;   // 0.5 – 1
  annotations: AnnotationLite[];
  readingMode: ReadingMode;
  cleanReadingMode: boolean;
  onLocationChange: (loc: ReaderLocation) => void;
  onTocReady: (toc: NavItem[]) => void;
  onSelection: (cfiRange: string, text: string) => void;
  onTap: () => void;
  onFootnote?: (payload: FootnotePayload) => void;
  registerNav: (api: ReaderNavApi) => void;
}

function buildContentCss(opts: {
  theme: ReaderTheme;
  fontSize: number;
  lineHeight: number;
  readingMode: ReadingMode;
}): string {
  const { theme, fontSize, lineHeight, readingMode } = opts;
  const isScroll = readingMode === "scroll";
  // IMPORTANT:
  //  - Do NOT set padding/margin on <html> or <body>. epub.js sizes its
  //    column layout from the iframe's content box; anything we add here
  //    causes the last line of every page to be clipped in paginated mode.
  //    Horizontal/vertical breathing room is applied via a wrapper outside
  //    the iframe (see the JSX below).
  //  - Do NOT blanket-reset descendants. The EPUB's own paragraph margins,
  //    text-indent, list padding, and stanza spacing must be preserved.
  return `
    html, body {
      background: ${theme.bodyBg} !important;
      color: ${theme.bodyColor} !important;
      font-family: inherit !important;
      font-size: ${fontSize}% !important;
      line-height: ${lineHeight} !important;
      -webkit-text-size-adjust: 100% !important;
      -webkit-user-select: text !important;
      user-select: text !important;
      ${isScroll
        ? "height: auto !important; max-height: none !important; min-height: 0 !important;"
        : ""}
    }
    p, li, blockquote {
      color: ${theme.bodyColor} !important;
      line-height: ${lineHeight} !important;
      orphans: 2;
      widows: 2;
    }
    h1, h2, h3, h4, h5, h6 {
      color: ${theme.bodyColor} !important;
      line-height: 1.25 !important;
      page-break-after: avoid;
      break-after: avoid;
    }
    a { color: ${theme.bodyColor} !important; text-decoration: underline; }
    img, svg, video, picture {
      max-width: 100% !important;
      height: auto !important;
    }
    img, svg, video, picture { box-sizing: border-box; }
    table {
      max-width: 100% !important;
      display: block;
      overflow-x: auto;
      border-collapse: collapse;
    }
    pre, code {
      white-space: pre-wrap !important;
      word-break: break-word !important;
      max-width: 100% !important;
    }
    /* Defensive: neutralize EPUB CSS that genuinely breaks the layout. */
    [style*="position: absolute"], [style*="position:absolute"],
    [style*="position: fixed"], [style*="position:fixed"] {
      position: static !important;
    }
    /* Hide raw footnote asides; we render them in our own sheet. */
    aside[epub|type="footnote"], aside[role="doc-footnote"] {
      display: none;
    }
  `;
}

function isFootnoteAnchor(el: Element): boolean {
  const epubType = el.getAttribute("epub:type") || el.getAttribute("type") || "";
  if (/noteref|footnote|endnote/i.test(epubType)) return true;
  const role = el.getAttribute("role") || "";
  if (/doc-noteref|doc-footnote|doc-endnote/i.test(role)) return true;
  const cls = el.getAttribute("class") || "";
  if (/(^|\s)(footnote|fn|noteref|endnote)(\s|$|-)/i.test(cls)) return true;
  return false;
}

function findFootnoteTarget(doc: Document, fragment: string): { html: string; label?: string } | null {
  if (!fragment) return null;
  const id = decodeURIComponent(fragment.replace(/^#/, ""));
  if (!id) return null;
  const target = doc.getElementById(id);
  if (!target) return null;
  // Common patterns: <aside epub:type="footnote">…</aside>
  // or <li id="fn1">…</li>
  const epubType = target.getAttribute("epub:type") || target.getAttribute("type") || "";
  const role = target.getAttribute("role") || "";
  const looksLikeNote =
    /footnote|endnote/i.test(epubType) ||
    /doc-footnote|doc-endnote/i.test(role) ||
    target.tagName === "ASIDE" ||
    target.tagName === "LI" ||
    /(^|\s)(footnote|fn|endnote)(\s|$|-)/i.test(target.getAttribute("class") || "");
  if (!looksLikeNote) return null;
  const html = target.innerHTML.trim();
  if (!html) return null;
  return { html, label: target.getAttribute("data-label") || undefined };
}

export function EpubReader({
  fileUrl,
  initialCfi,
  fontSize,
  fontFamily,
  lineHeight,
  marginPct,
  theme,
  brightness,
  annotations,
  readingMode,
  cleanReadingMode,
  onLocationChange,
  onTocReady,
  onSelection,
  onTap,
  onFootnote,
  registerNav,
}: EpubReaderProps) {
  const viewerRef = useRef<HTMLDivElement>(null);
  const bookRef = useRef<Book | null>(null);
  const renditionRef = useRef<Rendition | null>(null);
  const annotationCfisRef = useRef<Set<string>>(new Set());
  const keyHandlerRef = useRef<((e: KeyboardEvent) => void) | null>(null);

  // Section classification — refreshed when book opens.
  const sectionsRef = useRef<ClassifiedSection[]>([]);
  const cleanModeRef = useRef(cleanReadingMode);
  const lastNavDirRef = useRef<"next" | "prev">("next");
  const skipGuardRef = useRef(0);
  const selectionActiveRef = useRef(false);
  const pointerDraggingRef = useRef(false);

  const [ready, setReady] = useState(false);

  useEffect(() => {
    const wasOn = cleanModeRef.current;
    cleanModeRef.current = cleanReadingMode;
    // If the user just turned clean mode ON while sitting on a hidden
    // section, nudge forward to the next readable section so they don't
    // get stranded looking at a copyright/TOC page.
    if (!wasOn && cleanReadingMode && ready) {
      const r = renditionRef.current;
      const sections = sectionsRef.current;
      if (!r || sections.length === 0) return;
      const loc = (r as unknown as { currentLocation: () => EpubRelocatedEvent }).currentLocation?.();
      const href = stripFragment(loc?.start?.href ?? "");
      if (href && !sections.some((s) => s.href === href && s.isReadable)) {
        const firstReadable = sections.find((s) => s.isReadable);
        if (firstReadable) {
          lastNavDirRef.current = "next";
          r.display(firstReadable.href).catch(() => undefined);
        }
      }
    }
  }, [cleanReadingMode, ready]);

  // ── Init book ─────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    let book: Book | null = null;
    let rendition: Rendition | null = null;

    (async () => {
      const ePub = (await import("epubjs")).default;
      if (cancelled || !viewerRef.current) return;

      book = ePub(fileUrl, { openAs: "epub" });
      bookRef.current = book;

      const flow = readingMode === "scroll" ? "scrolled-doc" : "paginated";
      rendition = book.renderTo(viewerRef.current, {
        width: "100%",
        height: "100%",
        spread: readingMode === "scroll" ? "none" : "auto",
        flow,
        allowScriptedContent: false,
        manager: readingMode === "scroll" ? "continuous" : "default",
      });
      renditionRef.current = rendition;

      // Register a single base theme; we re-apply CSS via themes.override on changes.
      rendition.themes.register("base", {});
      rendition.themes.select("base");
      rendition.themes.fontSize(`${fontSize}%`);
      try { rendition.themes.font(fontFamily); } catch { /* ignore */ }

      // Inject our content CSS into every loaded section.
      const applyCss = (contents: Contents) => {
        const doc = contents.document;
        if (!doc) return;
        let style = doc.getElementById("rellio-reader-style") as HTMLStyleElement | null;
        if (!style) {
          style = doc.createElement("style");
          style.id = "rellio-reader-style";
          doc.head?.appendChild(style);
        }
        style.textContent = buildContentCss({ theme, fontSize, lineHeight, readingMode });
      };
      rendition.hooks.content.register((contents: Contents) => {
        applyCss(contents);
        attachContentHandlers(contents);
      });

      // ── Build navigation + spine classification ──
      await book.ready;
      const nav = await book.loaded.navigation;
      const spineRaw = (book.spine as unknown as { spineItems?: EpubSpineItem[] }).spineItems ?? [];
      const rawItems: RawSpineItem[] = spineRaw.map((s) => ({
        href: s.href,
        idref: s.idref,
        linear: s.linear,
        properties: s.properties,
        index: s.index,
      }));
      const classified = classifySpine(rawItems, nav.toc as NavItem[]);
      sectionsRef.current = classified;
      const cleanedToc = buildCleanedToc(nav.toc as NavItem[], classified);
      onTocReady(cleanedToc);

      // ── Choose initial display target ──
      const firstReadable = classified.find((s) => s.isReadable);
      let displayTarget: string | undefined = initialCfi || undefined;
      if (!displayTarget && cleanModeRef.current && firstReadable) {
        displayTarget = firstReadable.href;
      }
      try {
        await rendition.display(displayTarget);
      } catch {
        try { await rendition.display(); } catch { /* ignore */ }
      }

      // Generate locations for percentage progress (best-effort).
      book.locations.generate(1600).catch(() => undefined);

      rendition.on("relocated", (location: EpubRelocatedEvent) => {
        const cfi = location?.start?.cfi;
        const href = stripFragment(location?.start?.href ?? "");
        if (!cfi) return;

        // If we landed on a non-readable section while clean mode is on,
        // skip past it in the last-known navigation direction. Use a tiny
        // guard counter to avoid infinite skip loops on malformed books.
        if (
          cleanModeRef.current &&
          href &&
          skipGuardRef.current < 8 &&
          !sectionsRef.current.some((s) => s.href === href && s.isReadable) &&
          sectionsRef.current.some((s) => s.isReadable)
        ) {
          skipGuardRef.current += 1;
          if (lastNavDirRef.current === "prev") {
            try { rendition!.prev(); } catch { /* ignore */ }
          } else {
            try { rendition!.next(); } catch { /* ignore */ }
          }
          return;
        }
        skipGuardRef.current = 0;

        const percentage = computeCleanProgress(cfi, href, location);
        onLocationChange({ cfi, percentage, href: href ?? "" });
      });

      rendition.on("selected", (cfiRange: string, contents: Contents) => {
        const sel = contents.window.getSelection?.();
        const text = sel?.toString().trim() ?? "";
        if (text.length > 0) {
          selectionActiveRef.current = true;
          onSelection(cfiRange, text);
        }
      });

      const handleKey = (e: KeyboardEvent) => {
        if (e.key === "ArrowRight") { lastNavDirRef.current = "next"; rendition!.next(); }
        else if (e.key === "ArrowLeft") { lastNavDirRef.current = "prev"; rendition!.prev(); }
      };
      rendition.on("keyup", handleKey);
      window.addEventListener("keyup", handleKey);
      keyHandlerRef.current = handleKey;

      registerNav({
        next: () => { lastNavDirRef.current = "next"; rendition!.next(); },
        prev: () => { lastNavDirRef.current = "prev"; rendition!.prev(); },
        goTo: (cfi: string) => {
          // When the user picks a TOC entry, ignore clean-mode skipping for that jump.
          skipGuardRef.current = 99;
          rendition!.display(cfi).catch(() => undefined);
          // Reset the guard shortly after so subsequent auto-skips work normally.
          setTimeout(() => { skipGuardRef.current = 0; }, 600);
        },
        search: async (query: string) => {
          if (!book || !query.trim()) return [];
          const q = query.trim();
          const results: SearchHit[] = [];
          const spine = book.spine as unknown as { spineItems: EpubSpineItem[] };
          const items = spine.spineItems ?? [];
          for (const item of items) {
            // Skip non-readable sections when clean mode is on.
            if (
              cleanModeRef.current &&
              !sectionsRef.current.some((s) => s.href === stripFragment(item.href) && s.isReadable)
            ) continue;
            try {
              await item.load(book.load.bind(book));
              const found = item.find(q);
              results.push(...found);
            } catch { /* skip section */ }
            try { item.unload(); } catch { /* ignore */ }
            if (results.length > 60) break;
          }
          return results;
        },
      });

      setReady(true);
    })();

    function computeCleanProgress(
      cfi: string,
      href: string,
      loc: EpubRelocatedEvent,
    ): number {
      const sections = sectionsRef.current;
      if (sections.length === 0) {
        // Fallback to global locations percentage if classification missing.
        try {
          return Math.round(((book?.locations.percentageFromCfi(cfi) || 0)) * 100);
        } catch { return 0; }
      }
      const readable = sections.filter((s) => s.isReadable);
      if (readable.length === 0) {
        try {
          return Math.round(((book?.locations.percentageFromCfi(cfi) || 0)) * 100);
        } catch { return 0; }
      }
      const idx = readable.findIndex((s) => s.href === href);
      if (idx < 0) {
        // Hidden section — pin to nearest edge.
        const here = sections.findIndex((s) => s.href === href);
        const beforeReadable = sections.slice(0, here >= 0 ? here : 0).some((s) => s.isReadable);
        return beforeReadable ? 100 : 0;
      }
      const page = loc.start?.displayed?.page ?? 1;
      const total = Math.max(1, loc.start?.displayed?.total ?? 1);
      const intra = Math.min(1, Math.max(0, (page - 1) / total));
      return Math.round(((idx + intra) / readable.length) * 100);
    }

    function attachContentHandlers(contents: Contents) {
      const doc = contents.document;
      const win = contents.window;
      if (!doc || !win) return;

      // Track text-selection state inside the iframe so edge-zone navigation
      // can refuse to flip pages while the user is selecting text.
      const onSelectionChange = () => {
        const sel = win.getSelection?.();
        const txt = sel?.toString().trim() ?? "";
        selectionActiveRef.current = txt.length > 0;
        if (txt.length === 0) {
          // Selection cleared.
        }
      };
      doc.addEventListener("selectionchange", onSelectionChange);

      const onPointerDown = () => { pointerDraggingRef.current = true; };
      const onPointerUp = () => {
        // Slight delay so 'selected' events fire before edge zones consider taps.
        setTimeout(() => { pointerDraggingRef.current = false; }, 50);
      };
      doc.addEventListener("pointerdown", onPointerDown, true);
      doc.addEventListener("pointerup", onPointerUp, true);
      doc.addEventListener("pointercancel", onPointerUp, true);

      // Footnote interception.
      doc.addEventListener("click", (e: Event) => {
        const target = e.target as Element | null;
        if (!target) return;
        const anchor = target.closest("a[href]") as HTMLAnchorElement | null;
        if (!anchor) return;
        const href = anchor.getAttribute("href") || "";
        if (!href) return;
        // Only intercept internal links that look like footnote refs.
        if (!isFootnoteAnchor(anchor) && !/^#/.test(href)) return;
        if (/^https?:/i.test(href)) return;

        // Try same-document fragment first.
        if (href.startsWith("#")) {
          const note = findFootnoteTarget(doc, href);
          if (note && onFootnote) {
            e.preventDefault();
            e.stopPropagation();
            onFootnote(note);
            return;
          }
        }
        // Cross-document footnote refs (e.g. "notes.xhtml#fn1")
        if (isFootnoteAnchor(anchor) && href.includes("#") && onFootnote && book) {
          // Try to resolve the target spine item; if we can't find it,
          // let the link navigate normally instead of trapping the user.
          const [rawPath, frag] = href.split("#");
          const path = decodeURIComponent(rawPath || "");
          const baseName = path.split("/").pop() ?? path;
          const items = (book.spine as unknown as { spineItems: EpubSpineItem[] }).spineItems ?? [];
          const item = items.find((s) => {
            const sHref = decodeURIComponent(stripFragment(s.href));
            return sHref === path
              || sHref.endsWith("/" + baseName)
              || sHref.endsWith(baseName);
          });
          if (!item) return; // fall through to default navigation
          e.preventDefault();
          e.stopPropagation();
          (async () => {
            let opened = false;
            try {
              await item.load(book.load.bind(book));
              const itemDoc = (item as unknown as { document?: Document }).document;
              if (!itemDoc) return;
              const note = findFootnoteTarget(itemDoc, "#" + frag);
              if (note) { onFootnote(note); opened = true; }
            } catch { /* ignore */ }
            finally {
              try { item.unload(); } catch { /* ignore */ }
              // If we couldn't extract a note, fall back to navigating.
              if (!opened) {
                try { renditionRef.current?.display(href).catch(() => undefined); }
                catch { /* ignore */ }
              }
            }
          })();
        }
      }, true);
    }

    return () => {
      cancelled = true;
      if (keyHandlerRef.current) {
        window.removeEventListener("keyup", keyHandlerRef.current);
        keyHandlerRef.current = null;
      }
      try { renditionRef.current?.destroy(); } catch { /* ignore */ }
      try { bookRef.current?.destroy(); } catch { /* ignore */ }
      renditionRef.current = null;
      bookRef.current = null;
      sectionsRef.current = [];
    };
    // Re-init when fileUrl OR readingMode changes (epub.js flow can't be
    // toggled at runtime; we have to remount the rendition).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileUrl, readingMode]);

  // Apply a late-arriving initial CFI (e.g., after auth progress loads)
  const appliedInitialCfiRef = useRef<string | null>(null);
  useEffect(() => {
    const r = renditionRef.current;
    if (!r || !ready || !initialCfi) return;
    if (appliedInitialCfiRef.current === initialCfi) return;
    appliedInitialCfiRef.current = initialCfi;
    r.display(initialCfi).catch(() => undefined);
  }, [initialCfi, ready]);

  // ── Apply typography / theme / margin / clean-mode changes live ──────────
  useEffect(() => {
    const r = renditionRef.current;
    if (!r || !ready) return;
    r.themes.fontSize(`${fontSize}%`);
    try { r.themes.font(fontFamily); } catch { /* ignore */ }
    // Refresh injected CSS in every currently-rendered section.
    try {
      const views = (r.manager as unknown as { views: () => Array<{ contents?: Contents }> })?.views?.();
      views?.forEach((v) => {
        const c = v.contents;
        if (!c) return;
        const doc = c.document;
        if (!doc) return;
        let style = doc.getElementById("rellio-reader-style") as HTMLStyleElement | null;
        if (!style) {
          style = doc.createElement("style");
          style.id = "rellio-reader-style";
          doc.head?.appendChild(style);
        }
        style.textContent = buildContentCss({ theme, fontSize, lineHeight, readingMode });
      });
    } catch { /* ignore */ }
    // When the side margins change, the viewer's available width changes
    // but no window resize fires — tell epub.js to remeasure.
    try {
      (r as unknown as { resize: () => void }).resize?.();
    } catch { /* ignore */ }
  }, [theme, fontSize, fontFamily, lineHeight, marginPct, readingMode, ready]);

  // ── Apply annotations ─────────────────────────────────────────────────────
  const renderAnnotations = useCallback(() => {
    const r = renditionRef.current;
    if (!r) return;
    const desired = new Set(annotations.map((a) => a.cfiRange));
    annotationCfisRef.current.forEach((cfi) => {
      if (!desired.has(cfi)) {
        try { r.annotations.remove(cfi, "highlight"); } catch { /* ignore */ }
        annotationCfisRef.current.delete(cfi);
      }
    });
    annotations.forEach((a) => {
      if (annotationCfisRef.current.has(a.cfiRange)) return;
      try {
        const styles: Record<string, string> = {
          fill: a.color,
          "fill-opacity": "0.35",
          "mix-blend-mode": "multiply",
        };
        r.annotations.add(
          "highlight",
          a.cfiRange,
          {},
          undefined,
          "rellio-hl",
          styles,
        );
        annotationCfisRef.current.add(a.cfiRange);
      } catch {
        // CFI might point to an unloaded section — will be added when section loads
      }
    });
  }, [annotations]);

  useEffect(() => {
    if (!ready) return;
    renderAnnotations();
    const r = renditionRef.current;
    if (!r) return;
    const handler = () => renderAnnotations();
    r.on("rendered", handler);
    return () => {
      try { r.off("rendered", handler); } catch { /* ignore */ }
    };
  }, [ready, renderAnnotations]);

  // ── Edge-zone navigation (paginated only) ────────────────────────────────
  const onEdge = (dir: "prev" | "next") => (e: React.MouseEvent | React.TouchEvent) => {
    if (selectionActiveRef.current || pointerDraggingRef.current) {
      // Don't flip the page while text is being selected/copied.
      return;
    }
    e.stopPropagation();
    lastNavDirRef.current = dir;
    const r = renditionRef.current;
    if (!r) return;
    if (dir === "next") r.next();
    else r.prev();
  };

  // Side / vertical breathing room lives OUTSIDE the iframe so epub.js's
  // column math stays correct (otherwise the last line of every page is
  // clipped). The inner viewer fills whatever box this padded wrapper gives
  // it; epub.js measures that smaller box and lays columns inside it.
  const sidePadding = `${marginPct}%`;
  const vertPadding = readingMode === "scroll" ? "24px" : "16px";

  return (
    <div
      className="relative w-full h-full"
      style={{
        background: theme.bodyBg,
        filter: `brightness(${brightness})`,
      }}
      data-testid="epub-viewer-shell"
    >
      <div
        className="absolute inset-0"
        style={{
          paddingLeft: sidePadding,
          paddingRight: sidePadding,
          paddingTop: vertPadding,
          paddingBottom: vertPadding,
        }}
      >
        <div
          ref={viewerRef}
          className="w-full h-full select-text rellio-epub-viewer"
          data-reading-mode={readingMode}
        />
      </div>

      {readingMode === "paginated" && (
        <>
          <button
            type="button"
            aria-label="Previous page"
            onClick={onEdge("prev")}
            onTouchEnd={onEdge("prev")}
            className="absolute left-0 top-0 bottom-0 w-[6%] max-w-[56px] z-10 cursor-w-resize bg-transparent"
            data-testid="edge-prev"
            tabIndex={-1}
          />
          <button
            type="button"
            aria-label="Next page"
            onClick={onEdge("next")}
            onTouchEnd={onEdge("next")}
            className="absolute right-0 top-0 bottom-0 w-[6%] max-w-[56px] z-10 cursor-e-resize bg-transparent"
            data-testid="edge-next"
            tabIndex={-1}
          />
          {/* Center tap for chrome toggle (paginated only). */}
          <button
            type="button"
            aria-label="Toggle controls"
            onClick={(e) => {
              if (selectionActiveRef.current || pointerDraggingRef.current) return;
              e.stopPropagation();
              onTap();
            }}
            className="absolute left-[6%] right-[6%] top-0 bottom-0 z-0 bg-transparent"
            data-testid="center-tap"
            tabIndex={-1}
          />
        </>
      )}
    </div>
  );
}
