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
      religion: 'islam' as Religion,
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
        religion: 'islam' as Religion,
        book: randomCollection.name,
        chapter: 1,
        verse: data.hadithnumber || randomHadithNumber,
        text: data.text || '',
        translation: `${randomCollection.name} - Hadith ${data.hadithnumber || randomHadithNumber}`
      };
    }
    
    const data = await response.json();
    return {
      religion: 'islam' as Religion,
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
    case 'christianity':
      return await fetchBibleContent(book, chapter);
    
    case 'hinduism':
      return await getBhagavadGitaContent(chapter);
    
    case 'islam':
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
      
      // Check if this is a hadith book within the Islamic collection
      const hadithCollectionNames = ['Sahih al-Bukhari', 'Sahih Muslim', 'Sunan Abu Dawud', 'Jami\' at-Tirmidhi', 'Sunan an-Nasa\'i', 'Sunan Ibn Majah'];
      if (hadithCollectionNames.includes(book)) {
        return await fetchHadithContent(book, chapter);
      }
      
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
    
    case 'judaism':
      return await fetchTorahContent(book, chapter);
    
    case 'buddhism':
      return getTripitakaContent(book, chapter);
    
    default:
      return [];
  }
}

// Theme-based verse search for Compare Mode
export interface ComparisonVerse {
  religion: Religion;
  book: string;
  chapter: number;
  verse: number;
  text: string;
  translation?: string;
  reference: string;
}

export interface ComparisonResult {
  theme: string;
  aiSummary: string;
  verses: {
    [religion: string]: ComparisonVerse[];
  };
}

// Sample verses database for quick theme-based responses
const THEME_VERSES = {
  love: {
    christianity: [
      { book: '1 John', chapter: 4, verse: 8, text: 'Whoever does not love does not know God, because God is love.', reference: '1 John 4:8' },
      { book: '1 Corinthians', chapter: 13, verse: 4, text: 'Love is patient, love is kind. It does not envy, it does not boast, it is not proud.', reference: '1 Corinthians 13:4' },
      { book: 'John', chapter: 3, verse: 16, text: 'For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.', reference: 'John 3:16' },
      { book: 'Romans', chapter: 8, verse: 38, text: 'For I am convinced that neither death nor life, neither angels nor demons, neither the present nor the future, nor any powers, neither height nor depth, nor anything else in all creation, will be able to separate us from the love of God that is in Christ Jesus our Lord.', reference: 'Romans 8:38-39' },
      { book: '1 John', chapter: 4, verse: 19, text: 'We love because he first loved us.', reference: '1 John 4:19' }
    ],
    islam: [
      { book: 'Quran', chapter: 30, verse: 21, text: 'And among His signs is this, that He created for you mates from among yourselves, that you may dwell in tranquillity with them, and He has put love and mercy between your hearts.', reference: 'Quran 30:21' },
      { book: 'Quran', chapter: 2, verse: 165, text: 'But those who believe love Allah more than anything else.', reference: 'Quran 2:165' },
      { book: 'Quran', chapter: 5, verse: 54, text: 'Allah will bring forth a people whom He loves and who love Him.', reference: 'Quran 5:54' },
      { book: 'Quran', chapter: 3, verse: 31, text: 'Say: If you love Allah, follow me; Allah will love you and forgive you your sins.', reference: 'Quran 3:31' },
      { book: 'Quran', chapter: 76, verse: 8, text: 'And they feed, for the love of Allah, the indigent, the orphan, and the captive.', reference: 'Quran 76:8' }
    ],
    judaism: [
      { book: 'Leviticus', chapter: 19, verse: 18, text: 'Love your neighbor as yourself. I am the Lord.', reference: 'Leviticus 19:18' },
      { book: 'Deuteronomy', chapter: 6, verse: 5, text: 'Love the Lord your God with all your heart and with all your soul and with all your strength.', reference: 'Deuteronomy 6:5' },
      { book: 'Song of Songs', chapter: 8, verse: 7, text: 'Many waters cannot quench love; rivers cannot sweep it away.', reference: 'Song of Songs 8:7' },
      { book: 'Psalms', chapter: 136, verse: 1, text: 'Give thanks to the Lord, for he is good. His love endures forever.', reference: 'Psalms 136:1' },
      { book: 'Hosea', chapter: 14, verse: 4, text: 'I will heal their waywardness and love them freely.', reference: 'Hosea 14:4' }
    ],
    hinduism: [
      { book: 'Bhagavad Gita', chapter: 12, verse: 13, text: 'One who is not envious but is a kind friend to all beings, who does not think himself a proprietor and is free from false ego, who is equal in both happiness and distress, who is tolerant, always satisfied, self-controlled, and engaged in devotional service with determination, his mind and intelligence fixed on Me—such a devotee of Mine is very dear to Me.', reference: 'Bhagavad Gita 12:13-14' },
      { book: 'Bhagavad Gita', chapter: 7, verse: 17, text: 'Of these, the one who is in full knowledge and who is always engaged in pure devotional service is the best. For I am very dear to him, and he is dear to Me.', reference: 'Bhagavad Gita 7:17' },
      { book: 'Bhagavad Gita', chapter: 9, verse: 29, text: 'I envy no one, nor am I partial to anyone. I am equal to all. But whoever renders service unto Me in devotion is a friend, is in Me, and I am also a friend to him.', reference: 'Bhagavad Gita 9:29' },
      { book: 'Bhagavad Gita', chapter: 18, verse: 65, text: 'Always think of Me, become My devotee, worship Me and offer your homage unto Me. Thus you will come to Me without fail. I promise you this because you are My very dear friend.', reference: 'Bhagavad Gita 18:65' },
      { book: 'Bhagavad Gita', chapter: 4, verse: 11, text: 'As all surrender unto Me, I reward them accordingly. Everyone follows My path in all respects, O son of Pritha.', reference: 'Bhagavad Gita 4:11' }
    ],
    buddhism: [
      { book: 'Dhammapada', chapter: 1, verse: 5, text: 'Hatred does not cease by hatred, but only by love; this is the eternal rule.', reference: 'Dhammapada 1:5' },
      { book: 'Dhammapada', chapter: 15, verse: 1, text: 'Let us live happily then, not hating those who hate us! Among men who hate us let us dwell free from hatred!', reference: 'Dhammapada 15:1' },
      { book: 'Metta Sutta', chapter: 1, verse: 1, text: 'May all beings be happy and secure, may they be happy-minded.', reference: 'Metta Sutta' },
      { book: 'Lotus Sutra', chapter: 2, verse: 1, text: 'The Buddha-nature is inherently pure and filled with love for all beings.', reference: 'Lotus Sutra 2' },
      { book: 'Dhammapada', chapter: 14, verse: 1, text: 'The awakened give away their love freely, without attachment, seeking nothing in return.', reference: 'Dhammapada 14:1' }
    ]
  },
  compassion: {
    christianity: [
      { book: 'Matthew', chapter: 9, verse: 36, text: 'When he saw the crowds, he had compassion on them, because they were harassed and helpless, like sheep without a shepherd.', reference: 'Matthew 9:36' },
      { book: 'Colossians', chapter: 3, verse: 12, text: 'Therefore, as God\'s chosen people, holy and dearly loved, clothe yourselves with compassion, kindness, humility, gentleness and patience.', reference: 'Colossians 3:12' },
      { book: 'Ephesians', chapter: 4, verse: 32, text: 'Be kind and compassionate to one another, forgiving each other, just as in Christ God forgave you.', reference: 'Ephesians 4:32' },
      { book: 'Luke', chapter: 6, verse: 36, text: 'Be merciful, just as your Father is merciful.', reference: 'Luke 6:36' },
      { book: '1 Peter', chapter: 3, verse: 8, text: 'Finally, all of you, be like-minded, be sympathetic, love one another, be compassionate and humble.', reference: '1 Peter 3:8' }
    ],
    islam: [
      { book: 'Quran', chapter: 1, verse: 1, text: 'In the name of Allah, the Entirely Merciful, the Especially Merciful.', reference: 'Quran 1:1' },
      { book: 'Quran', chapter: 21, verse: 107, text: 'And We sent you not, [O Muhammad], except as a mercy to the worlds.', reference: 'Quran 21:107' },
      { book: 'Quran', chapter: 7, verse: 156, text: 'My mercy encompasses all things.', reference: 'Quran 7:156' },
      { book: 'Quran', chapter: 2, verse: 143, text: 'Indeed, Allah is to the people Kind and Merciful.', reference: 'Quran 2:143' },
      { book: 'Quran', chapter: 90, verse: 17, text: 'And then being among those who believed and advised one another to patience and advised one another to compassion.', reference: 'Quran 90:17' }
    ],
    judaism: [
      { book: 'Psalms', chapter: 103, verse: 13, text: 'As a father has compassion on his children, so the Lord has compassion on those who fear him.', reference: 'Psalms 103:13' },
      { book: 'Isaiah', chapter: 54, verse: 10, text: 'Though the mountains be shaken and the hills be removed, yet my unfailing love for you will not be shaken nor my covenant of peace be removed.', reference: 'Isaiah 54:10' },
      { book: 'Lamentations', chapter: 3, verse: 22, text: 'Because of the Lord\'s great love we are not consumed, for his compassions never fail.', reference: 'Lamentations 3:22' },
      { book: 'Psalms', chapter: 145, verse: 9, text: 'The Lord is good to all; he has compassion on all he has made.', reference: 'Psalms 145:9' },
      { book: 'Micah', chapter: 6, verse: 8, text: 'He has shown you, O mortal, what is good. And what does the Lord require of you? To act justly and to love mercy and to walk humbly with your God.', reference: 'Micah 6:8' }
    ],
    hinduism: [
      { book: 'Bhagavad Gita', chapter: 12, verse: 13, text: 'One who is not envious but is a kind friend to all living entities, who does not think himself a proprietor and is free from false ego, who is equal in both happiness and distress, who is tolerant, always satisfied, self-controlled, and engaged in devotional service with determination, his mind and intelligence fixed on Me—such a devotee of Mine is very dear to Me.', reference: 'Bhagavad Gita 12:13' },
      { book: 'Bhagavad Gita', chapter: 16, verse: 2, text: 'Fearlessness, purification of one\'s existence, cultivation of spiritual knowledge, charity, self-control, performance of sacrifice, study of the Vedas, austerity, simplicity; nonviolence, truthfulness, freedom from anger; renunciation, tranquillity, aversion to faultfinding, compassion for all living entities.', reference: 'Bhagavad Gita 16:2-3' },
      { book: 'Bhagavad Gita', chapter: 5, verse: 25, text: 'Those who are beyond the dualities that arise from doubts, whose minds are engaged within, who are always busy working for the welfare of all living beings, and who are free from all sins achieve liberation in the Supreme.', reference: 'Bhagavad Gita 5:25' },
      { book: 'Bhagavad Gita', chapter: 6, verse: 32, text: 'He is a perfect yogi who, by comparison to his own self, sees the true equality of all beings, in both their happiness and their distress, O Arjuna!', reference: 'Bhagavad Gita 6:32' },
      { book: 'Bhagavad Gita', chapter: 15, verse: 5, text: 'Those who are free from false prestige, illusion and false association, who understand the eternal, who are done with material lust, who are freed from the dualities of happiness and distress, and who, unbewildered, know how to surrender unto the Supreme Person attain to that eternal kingdom.', reference: 'Bhagavad Gita 15:5' }
    ],
    buddhism: [
      { book: 'Dhammapada', chapter: 1, verse: 5, text: 'Hatred does not cease by hatred, but only by love; this is the eternal rule.', reference: 'Dhammapada 1:5' },
      { book: 'Metta Sutta', chapter: 1, verse: 1, text: 'May all beings be free from suffering and the root of suffering.', reference: 'Metta Sutta' },
      { book: 'Lotus Sutra', chapter: 3, verse: 1, text: 'The compassion of the Buddha extends to all sentient beings without discrimination.', reference: 'Lotus Sutra 3' },
      { book: 'Dhammapada', chapter: 10, verse: 1, text: 'All beings tremble before violence. All fear death. All love life. See yourself in others. Then whom can you hurt? What harm can you do?', reference: 'Dhammapada 10:1' },
      { book: 'Karaniya Metta Sutta', chapter: 1, verse: 1, text: 'Just as a mother would protect her only child with her life, even so let one cultivate a boundless love towards all beings.', reference: 'Karaniya Metta Sutta' }
    ]
  },
  wisdom: {
    christianity: [
      { book: 'Proverbs', chapter: 9, verse: 10, text: 'The fear of the Lord is the beginning of wisdom, and knowledge of the Holy One is understanding.', reference: 'Proverbs 9:10' },
      { book: 'James', chapter: 1, verse: 5, text: 'If any of you lacks wisdom, you should ask God, who gives generously to all without finding fault, and it will be given to you.', reference: 'James 1:5' },
      { book: 'Proverbs', chapter: 27, verse: 17, text: 'As iron sharpens iron, so one person sharpens another.', reference: 'Proverbs 27:17' },
      { book: 'Ecclesiastes', chapter: 7, verse: 12, text: 'Wisdom is a shelter as money is a shelter, but the advantage of knowledge is this: Wisdom preserves those who have it.', reference: 'Ecclesiastes 7:12' },
      { book: '1 Corinthians', chapter: 1, verse: 25, text: 'For the foolishness of God is wiser than human wisdom, and the weakness of God is stronger than human strength.', reference: '1 Corinthians 1:25' }
    ],
    islam: [
      { book: 'Quran', chapter: 2, verse: 269, text: 'He gives wisdom to whom He wills, and whoever has been given wisdom has certainly been given much good. And none will remember except those of understanding.', reference: 'Quran 2:269' },
      { book: 'Quran', chapter: 31, verse: 12, text: 'And We had certainly given Luqman wisdom [and said], "Be grateful to Allah." And whoever is grateful is grateful for [the benefit of] himself.', reference: 'Quran 31:12' },
      { book: 'Quran', chapter: 17, verse: 39, text: 'That is from what your Lord has revealed to you, [O Muhammad], of wisdom.', reference: 'Quran 17:39' },
      { book: 'Quran', chapter: 2, verse: 231, text: 'And remember the favor of Allah upon you and what has been revealed to you of the Book and wisdom by which He instructs you.', reference: 'Quran 2:231' },
      { book: 'Quran', chapter: 3, verse: 164, text: 'And teaches them the Book and wisdom and purifies them.', reference: 'Quran 3:164' }
    ],
    judaism: [
      { book: 'Proverbs', chapter: 1, verse: 7, text: 'The fear of the Lord is the beginning of knowledge, but fools despise wisdom and instruction.', reference: 'Proverbs 1:7' },
      { book: 'Job', chapter: 28, verse: 28, text: 'And he said to the human race, "The fear of the Lord—that is wisdom, and to shun evil is understanding."', reference: 'Job 28:28' },
      { book: 'Psalms', chapter: 111, verse: 10, text: 'The fear of the Lord is the beginning of wisdom; all who follow his precepts have good understanding.', reference: 'Psalms 111:10' },
      { book: 'Proverbs', chapter: 16, verse: 16, text: 'How much better to get wisdom than gold, to get insight rather than silver!', reference: 'Proverbs 16:16' },
      { book: 'Ecclesiastes', chapter: 9, verse: 18, text: 'Wisdom is better than weapons of war, but one sinner destroys much good.', reference: 'Ecclesiastes 9:18' }
    ],
    hinduism: [
      { book: 'Bhagavad Gita', chapter: 4, verse: 34, text: 'Just try to learn the truth by approaching a spiritual master. Inquire from him submissively and render service unto him. The self-realized souls can impart knowledge unto you because they have seen the truth.', reference: 'Bhagavad Gita 4:34' },
      { book: 'Bhagavad Gita', chapter: 7, verse: 2, text: 'I shall now declare unto you in full this knowledge, both phenomenal and numinous. This being known, nothing further shall remain for you to know.', reference: 'Bhagavad Gita 7:2' },
      { book: 'Bhagavad Gita', chapter: 2, verse: 69, text: 'What is night for all beings is the time of awakening for the self-controlled; and the time of awakening for all beings is night for the introspective sage.', reference: 'Bhagavad Gita 2:69' },
      { book: 'Bhagavad Gita', chapter: 15, verse: 20, text: 'This is the most confidential part of the Vedic scriptures, O sinless one, and whoever understands this will become wise and his endeavors will know perfection.', reference: 'Bhagavad Gita 15:20' },
      { book: 'Bhagavad Gita', chapter: 18, verse: 63, text: 'Thus I have explained to you knowledge still more confidential. Deliberate on this fully, and then do what you wish to do.', reference: 'Bhagavad Gita 18:63' }
    ],
    buddhism: [
      { book: 'Dhammapada', chapter: 1, verse: 1, text: 'All that we are is the result of what we have thought: it is founded on our thoughts, it is made up of our thoughts.', reference: 'Dhammapada 1:1' },
      { book: 'Dhammapada', chapter: 6, verse: 1, text: 'The wise ones, ever mindful and constantly exerting effort, attain to nirvana, the supreme security from bondage.', reference: 'Dhammapada 6:1' },
      { book: 'Dhammapada', chapter: 14, verse: 1, text: 'Look upon the world as a bubble, look upon it as a mirage: one who looks upon the world in this way the king of death does not see.', reference: 'Dhammapada 14:1' },
      { book: 'Dhammapada', chapter: 19, verse: 1, text: 'The thoughtful person, even if he attains little, is truly wise. He who is thoughtless, even if he possesses much, is foolish.', reference: 'Dhammapada 19:1' },
      { book: 'Lotus Sutra', chapter: 2, verse: 1, text: 'The wisdom of the Buddhas is infinitely profound and immeasurable.', reference: 'Lotus Sutra 2' }
    ]
  }
};

export async function fetchVersesByTheme(theme: string, maxVersesPerReligion: number = 5): Promise<ComparisonResult> {
  console.log(`Fetching verses for theme: ${theme}`);
  
  const normalizedTheme = theme.toLowerCase().trim();
  const result: ComparisonResult = {
    theme: theme,
    aiSummary: '',
    verses: {}
  };

  // Check if we have predefined verses for this theme
  if (THEME_VERSES[normalizedTheme as keyof typeof THEME_VERSES]) {
    const themeVerses = THEME_VERSES[normalizedTheme as keyof typeof THEME_VERSES];
    
    for (const [religion, verses] of Object.entries(themeVerses)) {
      const mappedVerses: ComparisonVerse[] = verses.slice(0, maxVersesPerReligion).map(verse => ({
        religion: getReligionFromString(religion),
        book: verse.book,
        chapter: verse.chapter,
        verse: verse.verse,
        text: verse.text,
        reference: verse.reference,
        translation: religion === 'islam' ? 'English Translation' : undefined
      }));
      
      result.verses[religion] = mappedVerses;
    }
  } else {
    // Fallback: try to fetch dynamically (simplified for now)
    console.log(`No predefined verses found for theme: ${theme}, using fallback`);
    
    // Add some generic spiritual verses for unknown themes
    result.verses = {
      christianity: [{
        religion: 'christianity' as Religion,
        book: 'Psalms',
        chapter: 23,
        verse: 1,
        text: 'The Lord is my shepherd, I lack nothing.',
        reference: 'Psalms 23:1'
      }],
      islam: [{
        religion: 'islam' as Religion,
        book: 'Quran',
        chapter: 1,
        verse: 1,
        text: 'In the name of Allah, the Entirely Merciful, the Especially Merciful.',
        reference: 'Quran 1:1'
      }],
      judaism: [{
        religion: 'judaism' as Religion,
        book: 'Psalms',
        chapter: 23,
        verse: 1,
        text: 'The Lord is my shepherd, I shall not want.',
        reference: 'Psalms 23:1'
      }],
      hinduism: [{
        religion: 'hinduism' as Religion,
        book: 'Bhagavad Gita',
        chapter: 2,
        verse: 47,
        text: 'You have a right to perform your prescribed duty, but not to the fruits of action.',
        reference: 'Bhagavad Gita 2:47'
      }],
      buddhism: [{
        religion: 'buddhism' as Religion,
        book: 'Dhammapada',
        chapter: 1,
        verse: 1,
        text: 'All that we are is the result of what we have thought.',
        reference: 'Dhammapada 1:1'
      }]
    };
  }

  return result;
}

function getReligionFromString(religionStr: string): Religion {
  const mapping: { [key: string]: Religion } = {
    'christianity': 'christianity',
    'islam': 'islam', 
    'judaism': 'judaism',
    'hinduism': 'hinduism',
    'buddhism': 'buddhism'
  };
  return mapping[religionStr] || 'christianity';
}