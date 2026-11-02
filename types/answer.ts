import { ScholarId, TraditionId } from "./scholar";

// Every citation the model emits MUST resolve to a refId present in GroundedContext.
// The validator rejects/regenerates anything that doesn't.
export interface GroundedCitation {
  refId: string;              // must exist in the GroundedContext passed in
  reference: string;          // human label echoed back
  quotedText?: string;        // if present, must fuzzy-match canonical text
  verified: boolean;          // set by the validator, not the model
}

// In-book persona head output
export interface ScholarAnswer {
  scholarId: ScholarId;
  prose: string;
  citations: GroundedCitation[];
  commentaryUsed: string[];   // CommentarySource ids actually drawn on
  uncertaintyFlags?: string[];// where the scholar flagged limits/disagreement
}

// Ask structured head output
export interface AskSection {
  heading: string;
  tradition?: TraditionId;    // set in comparative mode so the UI can color-code
  body: string;
  citations: GroundedCitation[];
}

export interface AskResponse {
  mode: "strict_source_grounded" | "comparative" | "general";
  summary: string;
  sections: AskSection[];
  references: GroundedCitation[];
  followUps: string[];
}
