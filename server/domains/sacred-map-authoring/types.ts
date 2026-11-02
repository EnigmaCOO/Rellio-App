// Sacred Map authoring — draft content types.
//
// These model the DRAFT deep-content the authoring pipeline produces for an
// event. Drafts are written for human/scholar review and are NEVER published
// automatically. We store locators only — never the fetched passage text — so a
// draft carries pointers into licensed sources, not the licensed text itself.

// The only statuses the authoring API will ever set. "published" is deliberately
// absent: going live is an out-of-band step a human performs after review.
export type DraftReviewStatus = "draft_unreviewed" | "in_review" | "scholar_reviewed";

export type DraftLocator = Record<string, string | number>;

export interface DraftVerification {
  // verified         — the locator resolved against its live source.
  // unresolved       — the source was fetchable but the cited verse(s) weren't found.
  // unverifiable_source — we have no live resolver for this source_system.
  status: "verified" | "unresolved" | "unverifiable_source";
  checked_at: string;
  detail: string;
}

export interface DraftReference {
  id: string;
  tradition: string;
  work: string;
  citation: string;
  locator: DraftLocator;
  source_system: string;
  role: string;
  note?: string;
  verification: DraftVerification;
}

export interface DraftSection {
  id: string;
  type: string;
  heading: string;
  body: string;
  ref_ids: string[];
}

export interface Draft {
  id: string;
  event_id: string;
  event_title: string;
  religion_id: string;
  review_status: DraftReviewStatus;
  model: string;
  generated_at: string;
  story: { sections: DraftSection[] };
  references: DraftReference[];
  // Human-readable notes about what was dropped/flagged during drafting +
  // verification, so a reviewer knows where to look.
  flags: string[];
  retrieval: { candidate_count: number; retrieved_count: number };
}

// A single retrievable candidate passage supplied to the pipeline (or read off
// an event's existing references). Same shape as a scripture reference minus the
// generated verification.
export interface CandidatePassage {
  tradition: string;
  work?: string;
  citation: string;
  locator: DraftLocator;
  source_system: string;
  role?: string;
  note?: string;
}
