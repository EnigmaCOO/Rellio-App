// Sacred Map — type definitions.
//
// These model the four source JSON collections (religions, locations, events,
// figures) exactly as they appear in client/public/data, plus the derived
// shapes the globe + timeline UI will consume. No `any` allowed here.

// ---------------------------------------------------------------------------
// Raw source shapes (the JSON files are the source of truth)
// ---------------------------------------------------------------------------

export interface Religion {
  id: string;
  name: string;
  color: string;
  symbol: string;
  adherents_estimate: string;
  origin_region: string;
  founding_period: string;
  central_figure_ids: string[];
  primary_text: string;
  summary: string;
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export type LocationType =
  | "city"
  | "site"
  | "mountain"
  | "shrine"
  | string;

export interface SacredLocation {
  id: string;
  name: string;
  modern_name: string;
  country: string;
  coordinates: Coordinates;
  type: LocationType;
  religion_ids: string[];
  primary_religion_id: string;
  summary: string;
}

// How the UI should label/treat a date. `date.year` is the integer timeline
// anchor (negative = BCE); `date.display` is the human label and must never be
// computed from the number.
export type Precision =
  | "exact"
  | "circa"
  | "traditional"
  | "legendary"
  | "range"
  | "continuous";

export interface EventDate {
  display: string;
  year: number;
  year_end: number | null;
  precision: Precision;
  calendar_note?: string;
}

// ---------------------------------------------------------------------------
// Deep-content shapes (all additive + optional; old events without these still
// validate). Scripture passage TEXT is never stored here — only a structured
// `locator` + `deep_link_id`; the reader fetches the verse live from the
// licensed source and deep-links into it.
// ---------------------------------------------------------------------------

// A narrative section within an event's expanded story.
export type StorySectionType =
  | "overview"
  | "scripture"
  | "context"
  | "significance"
  | string;

export interface StorySection {
  id: string;
  type: StorySectionType;
  heading: string;
  body: string;
  // ids of `references` that back this section (may be empty).
  ref_ids: string[];
}

export interface Story {
  sections: StorySection[];
}

// Structured pointer into a scripture passage. The exact keys vary by tradition
// (e.g. surah/ayah for Qur'an, book/chapter/verse for Bible, nikaya/sutta for
// the Pali Canon), so values are kept generic — never the passage text itself.
export type ScriptureLocator = Record<string, string | number>;

export type ReferenceRole =
  | "primary"
  | "supporting"
  | "parallel-tradition"
  | string;

export interface ScriptureReference {
  id: string;
  tradition: string;
  work: string;
  citation: string;
  locator: ScriptureLocator;
  source_system: string;
  deep_link_id: string;
  role: ReferenceRole;
  note?: string;
}

// A structured source citation. Older events store sources as plain strings, so
// the event field accepts either shape (see SacredEvent.sources).
export interface SacredSource {
  id: string;
  type: string;
  citation: string;
  url: string | null;
}

// A media asset attached to an event. Only assets that carry BOTH a `credit`
// and a `license` are ever displayed (see SacredStory), so those are required;
// everything else is optional. We never store the asset bytes — only a URL.
export interface MediaItem {
  id: string;
  type: "image" | "video" | string;
  url: string;
  thumbnail_url?: string;
  title?: string;
  credit: string;
  license: string;
  source_url?: string;
}

// A further-reading entry. `title` is required (an untitled book is dropped);
// `url` is optional — without it the entry renders as plain text.
export interface RelatedBook {
  id: string;
  title: string;
  author?: string;
  url?: string;
  note?: string;
}

export type ReviewStatus =
  | "draft_unreviewed"
  | "in_review"
  | "reviewed"
  | "published"
  | string;

export interface SacredEvent {
  id: string;
  title: string;
  location_id: string;
  religion_id: string;
  figure_ids: string[];
  category: string;
  date: EventDate;
  significance: number;
  description: string;
  tradition_note: string;
  // Widened from string[] to also allow structured source objects. Existing
  // string-array data remains valid.
  sources: Array<string | SacredSource>;

  // --- Additive, optional deep content ---
  story?: Story;
  references?: ScriptureReference[];
  media?: MediaItem[];
  related_books?: RelatedBook[];
  review_status?: ReviewStatus;
}

export type Historicity =
  | "historical"
  | "traditional"
  | "mythological"
  | string;

export interface Figure {
  id: string;
  name: string;
  religion_ids: string[];
  role: string;
  dates: string;
  historicity: Historicity;
  summary: string;
}

// Raw file envelopes (each JSON file wraps its array plus an optional `_comment`).
export interface ReligionsFile {
  religions: Religion[];
  _comment?: string;
}

export interface LocationsFile {
  locations: SacredLocation[];
  _comment?: string;
}

export interface EventsFile {
  events: SacredEvent[];
  _comment?: string;
}

export interface FiguresFile {
  figures: Figure[];
  _comment?: string;
}

// ---------------------------------------------------------------------------
// Derived shapes (built at runtime by useSacredMap)
// ---------------------------------------------------------------------------

// A figure resolved onto an event for display.
export interface ResolvedFigure {
  name: string;
  role: string;
  historicity: Historicity;
}

// An event enriched with its resolved figures.
export interface EnrichedEvent extends SacredEvent {
  figures: ResolvedFigure[];
}

// One globe marker per location.
export interface GlobePoint {
  id: string;
  name: string;
  modern: string;
  lat: number;
  lng: number;
  color: string;
  religions: string[];
  sig: number;
  minYear: number;
  hasEvents: boolean;
  summary: string;
  events: EnrichedEvent[];
}

// A journey arc between two locations, tagged for timeline filtering.
export interface GlobeArc {
  id: string;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  religionId: string;
  color: string;
  year: number;
}
