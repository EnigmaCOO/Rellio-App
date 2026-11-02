import { TraditionId } from "./scholar";

export interface ScriptureCitation {
  refId: string;              // canonical id, e.g. "quran:2:255" | "bible:john:3:16"
  tradition: TraditionId;
  book: string;               // "Al-Baqarah" | "John"
  chapter: number | string;
  verse: number | string;
  reference: string;          // human label: "Qurʼan 2:255 (Al-Baqarah)"
  originalText?: string;      // verse in original language (from API, never from model)
  originalLang?: string;      // "ar"
  translation: string;
  translationSource: string;  // "Saheeh International" | "ESV" | "JPS 1985"
}

export interface CommentaryExcerpt {
  sourceId: string;           // matches CommentarySource.id
  sourceTitle: string;
  author: string;
  onRef: string;              // the scripture refId this comments on
  text: string;               // retrieved excerpt (truncate to a budget)
  language: string;
  tradition?: TraditionId;
}

export type RetrievalScope =
  | "in_book"               // scholar inside the reader — position is known
  | "ask_source_grounded"   // Ask page, specific sources selected
  | "ask_comparative"       // Ask page, compare across traditions
  | "ask_general";          // Ask page, no sources — broad multi-faith

export interface GroundedContext {
  scope: RetrievalScope;
  tradition?: TraditionId;            // undefined for ask_general / multi-tradition
  traditionsInScope: TraditionId[];   // 1..n
  focusPassage: ScriptureCitation[];  // in_book: the verses the user is reading
  retrievedPassages: ScriptureCitation[];
  commentary: CommentaryExcerpt[];
  commentaryAvailable: boolean;       // false -> prompt instructs graceful degradation
  traditionCoverage?: Array<{
    tradition: TraditionId;
    scriptureCount: number;
    commentaryCount: number;
    scriptureFailed?: boolean;
    commentaryFailed?: boolean;
  }>;
  conversationSummary?: string;       // rolling summary, replaces the 5-message window
}
