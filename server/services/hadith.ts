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
    // First get section details to find the range of hadiths
    const sectionResponse = await fetch(`${HADITH_API_BASE}/editions/${collectionId}/sections/${sectionNumber}.min.json`);
    if (!sectionResponse.ok) {
      throw new Error(`Failed to fetch section metadata: ${sectionResponse.status}`);
    }
    
    const sectionData = await sectionResponse.json();
    const sectionDetail = sectionData.metadata?.section_detail?.[sectionNumber.toString()];
    
    if (!sectionDetail) {
      console.error(`No section detail found for section ${sectionNumber}`);
      return null;
    }
    
    const firstHadith = sectionDetail.hadithnumber_first;
    const lastHadith = sectionDetail.hadithnumber_last;
    const sectionName = sectionData.metadata?.section?.[sectionNumber.toString()] || 'Unknown';
    
    console.log(`Fetching hadiths ${firstHadith}-${lastHadith} for section ${sectionNumber}: ${sectionName}`);
    
    // Fetch all hadiths in the range
    const hadithPromises = [];
    for (let i = firstHadith; i <= lastHadith; i++) {
      hadithPromises.push(fetchSpecificHadith(collectionId, i));
    }
    
    const hadithResults = await Promise.allSettled(hadithPromises);
    const hadiths = hadithResults
      .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled' && result.value !== null)
      .map(result => result.value);
    
    return {
      metadata: {
        name: sectionData.metadata?.name || '',
        section: { [sectionNumber]: sectionName },
        section_detail: { [sectionNumber]: sectionDetail }
      },
      hadiths: hadiths
    };
  } catch (error) {
    console.error(`Error fetching hadith section ${sectionNumber} from ${collectionId}:`, error);
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