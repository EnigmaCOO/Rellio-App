/**
 * useReadingPosition — persists the last reading position in localStorage.
 * Enables "continue reading" without backend persistence.
 */

const STORAGE_KEY = "rellio_reading_position";

export interface ReadingPosition {
  religion: string;
  book: string;
  chapter: number;
  timestamp: number;
}

export function saveReadingPosition(pos: Omit<ReadingPosition, "timestamp">) {
  try {
    const entry: ReadingPosition = { ...pos, timestamp: Date.now() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entry));
  } catch {
    // localStorage not available
  }
}

export function loadReadingPosition(): ReadingPosition | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ReadingPosition;
  } catch {
    return null;
  }
}

export function clearReadingPosition() {
  localStorage.removeItem(STORAGE_KEY);
}
