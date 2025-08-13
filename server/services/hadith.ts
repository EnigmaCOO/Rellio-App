import { Religion } from "@shared/schema";

export interface HadithEdition {
  name: string;
  author: string;
  language: string;
  direction: string;
  source: string;
  link: string;
  linkmin: string;
}

export interface HadithResponse {
  metadata: {
    name: string;
    section: Record<string, string>;
    section_detail: Record<string, {
      hadithnumber_first: number;
      hadithnumber_last: number;
      arabicnumber_first: number;
      arabicnumber_last: number;
    }>;
  };
  hadiths: Array<{
    hadithnumber: number;
    arabicnumber: number;
    text: string;
    grades: string[];
    reference: {
      book: number;
      hadith: number;
    };
  }>;
}

export interface HadithBook {
  id: string;
  name: string;
  author: string;
  totalHadiths: number;
  sections: number;
}

// Available English hadith collections
export const HADITH_COLLECTIONS: HadithBook[] = [
  {
    id: "eng-bukhari",
    name: "Sahih al-Bukhari",
    author: "Imam Bukhari",
    totalHadiths: 7563,
    sections: 97
  },
  {
    id: "eng-muslim",
    name: "Sahih Muslim",
    author: "Imam Muslim",
    totalHadiths: 7470,
    sections: 56
  },
  {
    id: "eng-abudawud",
    name: "Sunan Abu Dawud",
    author: "Abu Dawud",
    totalHadiths: 5274,
    sections: 43
  },
  {
    id: "eng-tirmidhi",
    name: "Jami' at-Tirmidhi",
    author: "Al-Tirmidhi",
    totalHadiths: 3956,
    sections: 51
  },
  {
    id: "eng-nasai",
    name: "Sunan an-Nasa'i",
    author: "An-Nasa'i",
    totalHadiths: 5761,
    sections: 51
  },
  {
    id: "eng-ibnmajah",
    name: "Sunan Ibn Majah",
    author: "Ibn Majah",
    totalHadiths: 4341,
    sections: 37
  }
];

const HADITH_API_BASE = "https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1";

export async function fetchHadithEditions(): Promise<Record<string, HadithEdition>> {
  try {
    const response = await fetch(`${HADITH_API_BASE}/editions.min.json`);
    if (!response.ok) {
      throw new Error(`Failed to fetch editions: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching hadith editions:', error);
    // Fallback to the main URL
    try {
      const fallbackResponse = await fetch(`${HADITH_API_BASE}/editions.json`);
      if (fallbackResponse.ok) {
        return await fallbackResponse.json();
      }
    } catch (fallbackError) {
      console.error('Fallback also failed:', fallbackError);
    }
    return {};
  }
}

export async function fetchHadithSection(collectionId: string, sectionNumber: number): Promise<HadithResponse | null> {
  try {
    // Try the direct section URL first (this is the correct structure based on API documentation)
    const response = await fetch(`${HADITH_API_BASE}/editions/${collectionId}/${sectionNumber}.min.json`);
    if (!response.ok) {
      throw new Error(`Failed to fetch section: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Error fetching hadith section ${sectionNumber} from ${collectionId}:`, error);
    // Fallback to the main URL
    try {
      const fallbackResponse = await fetch(`${HADITH_API_BASE}/editions/${collectionId}/${sectionNumber}.json`);
      if (fallbackResponse.ok) {
        return await fallbackResponse.json();
      }
    } catch (fallbackError) {
      console.error('Fallback also failed:', fallbackError);
    }
    return null;
  }
}

export async function fetchSpecificHadith(collectionId: string, hadithNumber: number): Promise<any> {
  try {
    const response = await fetch(`${HADITH_API_BASE}/editions/${collectionId}/${hadithNumber}.min.json`);
    if (!response.ok) {
      throw new Error(`Failed to fetch hadith: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Error fetching hadith ${hadithNumber} from ${collectionId}:`, error);
    // Fallback to the main URL
    try {
      const fallbackResponse = await fetch(`${HADITH_API_BASE}/editions/${collectionId}/${hadithNumber}.json`);
      if (fallbackResponse.ok) {
        return await fallbackResponse.json();
      }
    } catch (fallbackError) {
      console.error('Fallback also failed:', fallbackError);
    }
    return null;
  }
}

export async function fetchRandomHadithFromCollection(collectionId: string): Promise<any> {
  const collection = HADITH_COLLECTIONS.find(c => c.id === collectionId);
  if (!collection) {
    throw new Error(`Collection ${collectionId} not found`);
  }
  
  // Get a random hadith number
  const randomHadithNumber = Math.floor(Math.random() * collection.totalHadiths) + 1;
  return await fetchSpecificHadith(collectionId, randomHadithNumber);
}

export function getHadithCollectionByName(bookName: string): HadithBook | undefined {
  return HADITH_COLLECTIONS.find(collection => collection.name === bookName);
}

export function getHadithCollectionById(id: string): HadithBook | undefined {
  return HADITH_COLLECTIONS.find(collection => collection.id === id);
}