// Sacred Map authoring — draft persistence.
//
// Drafts are low-volume authoring artifacts reviewed by a human later, so we
// persist them as a single JSON file on disk (survives restarts) rather than a
// DB table. Only locators are stored — never fetched passage text.

import { promises as fs } from "fs";
import * as path from "path";
import type { Draft, DraftReviewStatus } from "./types";

const DATA_DIR = path.resolve(process.cwd(), "server/data");
const STORE_PATH = path.join(DATA_DIR, "sacred-map-drafts.json");

interface StoreFile {
  drafts: Draft[];
}

async function readStore(): Promise<StoreFile> {
  try {
    const raw = await fs.readFile(STORE_PATH, "utf8");
    const parsed = JSON.parse(raw) as StoreFile;
    if (!parsed || !Array.isArray(parsed.drafts)) return { drafts: [] };
    return parsed;
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException)?.code === "ENOENT") return { drafts: [] };
    throw err;
  }
}

async function writeStore(store: StoreFile): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  // Atomic write: stage to a temp file then rename so a crash mid-write can't
  // corrupt the store.
  const tmp = `${STORE_PATH}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(store, null, 2), "utf8");
  await fs.rename(tmp, STORE_PATH);
}

export async function listDrafts(): Promise<Draft[]> {
  const { drafts } = await readStore();
  return [...drafts].sort((a, b) => b.generated_at.localeCompare(a.generated_at));
}

export async function getDraft(id: string): Promise<Draft | null> {
  const { drafts } = await readStore();
  return drafts.find((d) => d.id === id) ?? null;
}

export async function saveDraft(draft: Draft): Promise<void> {
  const store = await readStore();
  const idx = store.drafts.findIndex((d) => d.id === draft.id);
  if (idx >= 0) store.drafts[idx] = draft;
  else store.drafts.push(draft);
  await writeStore(store);
}

export async function updateDraftStatus(
  id: string,
  status: DraftReviewStatus,
): Promise<Draft | null> {
  const store = await readStore();
  const draft = store.drafts.find((d) => d.id === id);
  if (!draft) return null;
  draft.review_status = status;
  await writeStore(store);
  return draft;
}
