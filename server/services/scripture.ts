import { Religion } from "@shared/schema";

export interface ScriptureBook {
  name: string;
  chapters: number;
  section?: string; // Optional section grouping (e.g., "Holy Quran", "Hadith Collections")
}

export interface ReligionConfig {
  name: string;
  books: ScriptureBook[];
}

export const RELIGION_CONFIGS: Record<Religion, ReligionConfig> = {
  christianity: {
    name: "Christianity",
    books: [
      // Old Testament
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
      { name: "1 Kings", chapters: 22 },
      { name: "2 Kings", chapters: 25 },
      { name: "1 Chronicles", chapters: 29 },
      { name: "2 Chronicles", chapters: 36 },
      { name: "Ezra", chapters: 10 },
      { name: "Nehemiah", chapters: 13 },
      { name: "Esther", chapters: 10 },
      { name: "Job", chapters: 42 },
      { name: "Psalms", chapters: 150 },
      { name: "Proverbs", chapters: 31 },
      { name: "Ecclesiastes", chapters: 12 },
      { name: "Song of Solomon", chapters: 8 },
      { name: "Isaiah", chapters: 66 },
      { name: "Jeremiah", chapters: 52 },
      { name: "Lamentations", chapters: 5 },
      { name: "Ezekiel", chapters: 48 },
      { name: "Daniel", chapters: 12 },
      { name: "Hosea", chapters: 14 },
      { name: "Joel", chapters: 3 },
      { name: "Amos", chapters: 9 },
      { name: "Obadiah", chapters: 1 },
      { name: "Jonah", chapters: 4 },
      { name: "Micah", chapters: 7 },
      { name: "Nahum", chapters: 3 },
      { name: "Habakkuk", chapters: 3 },
      { name: "Zephaniah", chapters: 3 },
      { name: "Haggai", chapters: 2 },
      { name: "Zechariah", chapters: 14 },
      { name: "Malachi", chapters: 4 },
      // New Testament
      { name: "Matthew", chapters: 28 },
      { name: "Mark", chapters: 16 },
      { name: "Luke", chapters: 24 },
      { name: "John", chapters: 21 },
      { name: "Acts", chapters: 28 },
      { name: "Romans", chapters: 16 },
      { name: "1 Corinthians", chapters: 16 },
      { name: "2 Corinthians", chapters: 13 },
      { name: "Galatians", chapters: 6 },
      { name: "Ephesians", chapters: 6 },
      { name: "Philippians", chapters: 4 },
      { name: "Colossians", chapters: 4 },
      { name: "1 Thessalonians", chapters: 5 },
      { name: "2 Thessalonians", chapters: 3 },
      { name: "1 Timothy", chapters: 6 },
      { name: "2 Timothy", chapters: 4 },
      { name: "Titus", chapters: 3 },
      { name: "Philemon", chapters: 1 },
      { name: "Hebrews", chapters: 13 },
      { name: "James", chapters: 5 },
      { name: "1 Peter", chapters: 5 },
      { name: "2 Peter", chapters: 3 },
      { name: "1 John", chapters: 5 },
      { name: "2 John", chapters: 1 },
      { name: "3 John", chapters: 1 },
      { name: "Jude", chapters: 1 },
      { name: "Revelation", chapters: 22 }
    ]
  },
  islam: {
    name: "Islam",
    books: [
      // Holy Quran
      { name: "Al-Fatihah (The Opening)", chapters: 1, section: "Holy Quran" },
      { name: "Al-Baqarah (The Cow)", chapters: 1, section: "Holy Quran" },
      { name: "Al-Imran (Family of Imran)", chapters: 1, section: "Holy Quran" },
      { name: "An-Nisa (The Women)", chapters: 1, section: "Holy Quran" },
      { name: "Al-Maidah (The Table)", chapters: 1, section: "Holy Quran" },
      { name: "Al-An'am (The Cattle)", chapters: 1, section: "Holy Quran" },
      { name: "Al-A'raf (The Heights)", chapters: 1, section: "Holy Quran" },
      { name: "Al-Anfal (The Spoils of War)", chapters: 1, section: "Holy Quran" },
      { name: "At-Tawbah (The Repentance)", chapters: 1, section: "Holy Quran" },
      { name: "Yunus (Jonah)", chapters: 1, section: "Holy Quran" },
      { name: "Hud (Hud)", chapters: 1, section: "Holy Quran" },
      { name: "Yusuf (Joseph)", chapters: 1, section: "Holy Quran" },
      { name: "Ar-Ra'd (The Thunder)", chapters: 1, section: "Holy Quran" },
      { name: "Ibrahim (Abraham)", chapters: 1, section: "Holy Quran" },
      { name: "Al-Hijr (The Rocky Tract)", chapters: 1, section: "Holy Quran" },
      { name: "An-Nahl (The Bee)", chapters: 1, section: "Holy Quran" },
      { name: "Al-Isra (The Night Journey)", chapters: 1, section: "Holy Quran" },
      { name: "Al-Kahf (The Cave)", chapters: 1, section: "Holy Quran" },
      { name: "Maryam (Mary)", chapters: 1, section: "Holy Quran" },
      { name: "Ta-Ha (Ta-Ha)", chapters: 1, section: "Holy Quran" },
      { name: "Al-Anbiya (The Prophets)", chapters: 1, section: "Holy Quran" },
      { name: "Al-Hajj (The Pilgrimage)", chapters: 1, section: "Holy Quran" },
      { name: "Al-Mu'minun (The Believers)", chapters: 1, section: "Holy Quran" },
      { name: "An-Nur (The Light)", chapters: 1, section: "Holy Quran" },
      { name: "Al-Furqan (The Criterion)", chapters: 1, section: "Holy Quran" },
      { name: "Ash-Shu'ara (The Poets)", chapters: 1, section: "Holy Quran" },
      { name: "An-Naml (The Ant)", chapters: 1, section: "Holy Quran" },
      { name: "Al-Qasas (The Stories)", chapters: 1, section: "Holy Quran" },
      { name: "Al-Ankabut (The Spider)", chapters: 1, section: "Holy Quran" },
      { name: "Ar-Rum (The Romans)", chapters: 1, section: "Holy Quran" },
      { name: "Luqman (Luqman)", chapters: 1, section: "Holy Quran" },
      { name: "As-Sajdah (The Prostration)", chapters: 1, section: "Holy Quran" },
      { name: "Al-Ahzab (The Clans)", chapters: 1, section: "Holy Quran" },
      { name: "Saba (Sheba)", chapters: 1, section: "Holy Quran" },
      { name: "Fatir (Originator)", chapters: 1, section: "Holy Quran" },
      { name: "Ya-Sin (Ya Sin)", chapters: 1, section: "Holy Quran" },
      { name: "As-Saffat (Those Who Set The Ranks)", chapters: 1, section: "Holy Quran" },
      { name: "Sad (The Letter Sad)", chapters: 1, section: "Holy Quran" },
      { name: "Az-Zumar (The Troops)", chapters: 1, section: "Holy Quran" },
      { name: "Ghafir (The Forgiver)", chapters: 1, section: "Holy Quran" },
      { name: "Fussilat (Explained In Detail)", chapters: 1, section: "Holy Quran" },
      { name: "Ash-Shura (The Consultation)", chapters: 1, section: "Holy Quran" },
      { name: "Az-Zukhruf (The Ornaments of Gold)", chapters: 1, section: "Holy Quran" },
      { name: "Ad-Dukhan (The Smoke)", chapters: 1, section: "Holy Quran" },
      { name: "Al-Jathiyah (The Crouching)", chapters: 1, section: "Holy Quran" },
      { name: "Al-Ahqaf (The Wind-Curved Sandhills)", chapters: 1, section: "Holy Quran" },
      { name: "Muhammad (Muhammad)", chapters: 1, section: "Holy Quran" },
      { name: "Al-Fath (The Victory)", chapters: 1, section: "Holy Quran" },
      { name: "Al-Hujurat (The Rooms)", chapters: 1, section: "Holy Quran" },
      { name: "Qaf (The Letter Qaf)", chapters: 1, section: "Holy Quran" },
      { name: "Adh-Dhariyat (The Winnowing Winds)", chapters: 1, section: "Holy Quran" },
      { name: "At-Tur (The Mount)", chapters: 1, section: "Holy Quran" },
      { name: "An-Najm (The Star)", chapters: 1, section: "Holy Quran" },
      { name: "Al-Qamar (The Moon)", chapters: 1, section: "Holy Quran" },
      { name: "Ar-Rahman (The Beneficent)", chapters: 1, section: "Holy Quran" },
      { name: "Al-Waqi'ah (The Inevitable)", chapters: 1, section: "Holy Quran" },
      { name: "Al-Hadid (The Iron)", chapters: 1, section: "Holy Quran" },
      { name: "Al-Mujadilah (The Pleading Woman)", chapters: 1, section: "Holy Quran" },
      { name: "Al-Hashr (The Exile)", chapters: 1, section: "Holy Quran" },
      { name: "Al-Mumtahanah (She That Is To Be Examined)", chapters: 1, section: "Holy Quran" },
      { name: "As-Saff (The Ranks)", chapters: 1, section: "Holy Quran" },
      { name: "Al-Jumu'ah (The Congregation)", chapters: 1, section: "Holy Quran" },
      { name: "Al-Munafiqun (The Hypocrites)", chapters: 1, section: "Holy Quran" },
      { name: "At-Taghabun (The Mutual Disillusion)", chapters: 1, section: "Holy Quran" },
      { name: "At-Talaq (The Divorce)", chapters: 1, section: "Holy Quran" },
      { name: "At-Tahrim (The Prohibition)", chapters: 1, section: "Holy Quran" },
      { name: "Al-Mulk (The Sovereignty)", chapters: 1, section: "Holy Quran" },
      { name: "Al-Qalam (The Pen)", chapters: 1, section: "Holy Quran" },
      { name: "Al-Haqqah (The Reality)", chapters: 1, section: "Holy Quran" },
      { name: "Al-Ma'arij (The Ascending Stairways)", chapters: 1, section: "Holy Quran" },
      { name: "Nuh (Noah)", chapters: 1, section: "Holy Quran" },
      { name: "Al-Jinn (The Jinn)", chapters: 1, section: "Holy Quran" },
      { name: "Al-Muzzammil (The Enshrouded One)", chapters: 1, section: "Holy Quran" },
      { name: "Al-Muddaththir (The Cloaked One)", chapters: 1, section: "Holy Quran" },
      { name: "Al-Qiyamah (The Resurrection)", chapters: 1, section: "Holy Quran" },
      { name: "Al-Insan (The Man)", chapters: 1, section: "Holy Quran" },
      { name: "Al-Mursalat (The Emissaries)", chapters: 1, section: "Holy Quran" },
      { name: "An-Naba (The Tidings)", chapters: 1, section: "Holy Quran" },
      { name: "An-Nazi'at (Those Who Drag Forth)", chapters: 1, section: "Holy Quran" },
      { name: "Abasa (He Frowned)", chapters: 1, section: "Holy Quran" },
      { name: "At-Takwir (The Overthrowing)", chapters: 1, section: "Holy Quran" },
      { name: "Al-Infitar (The Cleaving)", chapters: 1, section: "Holy Quran" },
      { name: "Al-Mutaffifin (The Defrauding)", chapters: 1, section: "Holy Quran" },
      { name: "Al-Inshiqaq (The Sundering)", chapters: 1, section: "Holy Quran" },
      { name: "Al-Buruj (The Mansions of the Stars)", chapters: 1, section: "Holy Quran" },
      { name: "At-Tariq (The Morning Star)", chapters: 1, section: "Holy Quran" },
      { name: "Al-A'la (The Most High)", chapters: 1, section: "Holy Quran" },
      { name: "Al-Ghashiyah (The Overwhelming)", chapters: 1, section: "Holy Quran" },
      { name: "Al-Fajr (The Dawn)", chapters: 1, section: "Holy Quran" },
      { name: "Al-Balad (The City)", chapters: 1, section: "Holy Quran" },
      { name: "Ash-Shams (The Sun)", chapters: 1, section: "Holy Quran" },
      { name: "Al-Layl (The Night)", chapters: 1, section: "Holy Quran" },
      { name: "Ad-Duha (The Morning Hours)", chapters: 1, section: "Holy Quran" },
      { name: "Ash-Sharh (The Relief)", chapters: 1, section: "Holy Quran" },
      { name: "At-Tin (The Fig)", chapters: 1, section: "Holy Quran" },
      { name: "Al-Alaq (The Clot)", chapters: 1, section: "Holy Quran" },
      { name: "Al-Qadr (The Power)", chapters: 1, section: "Holy Quran" },
      { name: "Al-Bayyinah (The Clear Proof)", chapters: 1, section: "Holy Quran" },
      { name: "Az-Zalzalah (The Earthquake)", chapters: 1, section: "Holy Quran" },
      { name: "Al-Adiyat (The Courser)", chapters: 1, section: "Holy Quran" },
      { name: "Al-Qari'ah (The Calamity)", chapters: 1, section: "Holy Quran" },
      { name: "At-Takathur (The Rivalry In World Increase)", chapters: 1, section: "Holy Quran" },
      { name: "Al-Asr (The Declining Day)", chapters: 1, section: "Holy Quran" },
      { name: "Al-Humazah (The Traducer)", chapters: 1, section: "Holy Quran" },
      { name: "Al-Fil (The Elephant)", chapters: 1, section: "Holy Quran" },
      { name: "Quraysh (Quraysh)", chapters: 1, section: "Holy Quran" },
      { name: "Al-Ma'un (The Small Kindnesses)", chapters: 1, section: "Holy Quran" },
      { name: "Al-Kawthar (The Abundance)", chapters: 1, section: "Holy Quran" },
      { name: "Al-Kafirun (The Disbelievers)", chapters: 1, section: "Holy Quran" },
      { name: "An-Nasr (The Divine Support)", chapters: 1, section: "Holy Quran" },
      { name: "Al-Masad (The Palm Fiber)", chapters: 1, section: "Holy Quran" },
      { name: "Al-Ikhlas (The Sincerity)", chapters: 1, section: "Holy Quran" },
      { name: "Al-Falaq (The Daybreak)", chapters: 1, section: "Holy Quran" },
      { name: "An-Nas (The Mankind)", chapters: 1, section: "Holy Quran" },
      
      // Hadith Collections
      { name: "Sahih al-Bukhari", chapters: 97, section: "Hadith Collections" },
      { name: "Sahih Muslim", chapters: 56, section: "Hadith Collections" },
      { name: "Sunan Abu Dawud", chapters: 43, section: "Hadith Collections" },
      { name: "Jami' at-Tirmidhi", chapters: 51, section: "Hadith Collections" },
      { name: "Sunan an-Nasa'i", chapters: 51, section: "Hadith Collections" },
      { name: "Sunan Ibn Majah", chapters: 37, section: "Hadith Collections" }
    ]
  },
  judaism: {
    name: "Judaism",
    books: [
      { name: "Bereshit", chapters: 50 }, // Genesis
      { name: "Shemot", chapters: 40 },   // Exodus
      { name: "Vayikra", chapters: 27 },  // Leviticus
      { name: "Bamidbar", chapters: 36 }, // Numbers
      { name: "Devarim", chapters: 34 },  // Deuteronomy
    ]
  },
  buddhism: {
    name: "Buddhism",
    books: [
      { name: "Dhammapada", chapters: 26 },
      { name: "Lotus Sutra", chapters: 28 },
      { name: "Sutta Pitaka", chapters: 34 },
      { name: "Vinaya Pitaka", chapters: 20 },
    ]
  },
  hinduism: {
    name: "Hinduism",
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
