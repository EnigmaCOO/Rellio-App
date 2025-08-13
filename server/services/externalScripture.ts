import { Religion } from "@shared/schema";
import * as fs from 'fs';
import * as path from 'path';
import { fetchHadithSection, getHadithCollectionByName, HADITH_COLLECTIONS, HadithResponse } from './hadith';

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
    // Get the absolute path to the data file
    const gitaPath = path.resolve(process.cwd(), 'server/data/bhagavad_gita.json');
    console.log('Loading Bhagavad Gita from:', gitaPath);
    
    const gitaData = JSON.parse(fs.readFileSync(gitaPath, 'utf8'));
    console.log(`Found ${gitaData.chapters.length} chapters in Bhagavad Gita data`);
    
    const chapterData = gitaData.chapters.find((ch: any) => ch.number === chapter);
    
    if (!chapterData) {
      console.log(`Chapter ${chapter} not found in Bhagavad Gita data`);
      return [];
    }
    
    console.log(`Loading ${chapterData.verses.length} verses from chapter ${chapter}: ${chapterData.title}`);
    
    // Use the actual verse data from the JSON file
    const verses: ExternalScripture[] = [];
    for (const verseData of chapterData.verses) {
      verses.push({
        religion: 'hindu' as Religion,
        book: 'Bhagavad Gita',
        chapter: chapter,
        verse: verseData.number,
        text: verseData.translation.trim(),  // Show only clean English translation
        translation: 'English Translation'
      });
    }
    
    return verses;
  } catch (error) {
    console.error('Error loading Bhagavad Gita content:', error);
    console.error('Error details:', error instanceof Error ? error.message : String(error));
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
      ],
      2: [
        "Earnestness is the path of immortality, thoughtlessness the path of death.",
        "Those who are earnest do not die, those who are thoughtless are as if dead already.",
        "Those who are advanced in earnestness, having understood this clearly, delight in earnestness and rejoice in the knowledge of the noble ones.",
        "These wise people, meditative, persevering, always possessed of strong powers, attain to nirvana, the highest happiness."
      ],
      3: [
        "As a fletcher makes straight his arrow, a wise man makes straight his trembling and unsteady thought.",
        "As a fish taken from his watery home and thrown on dry ground, our thought trembles all over in order to escape the dominion of Mara.",
        "It is good to tame the mind, which is difficult to hold in and flighty, rushing wherever it listeth; a tamed mind brings happiness.",
        "Let the wise man guard his thoughts, for they are difficult to perceive, very artful, and they rush wherever they list: thoughts well guarded bring happiness."
      ]
    },
    'Lotus Sutra': {
      1: [
        "At that time the World-Honored One calmly arose from his samadhi and addressed Shariputra.",
        "The wisdom of the Buddhas is infinitely profound and immeasurable.",
        "The door to this wisdom is difficult to understand and difficult to enter.",
        "Not even the voice-hearers or pratyekabuddhas can comprehend it."
      ],
      2: [
        "Why is this so? Because a Buddha has personally attained this dharma that is without superior, extremely profound, and difficult to understand.",
        "Only a Buddha together with a Buddha can fathom the Reality of All Existence.",
        "That is to say, its true entity, its nature, its embodiment, its power, its action, its causes, its conditions, its effects, its retributions, and the ultimate state of its beginning and end.",
        "At that time the World-Honored One, wishing to restate this meaning, spoke in verse."
      ]
    },
    'Sutta Pitaka': {
      1: [
        "Thus have I heard: At one time the Buddha was staying at Jetavana monastery in Savatthi.",
        "There the Buddha addressed the monks: 'Monks, I will teach you the Four Noble Truths.'",
        "What are the Four Noble Truths? The truth of suffering, the truth of the cause of suffering, the truth of the cessation of suffering, and the truth of the path leading to the cessation of suffering.",
        "This is the First Noble Truth: Life is suffering. Birth is suffering, aging is suffering, illness is suffering, death is suffering."
      ],
      2: [
        "This is the Second Noble Truth: The cause of suffering is craving, which leads to rebirth, accompanied by delight and lust, seeking pleasure here and there.",
        "This is the Third Noble Truth: The cessation of suffering, which is the relinquishment, the letting go, the giving up, the rejection of this very craving.",
        "This is the Fourth Noble Truth: The path leading to the cessation of suffering, which is the Noble Eightfold Path.",
        "Right understanding, right intention, right speech, right action, right livelihood, right effort, right mindfulness, right concentration."
      ]
    },
    'Vinaya Pitaka': {
      1: [
        "At that time the Buddha was staying in the Bamboo Grove near Rajagaha.",
        "The Buddha said to the monks: 'I will now establish the rules of conduct for the monastic community.'",
        "These rules are for the benefit of the community, for the comfort of the community, for the restraint of the ill-behaved.",
        "Listen well and remember these precepts, for they lead to the end of suffering."
      ],
      2: [
        "A monk should not intentionally deprive a living being of life, not even an ant.",
        "A monk should not take what is not given, not even a blade of grass.",
        "A monk should not engage in sexual activity; he should be completely celibate.",
        "A monk should not speak falsely; he should always speak truthfully and beneficially."
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

// Hadith API Integration
export async function fetchHadithContent(book: string, chapter: number): Promise<ExternalScripture[]> {
  try {
    console.log(`Fetching hadith content for book: ${book}, section: ${chapter}`);
    
    const collection = getHadithCollectionByName(book);
    if (!collection) {
      console.log(`Hadith collection '${book}' not found`);
      return [];
    }
    
    console.log(`Found collection: ${collection.name} (ID: ${collection.id})`);
    
    const hadithResponse = await fetchHadithSection(collection.id, chapter);
    if (!hadithResponse || !hadithResponse.hadiths) {
      console.log(`No hadiths found for section ${chapter} in ${collection.name}`);
      return [];
    }
    
    console.log(`Fetched ${hadithResponse.hadiths.length} hadiths from section ${chapter}`);
    
    return hadithResponse.hadiths.map((hadith, index) => ({
      religion: 'hadith' as Religion,
      book: book,
      chapter: chapter,
      verse: hadith.hadithnumber || index + 1,
      text: hadith.text || '',
      translation: `${hadithResponse.metadata.name} - Section: ${hadithResponse.metadata.section[chapter] || 'Unknown'}`
    }));
  } catch (error) {
    console.error(`Error fetching hadith content for ${book}, chapter ${chapter}:`, error);
    return [];
  }
}

// Function to get a random hadith from any collection
export async function getRandomHadith(): Promise<ExternalScripture | null> {
  try {
    const randomCollection = HADITH_COLLECTIONS[Math.floor(Math.random() * HADITH_COLLECTIONS.length)];
    const randomHadithNumber = Math.floor(Math.random() * randomCollection.totalHadiths) + 1;
    
    const response = await fetch(`https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/${randomCollection.id}/${randomHadithNumber}.min.json`);
    if (!response.ok) {
      // Try fallback URL
      const fallbackResponse = await fetch(`https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/${randomCollection.id}/${randomHadithNumber}.json`);
      if (!fallbackResponse.ok) {
        throw new Error(`Failed to fetch random hadith: ${response.status}`);
      }
      const data = await fallbackResponse.json();
      return {
        religion: 'hadith' as Religion,
        book: randomCollection.name,
        chapter: 1,
        verse: data.hadithnumber || randomHadithNumber,
        text: data.text || '',
        translation: `${randomCollection.name} - Hadith ${data.hadithnumber || randomHadithNumber}`
      };
    }
    
    const data = await response.json();
    return {
      religion: 'hadith' as Religion,
      book: randomCollection.name,
      chapter: 1,
      verse: data.hadithnumber || randomHadithNumber,
      text: data.text || '',
      translation: `${randomCollection.name} - Hadith ${data.hadithnumber || randomHadithNumber}`
    };
  } catch (error) {
    console.error('Error fetching random hadith:', error);
    return null;
  }
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
          return await fetchQuranContent(fallbackIndex + 1);
        }
        return await fetchQuranContent(1);
      }
      // For Quran, return all verses for the surah (no pagination by chapters)
      return await fetchQuranContent(surahNumber);
    
    case 'torah':
      return await fetchTorahContent(book, chapter);
    
    case 'buddhist':
      return getTripitakaContent(book, chapter);
    
    case 'hadith':
      return await fetchHadithContent(book, chapter);
    
    default:
      return [];
  }
}