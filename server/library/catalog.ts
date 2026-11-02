import * as fs from "fs";
import * as path from "path";

export type Tradition =
  | "christianity"
  | "islam"
  | "judaism"
  | "hinduism"
  | "buddhism"
  | "shintoism"
  | "sikhism";

export interface BookCatalogEntry {
  id: string;
  title: string;
  author: string;
  tradition: Tradition;
  traditionLabel: string;
  language: string;
  filename: string;
  description?: string;
  accent: string;
}

const BOOKS_DIR = path.resolve(process.cwd(), "server/books");

const RAW: Omit<BookCatalogEntry, "filename" | "language" | "traditionLabel">[] = [
  {
    id: "bhagavad-gita-as-it-is",
    title: "Bhagavad Gita",
    author: "",
    tradition: "hinduism",
    description: "The classic translation and purports of Krishna's dialogue with Arjuna.",
    accent: "from-amber-200 via-orange-300 to-rose-400",
  },
  {
    id: "the-four-vedas",
    title: "The Vedas",
    author: "",
    tradition: "hinduism",
    description: "Rig, Yajur, Sāma and Atharva — the foundational śruti of Sanātana Dharma.",
    accent: "from-yellow-200 via-amber-300 to-orange-500",
  },
  {
    id: "upanishads-roebuck",
    title: "The Upanishads",
    author: "",
    tradition: "hinduism",
    description: "Mystical philosophical dialogues on the Self, Brahman, and liberation.",
    accent: "from-rose-200 via-amber-200 to-yellow-300",
  },
  {
    id: "dhammapada-carter",
    title: "The Dhammapada",
    author: "",
    tradition: "buddhism",
    description: "423 verses of the Buddha's path of awakening.",
    accent: "from-amber-300 via-orange-400 to-red-500",
  },
  {
    id: "kjv-illustrated",
    title: "The Holy Bible (KJV)",
    author: "",
    tradition: "christianity",
    description: "The full Old and New Testament in the iconic 1611 translation.",
    accent: "from-blue-300 via-indigo-400 to-purple-500",
  },
  {
    id: "scofield-reference-bible",
    title: "The Holy Bible (Scofield)",
    author: "",
    tradition: "christianity",
    description: "Annotated reference Bible with dispensational notes and cross-references.",
    accent: "from-sky-300 via-blue-400 to-indigo-500",
  },
  {
    id: "psalms-vangemeren",
    title: "The Book of Psalms",
    author: "",
    tradition: "christianity",
    description: "Devotional and scholarly commentary on the book of Psalms.",
    accent: "from-cyan-200 via-sky-300 to-blue-400",
  },
  {
    id: "tanakh",
    title: "Tanakh",
    author: "",
    tradition: "judaism",
    description: "Torah, Nevi'im, and Ketuvim — the complete Hebrew canon.",
    accent: "from-slate-300 via-blue-400 to-indigo-600",
  },
  {
    id: "torah-abram",
    title: "Torah",
    author: "",
    tradition: "judaism",
    description: "The Five Books of Moses — Bereshit through Devarim.",
    accent: "from-blue-200 via-indigo-300 to-violet-500",
  },
  {
    id: "talmud",
    title: "The Talmud",
    author: "",
    tradition: "judaism",
    description: "Centuries of rabbinic discussion on law, ethics, and lore.",
    accent: "from-indigo-300 via-violet-400 to-purple-600",
  },
  {
    id: "clear-quran",
    title: "The Holy Quran",
    author: "",
    tradition: "islam",
    description: "Approachable thematic English rendering of the Holy Qur'an.",
    accent: "from-emerald-300 via-teal-400 to-cyan-500",
  },
  {
    id: "sahih-al-bukhari",
    title: "Sahih Al-Bukhari",
    author: "",
    tradition: "islam",
    description: "The most authoritative collection of Prophetic traditions.",
    accent: "from-green-300 via-emerald-400 to-teal-600",
  },
  {
    id: "sahih-muslim",
    title: "Sahih Muslim",
    author: "",
    tradition: "islam",
    description: "The companion canonical hadith collection alongside al-Bukhārī.",
    accent: "from-teal-300 via-green-400 to-emerald-600",
  },
  {
    id: "kojiki",
    title: "Kojiki",
    author: "",
    tradition: "shintoism",
    description: "The oldest surviving chronicle of Japan — myths of the kami, creation, and the imperial line.",
    accent: "from-rose-200 via-amber-200 to-yellow-300",
  },
  {
    id: "guru-granth-sahib",
    title: "Shri Guru Granth Sahib",
    author: "",
    tradition: "sikhism",
    description: "The eternal living Guru of the Sikhs — devotional hymns of universal love and oneness.",
    accent: "from-orange-300 via-amber-400 to-yellow-500",
  },
];

const TRADITION_LABELS: Record<Tradition, string> = {
  christianity: "Christianity",
  islam: "Islam",
  judaism: "Judaism",
  hinduism: "Hinduism",
  buddhism: "Buddhism",
  shintoism: "Shintoism",
  sikhism: "Sikhism",
};

const FILENAME_HINTS: Record<string, string> = {
  "bhagavad-gita-as-it-is": "Bhagavad",
  "the-four-vedas": "Four_Vedas",
  "upanishads-roebuck": "Upanishads",
  "dhammapada-carter": "Dhammapada",
  "kjv-illustrated": "King_James",
  "scofield-reference-bible": "Scofield",
  "psalms-vangemeren": "Psalms",
  tanakh: "Tanakh",
  "torah-abram": "Torah_(Simon",
  talmud: "Talmud",
  "clear-quran": "Clear_Quran",
  "sahih-al-bukhari": "Bukhari",
  "sahih-muslim": "Sahih_Muslim",
  kojiki: "Kojiki",
  "guru-granth-sahib": "Granth",
};

let cache: BookCatalogEntry[] | null = null;

export function loadCatalog(): BookCatalogEntry[] {
  if (cache) return cache;
  const files = fs.existsSync(BOOKS_DIR) ? fs.readdirSync(BOOKS_DIR) : [];
  const epubs = files.filter((f) => f.toLowerCase().endsWith(".epub"));

  const built: BookCatalogEntry[] = [];
  for (const entry of RAW) {
    const hint = FILENAME_HINTS[entry.id];
    const match = epubs.find((f) => f.toLowerCase().includes(hint.toLowerCase()));
    if (!match) {
      console.warn(`[library] No EPUB found for ${entry.id} (hint: ${hint})`);
      continue;
    }
    built.push({
      ...entry,
      traditionLabel: TRADITION_LABELS[entry.tradition],
      language: "en",
      filename: match,
    });
  }
  cache = built;
  return built;
}

export function getBook(id: string): BookCatalogEntry | undefined {
  return loadCatalog().find((b) => b.id === id);
}

export function bookFilePath(id: string): string | null {
  const book = getBook(id);
  if (!book) return null;
  return path.join(BOOKS_DIR, book.filename);
}
