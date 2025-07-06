import { Religion } from "@shared/schema";

export interface ExternalScripture {
  religion: Religion;
  book: string;
  chapter: number;
  verse: number;
  text: string;
  translation?: string;
}

// Bible API using github.com/wldeh/bible-api
export async function fetchBibleContent(book: string, chapter: number): Promise<ExternalScripture[]> {
  try {
    const response = await fetch(`https://bible-api.com/${book}+${chapter}`);
    
    if (!response.ok) {
      throw new Error(`Bible API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.verses || !Array.isArray(data.verses)) {
      return [];
    }
    
    return data.verses.map((verse: any, index: number) => ({
      religion: 'bible' as Religion,
      book: data.reference?.split(' ')[0] || book,
      chapter: chapter,
      verse: verse.verse || index + 1,
      text: verse.text || '',
      translation: data.translation_name || 'KJV'
    }));
  } catch (error) {
    console.error('Error fetching Bible content:', error);
    return [];
  }
}

// Bhagavad Gita content from local JSON file
export async function getBhagavadGitaContent(chapter: number): Promise<ExternalScripture[]> {
  try {
    const fs = require('fs');
    const path = require('path');
    
    const gitaPath = path.join(__dirname, '../data/bhagavad_gita.json');
    const gitaData = JSON.parse(fs.readFileSync(gitaPath, 'utf8'));
    
    const chapterData = gitaData.chapters.find((ch: any) => ch.chapter === chapter);
    
    if (!chapterData || !chapterData.verses) {
      return [];
    }
    
    return chapterData.verses.map((verse: any) => ({
      religion: 'hindu' as Religion,
      book: 'Bhagavad Gita',
      chapter: chapter,
      verse: verse.verse,
      text: `${verse.sanskrit}\n\n${verse.english}`,
      translation: 'Sanskrit with English Translation'
    }));
  } catch (error) {
    console.error('Error loading Bhagavad Gita content:', error);
    return [];
  }
}

// Quran API using alquran.cloud/api
export async function fetchQuranContent(surah: number, startVerse: number = 1, endVerse?: number): Promise<ExternalScripture[]> {
  try {
    const response = await fetch(`https://api.alquran.cloud/v1/surah/${surah}/en.asad`);
    
    if (!response.ok) {
      throw new Error(`Quran API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.data || !data.data.ayahs || !Array.isArray(data.data.ayahs)) {
      return [];
    }
    
    // For Quran, return all verses in the surah (pagination handled client-side)
    const ayahs = data.data.ayahs;
    const filteredAyahs = endVerse 
      ? ayahs.slice(startVerse - 1, endVerse)
      : ayahs; // Return all verses for client-side pagination
    
    return filteredAyahs.map((ayah: any) => ({
      religion: 'quran' as Religion,
      book: data.data.englishName || data.data.name || 'Quran',
      chapter: 1, // Always 1 for Quran since each surah is treated as a book
      verse: ayah.numberInSurah || 1,
      text: ayah.text || '',
      translation: 'English - Muhammad Asad'
    }));
  } catch (error) {
    console.error('Error fetching Quran content:', error);
    return [];
  }
}

// Torah API using sefaria.org/api
export async function fetchTorahContent(book: string, chapter: number): Promise<ExternalScripture[]> {
  try {
    const response = await fetch(`https://www.sefaria.org/api/texts/${book}.${chapter}?lang=en`);
    
    if (!response.ok) {
      throw new Error(`Torah API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.text || !Array.isArray(data.text)) {
      return [];
    }
    
    return data.text.map((verse: string, index: number) => {
      // Clean the text by removing footnotes (usually marked with <i>, </i>, or numbered references)
      let cleanedText = verse || '';
      
      // Remove HTML tags
      cleanedText = cleanedText.replace(/<[^>]*>/g, '');
      
      // Remove footnote references (numbers in parentheses, square brackets, or standalone numbers)
      cleanedText = cleanedText.replace(/\(\d+\)/g, '');
      cleanedText = cleanedText.replace(/\[\d+\]/g, '');
      cleanedText = cleanedText.replace(/\b\d+\s*$/, ''); // Remove trailing numbers
      
      // Remove extra whitespace and clean up
      cleanedText = cleanedText.replace(/\s+/g, ' ').trim();
      
      return {
        religion: 'torah' as Religion,
        book: book,
        chapter: chapter,
        verse: index + 1,
        text: cleanedText,
        translation: 'English'
      };
    });
  } catch (error) {
    console.error('Error fetching Torah content:', error);
    return [];
  }
}

// Tripitaka - Local sample content as requested
export function getTripitakaContent(book: string, chapter: number): ExternalScripture[] {
  const sampleContent = {
    'Dhammapada': {
      1: [
        "All that we are is the result of what we have thought: it is founded on our thoughts, it is made up of our thoughts.",
        "If a man speaks or acts with an evil thought, pain follows him, as the wheel follows the foot of the ox that draws the carriage.",
        "If a man speaks or acts with a pure thought, happiness follows him, like a shadow that never leaves him.",
        "Look upon the world as a bubble, look upon it as a mirage: one who looks upon the world in this way the king of death does not see."
      ]
    },
    'Lotus Sutra': {
      1: [
        "At that time the World-Honored One calmly arose from his samadhi and addressed Shariputra.",
        "The wisdom of the Buddhas is infinitely profound and immeasurable.",
        "The door to this wisdom is difficult to understand and difficult to enter.",
        "Not even the voice-hearers or pratyekabuddhas can comprehend it."
      ]
    },
    'Sutta Pitaka': {
      1: [
        "Thus have I heard: At one time the Buddha was staying at Jetavana monastery in Savatthi.",
        "There the Buddha addressed the monks: 'Monks, I will teach you the Four Noble Truths.'",
        "What are the Four Noble Truths? The truth of suffering, the truth of the cause of suffering, the truth of the cessation of suffering, and the truth of the path leading to the cessation of suffering.",
        "This is the First Noble Truth: Life is suffering. Birth is suffering, aging is suffering, illness is suffering, death is suffering."
      ]
    },
    'Vinaya Pitaka': {
      1: [
        "At that time the Buddha was staying in the Bamboo Grove near Rajagaha.",
        "The Buddha said to the monks: 'I will now establish the rules of conduct for the monastic community.'",
        "These rules are for the benefit of the community, for the comfort of the community, for the restraint of the ill-behaved.",
        "Listen well and remember these precepts, for they lead to the end of suffering."
      ]
    }
  };
  
  const content = sampleContent[book as keyof typeof sampleContent];
  if (!content || !content[chapter as keyof typeof content]) {
    return [];
  }
  
  const verses = content[chapter as keyof typeof content];
  return verses.map((text: string, index: number) => ({
    religion: 'buddhist' as Religion,
    book: book,
    chapter: chapter,
    verse: index + 1,
    text: text,
    translation: 'English'
  }));
}

// Main function to fetch scripture content based on religion
export async function fetchScriptureContent(
  religion: Religion,
  book: string,
  chapter: number
): Promise<ExternalScripture[]> {
  switch (religion) {
    case 'bible':
      return await fetchBibleContent(book, chapter);
    
    case 'hindu':
      return await getBhagavadGitaContent(chapter);
    
    case 'quran':
      // Extract surah number from book name (format: "Name (Translation)" -> get index + 1)
      const quranBooks = [
        "Al-Fatihah (The Opening)", "Al-Baqarah (The Cow)", "Al-Imran (Family of Imran)", 
        "An-Nisa (The Women)", "Al-Maidah (The Table)", "Al-An'am (The Cattle)", 
        "Al-A'raf (The Heights)", "Al-Anfal (The Spoils of War)", "At-Tawbah (The Repentance)", 
        "Yunus (Jonah)", "Hud (Hud)", "Yusuf (Joseph)", "Ar-Ra'd (The Thunder)", 
        "Ibrahim (Abraham)", "Al-Hijr (The Rocky Tract)", "An-Nahl (The Bee)", 
        "Al-Isra (The Night Journey)", "Al-Kahf (The Cave)", "Maryam (Mary)", 
        "Ta-Ha (Ta-Ha)", "Al-Anbiya (The Prophets)", "Al-Hajj (The Pilgrimage)", 
        "Al-Mu'minun (The Believers)", "An-Nur (The Light)", "Al-Furqan (The Criterion)", 
        "Ash-Shu'ara (The Poets)", "An-Naml (The Ant)", "Al-Qasas (The Stories)", 
        "Al-Ankabut (The Spider)", "Ar-Rum (The Romans)", "Luqman (Luqman)", 
        "As-Sajdah (The Prostration)", "Al-Ahzab (The Clans)", "Saba (Sheba)", 
        "Fatir (Originator)", "Ya-Sin (Ya Sin)", "As-Saffat (Those Who Set The Ranks)", 
        "Sad (The Letter Sad)", "Az-Zumar (The Troops)", "Ghafir (The Forgiver)", 
        "Fussilat (Explained In Detail)", "Ash-Shura (The Consultation)", 
        "Az-Zukhruf (The Ornaments of Gold)", "Ad-Dukhan (The Smoke)", 
        "Al-Jathiyah (The Crouching)", "Al-Ahqaf (The Wind-Curved Sandhills)", 
        "Muhammad (Muhammad)", "Al-Fath (The Victory)", "Al-Hujurat (The Rooms)", 
        "Qaf (The Letter Qaf)", "Adh-Dhariyat (The Winnowing Winds)", "At-Tur (The Mount)", 
        "An-Najm (The Star)", "Al-Qamar (The Moon)", "Ar-Rahman (The Beneficent)", 
        "Al-Waqi'ah (The Inevitable)", "Al-Hadid (The Iron)", "Al-Mujadilah (The Pleading Woman)", 
        "Al-Hashr (The Exile)", "Al-Mumtahanah (She That Is To Be Examined)", 
        "As-Saff (The Ranks)", "Al-Jumu'ah (The Congregation)", "Al-Munafiqun (The Hypocrites)", 
        "At-Taghabun (The Mutual Disillusion)", "At-Talaq (The Divorce)", 
        "At-Tahrim (The Prohibition)", "Al-Mulk (The Sovereignty)", "Al-Qalam (The Pen)", 
        "Al-Haqqah (The Reality)", "Al-Ma'arij (The Ascending Stairways)", "Nuh (Noah)", 
        "Al-Jinn (The Jinn)", "Al-Muzzammil (The Enshrouded One)", "Al-Muddaththir (The Cloaked One)", 
        "Al-Qiyamah (The Resurrection)", "Al-Insan (The Man)", "Al-Mursalat (The Emissaries)", 
        "An-Naba (The Tidings)", "An-Nazi'at (Those Who Drag Forth)", "Abasa (He Frowned)", 
        "At-Takwir (The Overthrowing)", "Al-Infitar (The Cleaving)", "Al-Mutaffifin (The Defrauding)", 
        "Al-Inshiqaq (The Sundering)", "Al-Buruj (The Mansions of the Stars)", 
        "At-Tariq (The Morning Star)", "Al-A'la (The Most High)", "Al-Ghashiyah (The Overwhelming)", 
        "Al-Fajr (The Dawn)", "Al-Balad (The City)", "Ash-Shams (The Sun)", "Al-Layl (The Night)", 
        "Ad-Duha (The Morning Hours)", "Ash-Sharh (The Relief)", "At-Tin (The Fig)", 
        "Al-Alaq (The Clot)", "Al-Qadr (The Power)", "Al-Bayyinah (The Clear Proof)", 
        "Az-Zalzalah (The Earthquake)", "Al-Adiyat (The Courser)", "Al-Qari'ah (The Calamity)", 
        "At-Takathur (The Rivalry In World Increase)", "Al-Asr (The Declining Day)", 
        "Al-Humazah (The Traducer)", "Al-Fil (The Elephant)", "Quraysh (Quraysh)", 
        "Al-Ma'un (The Small Kindnesses)", "Al-Kawthar (The Abundance)", 
        "Al-Kafirun (The Disbelievers)", "An-Nasr (The Divine Support)", 
        "Al-Masad (The Palm Fiber)", "Al-Ikhlas (The Sincerity)", "Al-Falaq (The Daybreak)", 
        "An-Nas (The Mankind)"
      ];
      
      const surahNumber = quranBooks.indexOf(book) + 1;
      if (surahNumber === 0) {
        // Fallback: try to match just the Arabic name part
        const arabicName = book.split(' (')[0];
        const fallbackIndex = quranBooks.findIndex(name => name.startsWith(arabicName));
        if (fallbackIndex !== -1) {
          return await fetchQuranContent(fallbackIndex + 1, (chapter - 1) * 10 + 1);
        }
        return await fetchQuranContent(1, (chapter - 1) * 10 + 1);
      }
      // For Quran, use chapter as verse range (every 10 verses is a "chapter")
      return await fetchQuranContent(surahNumber, (chapter - 1) * 10 + 1);
    
    case 'torah':
      return await fetchTorahContent(book, chapter);
    
    case 'buddhist':
      return getTripitakaContent(book, chapter);
    
    default:
      return [];
  }
}