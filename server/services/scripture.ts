import { Religion } from "@shared/schema";

export interface ScriptureBook {
  name: string;
  chapters: number;
}

export interface ReligionConfig {
  name: string;
  books: ScriptureBook[];
}

export const RELIGION_CONFIGS: Record<Religion, ReligionConfig> = {
  bible: {
    name: "Holy Bible",
    books: [
      { name: "Genesis", chapters: 50 },
      { name: "Exodus", chapters: 40 },
      { name: "Leviticus", chapters: 27 },
      { name: "Numbers", chapters: 36 },
      { name: "Deuteronomy", chapters: 34 },
      { name: "Joshua", chapters: 24 },
      { name: "Judges", chapters: 21 },
      { name: "Ruth", chapters: 4 },
      { name: "1 Samuel", chapters: 31 },
      { name: "2 Samuel", chapters: 24 },
    ]
  },
  quran: {
    name: "Holy Quran",
    books: [
      { name: "Al-Fatihah", chapters: 1 },
      { name: "Al-Baqarah", chapters: 1 },
      { name: "Al-Imran", chapters: 1 },
      { name: "An-Nisa", chapters: 1 },
      { name: "Al-Maidah", chapters: 1 },
      { name: "Al-An'am", chapters: 1 },
      { name: "Al-A'raf", chapters: 1 },
      { name: "Al-Anfal", chapters: 1 },
    ]
  },
  torah: {
    name: "Torah",
    books: [
      { name: "Bereshit", chapters: 50 },
      { name: "Shemot", chapters: 40 },
      { name: "Vayikra", chapters: 27 },
      { name: "Bamidbar", chapters: 36 },
      { name: "Devarim", chapters: 34 },
    ]
  },
  buddhist: {
    name: "Tripitaka",
    books: [
      { name: "Dhammapada", chapters: 26 },
      { name: "Lotus Sutra", chapters: 28 },
      { name: "Sutta Pitaka", chapters: 34 },
      { name: "Vinaya Pitaka", chapters: 20 },
    ]
  },
  hindu: {
    name: "Bhagavad Gita",
    books: [
      { name: "Bhagavad Gita", chapters: 18 },
      { name: "Upanishads", chapters: 10 },
    ]
  }
};

export function getReligionConfig(religion: Religion): ReligionConfig {
  return RELIGION_CONFIGS[religion];
}

export function getAvailableReligions(): Religion[] {
  return Object.keys(RELIGION_CONFIGS) as Religion[];
}
