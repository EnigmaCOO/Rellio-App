export type Source = {
  id: string;
  label: string;
  religion: string;
};

export type BookCard = {
  id: string;
  title: string;
  subtitle: string;
  sourceId: string;
};

export type ReligionShelf = {
  id: string;
  label: string;
  emoji: string;
  books: BookCard[];
};

export const ALL_SOURCES: Source[] = [
  { id: "quran",        label: "Quran",           religion: "islam" },
  { id: "hadith",       label: "Hadith",           religion: "islam" },
  { id: "bible",        label: "Bible",            religion: "christianity" },
  { id: "old-testament",label: "Old Testament",    religion: "christianity" },
  { id: "new-testament",label: "New Testament",    religion: "christianity" },
  { id: "torah",        label: "Torah",            religion: "judaism" },
  { id: "tanakh",       label: "Tanakh",           religion: "judaism" },
  { id: "talmud",       label: "Talmud",           religion: "judaism" },
  { id: "bhagavad-gita",label: "Bhagavad Gita",   religion: "hinduism" },
  { id: "vedas",        label: "Vedas",            religion: "hinduism" },
  { id: "upanishads",   label: "Upanishads",       religion: "hinduism" },
  { id: "dhammapada",   label: "Dhammapada",       religion: "buddhism" },
  { id: "tripitaka",    label: "Tripitaka",        religion: "buddhism" },
  { id: "mahayana",     label: "Mahayana Sutras",  religion: "buddhism" },
  { id: "kojiki",            label: "Kojiki",                 religion: "shintoism" },
  { id: "guru-granth-sahib", label: "Shri Guru Granth Sahib", religion: "sikhism" },
];

export const BOOKSHELF: ReligionShelf[] = [
  {
    id: "islam",
    label: "Islam",
    emoji: "☪️",
    books: [
      { id: "quran",         title: "Quran",            subtitle: "Holy Book",     sourceId: "quran" },
      { id: "sahih-bukhari", title: "Sahih al-Bukhari", subtitle: "Hadith",        sourceId: "hadith" },
      { id: "sahih-muslim",  title: "Sahih Muslim",     subtitle: "Hadith",        sourceId: "hadith" },
      { id: "riyad",         title: "Riyad as-Salihin", subtitle: "Hadith",        sourceId: "hadith" },
    ],
  },
  {
    id: "christianity",
    label: "Christianity",
    emoji: "✝️",
    books: [
      { id: "bible",         title: "Bible",            subtitle: "Holy Scripture", sourceId: "bible" },
      { id: "old-testament", title: "Old Testament",    subtitle: "Hebrew Bible",   sourceId: "old-testament" },
      { id: "new-testament", title: "New Testament",    subtitle: "Gospels & Letters", sourceId: "new-testament" },
      { id: "psalms",        title: "Psalms",           subtitle: "Poetry & Praise", sourceId: "bible" },
    ],
  },
  {
    id: "judaism",
    label: "Judaism",
    emoji: "✡️",
    books: [
      { id: "torah",   title: "Torah",   subtitle: "Five Books",    sourceId: "torah" },
      { id: "tanakh",  title: "Tanakh",  subtitle: "Hebrew Bible",  sourceId: "tanakh" },
      { id: "talmud",  title: "Talmud",  subtitle: "Rabbinic Law",  sourceId: "talmud" },
    ],
  },
  {
    id: "hinduism",
    label: "Hinduism",
    emoji: "🕉️",
    books: [
      { id: "gita",       title: "Bhagavad Gita", subtitle: "Sanskrit Epic",   sourceId: "bhagavad-gita" },
      { id: "vedas",      title: "Vedas",         subtitle: "Ancient Hymns",   sourceId: "vedas" },
      { id: "upanishads", title: "Upanishads",    subtitle: "Philosophical",   sourceId: "upanishads" },
    ],
  },
  {
    id: "buddhism",
    label: "Buddhism",
    emoji: "☸️",
    books: [
      { id: "tripitaka", title: "Tripitaka",       subtitle: "Pali Canon",    sourceId: "tripitaka" },
      { id: "dhammapada",title: "Dhammapada",      subtitle: "Verses of Dhamma", sourceId: "dhammapada" },
      { id: "mahayana",  title: "Mahayana Sutras", subtitle: "Greater Vehicle", sourceId: "mahayana" },
    ],
  },
  {
    id: "shintoism",
    label: "Shintoism",
    emoji: "⛩️",
    books: [
      { id: "kojiki", title: "Kojiki", subtitle: "Chronicle of the Kami", sourceId: "kojiki" },
    ],
  },
  {
    id: "sikhism",
    label: "Sikhism",
    emoji: "☬",
    books: [
      { id: "guru-granth-sahib", title: "Shri Guru Granth Sahib", subtitle: "The Eternal Guru", sourceId: "guru-granth-sahib" },
    ],
  },
];

export const SUGGESTED_PROMPTS = [
  "What do the Quran and Bible say about mercy?",
  "Compare forgiveness in Christianity and Islam",
  "What does the Bhagavad Gita say about duty?",
  "Show me teachings on patience across traditions",
  "How does Buddhism view suffering compared to Christianity?",
];
