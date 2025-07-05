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
      { name: "Al-Fatihah (The Opening)", chapters: 1 },
      { name: "Al-Baqarah (The Cow)", chapters: 29 },
      { name: "Al-Imran (Family of Imran)", chapters: 20 },
      { name: "An-Nisa (The Women)", chapters: 1 },
      { name: "Al-Maidah (The Table)", chapters: 1 },
      { name: "Al-An'am (The Cattle)", chapters: 1 },
      { name: "Al-A'raf (The Heights)", chapters: 1 },
      { name: "Al-Anfal (The Spoils of War)", chapters: 1 },
      { name: "At-Tawbah (The Repentance)", chapters: 1 },
      { name: "Yunus (Jonah)", chapters: 1 },
      { name: "Hud (Hud)", chapters: 1 },
      { name: "Yusuf (Joseph)", chapters: 1 },
      { name: "Ar-Ra'd (The Thunder)", chapters: 1 },
      { name: "Ibrahim (Abraham)", chapters: 1 },
      { name: "Al-Hijr (The Rocky Tract)", chapters: 1 },
      { name: "An-Nahl (The Bee)", chapters: 1 },
      { name: "Al-Isra (The Night Journey)", chapters: 1 },
      { name: "Al-Kahf (The Cave)", chapters: 1 },
      { name: "Maryam (Mary)", chapters: 1 },
      { name: "Ta-Ha (Ta-Ha)", chapters: 1 },
      { name: "Al-Anbiya (The Prophets)", chapters: 1 },
      { name: "Al-Hajj (The Pilgrimage)", chapters: 1 },
      { name: "Al-Mu'minun (The Believers)", chapters: 1 },
      { name: "An-Nur (The Light)", chapters: 1 },
      { name: "Al-Furqan (The Criterion)", chapters: 1 },
      { name: "Ash-Shu'ara (The Poets)", chapters: 1 },
      { name: "An-Naml (The Ant)", chapters: 1 },
      { name: "Al-Qasas (The Stories)", chapters: 1 },
      { name: "Al-Ankabut (The Spider)", chapters: 1 },
      { name: "Ar-Rum (The Romans)", chapters: 1 },
      { name: "Luqman (Luqman)", chapters: 1 },
      { name: "As-Sajdah (The Prostration)", chapters: 1 },
      { name: "Al-Ahzab (The Clans)", chapters: 1 },
      { name: "Saba (Sheba)", chapters: 1 },
      { name: "Fatir (Originator)", chapters: 1 },
      { name: "Ya-Sin (Ya Sin)", chapters: 1 },
      { name: "As-Saffat (Those Who Set The Ranks)", chapters: 1 },
      { name: "Sad (The Letter Sad)", chapters: 1 },
      { name: "Az-Zumar (The Troops)", chapters: 1 },
      { name: "Ghafir (The Forgiver)", chapters: 1 },
      { name: "Fussilat (Explained In Detail)", chapters: 1 },
      { name: "Ash-Shura (The Consultation)", chapters: 1 },
      { name: "Az-Zukhruf (The Ornaments of Gold)", chapters: 1 },
      { name: "Ad-Dukhan (The Smoke)", chapters: 1 },
      { name: "Al-Jathiyah (The Crouching)", chapters: 1 },
      { name: "Al-Ahqaf (The Wind-Curved Sandhills)", chapters: 1 },
      { name: "Muhammad (Muhammad)", chapters: 1 },
      { name: "Al-Fath (The Victory)", chapters: 1 },
      { name: "Al-Hujurat (The Rooms)", chapters: 1 },
      { name: "Qaf (The Letter Qaf)", chapters: 1 },
      { name: "Adh-Dhariyat (The Winnowing Winds)", chapters: 1 },
      { name: "At-Tur (The Mount)", chapters: 1 },
      { name: "An-Najm (The Star)", chapters: 1 },
      { name: "Al-Qamar (The Moon)", chapters: 1 },
      { name: "Ar-Rahman (The Beneficent)", chapters: 1 },
      { name: "Al-Waqi'ah (The Inevitable)", chapters: 1 },
      { name: "Al-Hadid (The Iron)", chapters: 1 },
      { name: "Al-Mujadilah (The Pleading Woman)", chapters: 1 },
      { name: "Al-Hashr (The Exile)", chapters: 1 },
      { name: "Al-Mumtahanah (She That Is To Be Examined)", chapters: 1 },
      { name: "As-Saff (The Ranks)", chapters: 1 },
      { name: "Al-Jumu'ah (The Congregation)", chapters: 1 },
      { name: "Al-Munafiqun (The Hypocrites)", chapters: 1 },
      { name: "At-Taghabun (The Mutual Disillusion)", chapters: 1 },
      { name: "At-Talaq (The Divorce)", chapters: 1 },
      { name: "At-Tahrim (The Prohibition)", chapters: 1 },
      { name: "Al-Mulk (The Sovereignty)", chapters: 1 },
      { name: "Al-Qalam (The Pen)", chapters: 1 },
      { name: "Al-Haqqah (The Reality)", chapters: 1 },
      { name: "Al-Ma'arij (The Ascending Stairways)", chapters: 1 },
      { name: "Nuh (Noah)", chapters: 1 },
      { name: "Al-Jinn (The Jinn)", chapters: 1 },
      { name: "Al-Muzzammil (The Enshrouded One)", chapters: 1 },
      { name: "Al-Muddaththir (The Cloaked One)", chapters: 1 },
      { name: "Al-Qiyamah (The Resurrection)", chapters: 1 },
      { name: "Al-Insan (The Man)", chapters: 1 },
      { name: "Al-Mursalat (The Emissaries)", chapters: 1 },
      { name: "An-Naba (The Tidings)", chapters: 1 },
      { name: "An-Nazi'at (Those Who Drag Forth)", chapters: 1 },
      { name: "Abasa (He Frowned)", chapters: 1 },
      { name: "At-Takwir (The Overthrowing)", chapters: 1 },
      { name: "Al-Infitar (The Cleaving)", chapters: 1 },
      { name: "Al-Mutaffifin (The Defrauding)", chapters: 1 },
      { name: "Al-Inshiqaq (The Sundering)", chapters: 1 },
      { name: "Al-Buruj (The Mansions of the Stars)", chapters: 1 },
      { name: "At-Tariq (The Morning Star)", chapters: 1 },
      { name: "Al-A'la (The Most High)", chapters: 1 },
      { name: "Al-Ghashiyah (The Overwhelming)", chapters: 1 },
      { name: "Al-Fajr (The Dawn)", chapters: 1 },
      { name: "Al-Balad (The City)", chapters: 1 },
      { name: "Ash-Shams (The Sun)", chapters: 1 },
      { name: "Al-Layl (The Night)", chapters: 1 },
      { name: "Ad-Duha (The Morning Hours)", chapters: 1 },
      { name: "Ash-Sharh (The Relief)", chapters: 1 },
      { name: "At-Tin (The Fig)", chapters: 1 },
      { name: "Al-Alaq (The Clot)", chapters: 1 },
      { name: "Al-Qadr (The Power)", chapters: 1 },
      { name: "Al-Bayyinah (The Clear Proof)", chapters: 1 },
      { name: "Az-Zalzalah (The Earthquake)", chapters: 1 },
      { name: "Al-Adiyat (The Courser)", chapters: 1 },
      { name: "Al-Qari'ah (The Calamity)", chapters: 1 },
      { name: "At-Takathur (The Rivalry In World Increase)", chapters: 1 },
      { name: "Al-Asr (The Declining Day)", chapters: 1 },
      { name: "Al-Humazah (The Traducer)", chapters: 1 },
      { name: "Al-Fil (The Elephant)", chapters: 1 },
      { name: "Quraysh (Quraysh)", chapters: 1 },
      { name: "Al-Ma'un (The Small Kindnesses)", chapters: 1 },
      { name: "Al-Kawthar (The Abundance)", chapters: 1 },
      { name: "Al-Kafirun (The Disbelievers)", chapters: 1 },
      { name: "An-Nasr (The Divine Support)", chapters: 1 },
      { name: "Al-Masad (The Palm Fiber)", chapters: 1 },
      { name: "Al-Ikhlas (The Sincerity)", chapters: 1 },
      { name: "Al-Falaq (The Daybreak)", chapters: 1 },
      { name: "An-Nas (The Mankind)", chapters: 1 }
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
