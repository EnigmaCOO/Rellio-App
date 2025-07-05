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

// Bhagavad Gita - Using local content as the API requires authentication
export function getBhagavadGitaContent(chapter: number): ExternalScripture[] {
  const sampleContent = {
    1: [
      "Now, O Arjuna, seeing the armies of the Pandavas and Kauravas arrayed for battle, Duryodhana spoke these words to his teacher Drona.",
      "Behold, O teacher, this mighty army of the sons of Pandu, arrayed by the son of Drupada, your wise disciple.",
      "In this army are many heroic bowmen equal in fighting to Bhima and Arjuna: Yuyudhana, Virata, and Drupada, the great chariot-warrior.",
      "Dhrishtaketu, Chekitana, and the valiant king of Kashi, also Purujit, Kuntibhoja, and Shaibya, the best of men."
    ],
    2: [
      "Sanjaya said: To him who was thus overcome with pity and whose eyes were brimming with tears and full of despondency, Madhusudana spoke these words.",
      "The Supreme Lord said: O Arjuna, how has this delusion overcome you at this critical hour? It is not befitting an Aryan; it does not lead to the heavenly planets, and it brings only infamy.",
      "O Partha, do not yield to this degrading impotence. It does not become you. Give up such petty weakness of heart and arise, O chastiser of the enemy!",
      "Arjuna said: O slayer of enemies, how can I counterattack with arrows in battle men like Bhishma and Drona, who are worthy of my worship?"
    ]
  };
  
  const content = sampleContent[chapter as keyof typeof sampleContent];
  if (!content) {
    return [];
  }
  
  return content.map((text: string, index: number) => ({
    religion: 'hindu' as Religion,
    book: 'Bhagavad Gita',
    chapter: chapter,
    verse: index + 1,
    text: text,
    translation: 'English - Swami Prabhupada'
  }));
}

// Quran API using alquran.cloud/api
export async function fetchQuranContent(surah: number): Promise<ExternalScripture[]> {
  try {
    const response = await fetch(`https://api.alquran.cloud/v1/surah/${surah}/en.asad`);
    
    if (!response.ok) {
      throw new Error(`Quran API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.data || !data.data.ayahs || !Array.isArray(data.data.ayahs)) {
      return [];
    }
    
    return data.data.ayahs.map((ayah: any) => ({
      religion: 'quran' as Religion,
      book: data.data.englishName || 'Quran',
      chapter: surah,
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
    
    return data.text.map((verse: string, index: number) => ({
      religion: 'torah' as Religion,
      book: book,
      chapter: chapter,
      verse: index + 1,
      text: verse || '',
      translation: 'English'
    }));
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
      return getBhagavadGitaContent(chapter);
    
    case 'quran':
      // Map book names to surah numbers
      const surahMap: { [key: string]: number } = {
        'Al-Fatihah': 1,
        'Al-Baqarah': 2,
        'Al-Imran': 3,
        'An-Nisa': 4,
        'Al-Maidah': 5,
        'Al-An\'am': 6,
        'Al-A\'raf': 7,
        'Al-Anfal': 8
      };
      const surahNumber = surahMap[book] || 1;
      return await fetchQuranContent(surahNumber);
    
    case 'torah':
      return await fetchTorahContent(book, chapter);
    
    case 'buddhist':
      return getTripitakaContent(book, chapter);
    
    default:
      return [];
  }
}