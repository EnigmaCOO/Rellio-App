export type TraditionId =
  | "islam"
  | "christianity"
  | "judaism"
  | "hinduism"
  | "sikhism"
  | "buddhism"
  | "shinto";

export type ScholarId =
  | "mufti"      // Islam
  | "priest"    // Christianity
  | "rabbi"     // Judaism
  | "guru"      // Hinduism
  | "granthi"   // Sikhism
  | "bhikkhu"   // Buddhism
  | "kannushi"; // Shinto (non-standard — see config note)

export type CommentaryDepth =
  | "rich"        // dense, cross-linked, verse-anchored (e.g. Judaism via Sefaria)
  | "good"        // solid named-work coverage (Islam, Buddhism)
  | "moderate"    // public-domain corpus available, gaps exist (Christianity)
  | "thin"        // sparse digital availability — degrade gracefully (Hinduism, Sikhism)
  | "nonstandard";// tradition doesn't fit the scripture+commentary model (Shinto)

export interface CommentarySource {
  id: string;                 // "ibn-kathir"
  title: string;              // "Tafsīr Ibn Kathīr"
  author: string;             // "Ismāʿīl ibn ʿUmar Ibn Kathīr"
  era: string;                // "14th c. CE"
  school?: string;            // "Sunnī / Shāfiʿī"
  focus?: string;             // "narration-based exegesis (tafsīr biʼl-maʼthūr)"
  availability: "full" | "partial" | "sparse";
}

export interface OriginalLanguage {
  code: string;               // ISO-ish: "ar", "he", "arc", "grc", "sa", "pi"
  name: string;               // "Classical Arabic"
  script: string;             // "Arabic"
}

export interface ScholarConfig {
  id: ScholarId;
  tradition: TraditionId;
  displayName: string;        // persona name shown in UI
  title: string;              // "Scholar of Tafsīr & Islamic Jurisprudence"

  // ── KNOWLEDGE LAYER ────────────────────────────────────────────────
  primaryScriptureIds: string[];   // canonical book/corpus ids in your reader
  commentaryCanon: CommentarySource[];
  originalLanguages: OriginalLanguage[];

  // ── METHOD LAYER ───────────────────────────────────────────────────
  hermeneuticMethod: string;  // how this tradition actually reasons over text
  interpretiveLevels?: string;// named layers of meaning, if the tradition has them

  // ── BEHAVIOR LAYER ─────────────────────────────────────────────────
  voice: string;              // tone, register, who they are
  sectarianNote: string;      // how to handle internal divergence
  boundaries: string[];       // explicit guardrails (no binding rulings, etc.)

  commentaryDepth: CommentaryDepth;
}
