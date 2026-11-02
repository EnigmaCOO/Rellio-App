export type Source = {
  id: string;
  label: string;
  religion: string;
};

export const ALL_SOURCES: Source[] = [
  { id: "quran", label: "Quran", religion: "islam" },
  { id: "hadith", label: "Hadith", religion: "islam" },
  { id: "bible", label: "Bible", religion: "christianity" },
  { id: "old-testament", label: "Old Testament", religion: "christianity" },
  { id: "new-testament", label: "New Testament", religion: "christianity" },
  { id: "torah", label: "Torah", religion: "judaism" },
  { id: "tanakh", label: "Tanakh", religion: "judaism" },
  { id: "talmud", label: "Talmud", religion: "judaism" },
  { id: "bhagavad-gita", label: "Bhagavad Gita", religion: "hinduism" },
  { id: "vedas", label: "Vedas", religion: "hinduism" },
  { id: "upanishads", label: "Upanishads", religion: "hinduism" },
  { id: "dhammapada", label: "Dhammapada", religion: "buddhism" },
  { id: "tripitaka", label: "Tripitaka", religion: "buddhism" },
  { id: "mahayana", label: "Mahayana Sutras", religion: "buddhism" },
  { id: "kojiki", label: "Kojiki", religion: "shintoism" },
  { id: "guru-granth-sahib", label: "Shri Guru Granth Sahib", religion: "sikhism" },
];

export const SUPPORTED_RELIGIONS = [
  ...Array.from(new Set(ALL_SOURCES.map((source) => source.religion))),
] as const;

export const RELIGION_LABELS: Record<string, string> = {
  islam: "Islam",
  christianity: "Christianity",
  judaism: "Judaism",
  hinduism: "Hinduism",
  buddhism: "Buddhism",
  shintoism: "Shintoism",
  sikhism: "Sikhism",
};
