import type { NavItem } from "epubjs";

export type SectionKind =
  | "cover"
  | "title"
  | "copyright"
  | "toc"
  | "dedication"
  | "imprint"
  | "frontmatter"
  | "backmatter"
  | "reading";

export interface RawSpineItem {
  href: string;
  idref?: string;
  linear?: boolean | string;
  properties?: string[];
  index: number;
}

export interface ClassifiedSection {
  href: string;
  index: number;
  kind: SectionKind;
  label?: string;
  isReadable: boolean;
}

const HREF_PATTERNS: Array<[RegExp, SectionKind]> = [
  [/cover/i, "cover"],
  [/halftitle|half[-_ ]?title/i, "title"],
  [/titlepage|title[-_ ]?page|^title\b|^title[\W]/i, "title"],
  [/copyright|copy_?right|legal|imprint|colophon/i, "copyright"],
  [/(^|\W)toc(\W|$)|table[-_ ]?of[-_ ]?contents|contents\.x?html|nav\.x?html|^nav$|^nav[-_]/i, "toc"],
  [/dedication/i, "dedication"],
  [/acknowledg/i, "frontmatter"],
  [/about[-_ ]?(the[-_ ]?)?author|biograph/i, "backmatter"],
  [/bibliograph|references?\.x?html|^index\.x?html$/i, "backmatter"],
  [/frontmatter|front[-_ ]?matter/i, "frontmatter"],
  [/backmatter|back[-_ ]?matter/i, "backmatter"],
  [/publisher|isbn|epigraph/i, "frontmatter"],
];

const LABEL_PATTERNS: Array<[RegExp, SectionKind]> = [
  [/^cover$|cover image/i, "cover"],
  [/title page|half[- ]?title/i, "title"],
  [/copyright|imprint|colophon|legal notice/i, "copyright"],
  [/table of contents|^contents$/i, "toc"],
  [/dedication/i, "dedication"],
  [/acknowledgements?/i, "frontmatter"],
  [/about the author|biograph/i, "backmatter"],
  [/bibliography|^index$/i, "backmatter"],
  [/foreword|preface|epigraph|publisher/i, "frontmatter"],
];

function stripFragment(href: string): string {
  const i = href.indexOf("#");
  return i >= 0 ? href.slice(0, i) : href;
}

function buildTocLabelMap(toc: NavItem[]): Map<string, string> {
  const map = new Map<string, string>();
  const walk = (items: NavItem[]) => {
    for (const it of items) {
      const h = stripFragment(it.href || "");
      if (h && !map.has(h)) map.set(h, (it.label || "").trim());
      if (it.subitems?.length) walk(it.subitems);
    }
  };
  walk(toc);
  return map;
}

export function classifySpine(
  items: RawSpineItem[],
  toc: NavItem[],
): ClassifiedSection[] {
  const labels = buildTocLabelMap(toc);

  return items.map((it) => {
    const href = stripFragment(it.href || "");
    const label = labels.get(href);
    let kind: SectionKind = "reading";

    if (it.properties?.includes("cover-image") || it.properties?.includes("cover")) {
      kind = "cover";
    } else {
      // Match against href patterns
      for (const [pat, k] of HREF_PATTERNS) {
        if (pat.test(href)) { kind = k; break; }
      }
      // Then try TOC label patterns (only if still "reading")
      if (kind === "reading" && label) {
        for (const [pat, k] of LABEL_PATTERNS) {
          if (pat.test(label)) { kind = k; break; }
        }
      }
      // linear="no" sections are typically auxiliary (notes, supplements).
      // We keep them out of the main reading flow but do NOT treat as "reading"
      // for navigation purposes either.
      if (kind === "reading" && it.linear === false) {
        kind = "frontmatter";
      }
    }

    return {
      href,
      index: it.index,
      kind,
      label,
      isReadable: kind === "reading",
    };
  });
}

/**
 * Build a clean Rellio-style TOC from the EPUB navigation, dropping
 * any top-level entries whose target section is non-readable (cover,
 * copyright, raw EPUB TOC pages, etc.). Subitems are kept intact when
 * their parent is readable.
 */
export function buildCleanedToc(
  toc: NavItem[],
  classified: ClassifiedSection[],
): NavItem[] {
  const readable = new Set(classified.filter((s) => s.isReadable).map((s) => s.href));
  if (readable.size === 0) return toc;
  const filtered: NavItem[] = [];
  for (const it of toc) {
    const href = stripFragment(it.href || "");
    if (!href) continue;
    if (readable.has(href)) {
      filtered.push(it);
      continue;
    }
    // If the top-level entry is not readable but has readable subitems,
    // promote those subitems into the cleaned list.
    if (it.subitems?.length) {
      for (const sub of it.subitems) {
        const subHref = stripFragment(sub.href || "");
        if (subHref && readable.has(subHref)) filtered.push(sub);
      }
    }
  }
  return filtered.length ? filtered : toc;
}

export { stripFragment };
