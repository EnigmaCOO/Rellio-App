/**
 * Sacred Map event migration — run with `npx tsx scripts/migrate-sacred-events.ts`
 *
 * One-time, idempotent upgrade of client/public/data/events.json to the deep-content
 * shape (see client/src/features/sacred-map/types.ts):
 *
 *   1. For every event that lacks them, add the additive deep-content fields:
 *        - story:          { sections: [ ...one "overview" section from `description`... ] }
 *        - references:     []
 *        - media:          []
 *        - related_books:  []
 *        - review_status:  "draft_unreviewed"
 *      The existing `description` is COPIED into the overview section; it is never
 *      deleted or rewritten. No other existing field is touched.
 *
 *   2. Merge the fully-expanded example events (events.deep-example.json) by id —
 *      each replaces the matching stub in events.json.
 *
 * Idempotent: re-running makes no further changes. Events that already carry a
 * `story` are left as-is in step 1, and the deep-example merge is a deterministic
 * replace-by-id.
 */

import { fileURLToPath } from "url";
import * as fs from "fs";
import * as path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, "..", "client", "public", "data");
const EVENTS_PATH = path.join(DATA_DIR, "events.json");
const DEEP_EXAMPLE_PATH = path.join(DATA_DIR, "events.deep-example.json");

interface AnyEvent {
  id: string;
  description?: string;
  story?: unknown;
  references?: unknown;
  media?: unknown;
  related_books?: unknown;
  review_status?: unknown;
  [key: string]: unknown;
}

interface EventsFile {
  events: AnyEvent[];
  _comment?: string;
  [key: string]: unknown;
}

function readJson<T>(filePath: string): T {
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw) as T;
}

function buildOverviewStory(description: string) {
  return {
    sections: [
      {
        id: "s_overview",
        type: "overview",
        heading: "Overview",
        body: description ?? "",
        ref_ids: [] as string[],
      },
    ],
  };
}

/** Add empty/default deep-content fields only where they are missing. */
function ensureDeepFields(event: AnyEvent): { event: AnyEvent; changed: boolean } {
  let changed = false;

  if (event.story === undefined) {
    event.story = buildOverviewStory(typeof event.description === "string" ? event.description : "");
    changed = true;
  }
  if (event.references === undefined) {
    event.references = [];
    changed = true;
  }
  if (event.media === undefined) {
    event.media = [];
    changed = true;
  }
  if (event.related_books === undefined) {
    event.related_books = [];
    changed = true;
  }
  if (event.review_status === undefined) {
    event.review_status = "draft_unreviewed";
    changed = true;
  }

  return { event, changed };
}

function main(): void {
  const eventsFile = readJson<EventsFile>(EVENTS_PATH);
  if (!Array.isArray(eventsFile.events)) {
    throw new Error(`Malformed events.json: missing "events" array at ${EVENTS_PATH}`);
  }

  let stubbedCount = 0;
  for (const event of eventsFile.events) {
    const { changed } = ensureDeepFields(event);
    if (changed) stubbedCount += 1;
  }

  // Merge fully-expanded example events by id (each replaces the matching stub).
  let mergedCount = 0;
  const missingIds: string[] = [];
  if (fs.existsSync(DEEP_EXAMPLE_PATH)) {
    const deepFile = readJson<EventsFile>(DEEP_EXAMPLE_PATH);
    const deepEvents = Array.isArray(deepFile.events) ? deepFile.events : [];

    for (const deep of deepEvents) {
      const idx = eventsFile.events.findIndex((e) => e.id === deep.id);
      if (idx === -1) {
        missingIds.push(deep.id);
        continue;
      }
      eventsFile.events[idx] = deep;
      mergedCount += 1;
    }
  } else {
    console.warn(`No deep-example file at ${DEEP_EXAMPLE_PATH}; skipping merge step.`);
  }

  fs.writeFileSync(EVENTS_PATH, JSON.stringify(eventsFile, null, 2) + "\n", "utf-8");

  console.log("Sacred Map event migration complete.");
  console.log(`  Total events:            ${eventsFile.events.length}`);
  console.log(`  Stubbed with deep fields: ${stubbedCount}`);
  console.log(`  Merged from deep example: ${mergedCount}`);
  if (missingIds.length > 0) {
    console.warn(`  Deep-example ids not found in events.json: ${missingIds.join(", ")}`);
  }
}

main();
