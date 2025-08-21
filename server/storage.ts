import { 
  users, 
  scriptures, 
  chatMessages, 
  userReadings,
  type User, 
  type InsertUser,
  type Scripture,
  type InsertScripture,
  type ChatMessage,
  type InsertChatMessage,
  type UserReading,
  type InsertUserReading,
  type Religion
} from "@shared/schema";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getScriptures(religion: Religion, book: string, chapter: number): Promise<Scripture[]>;
  getScriptureBooks(religion: Religion): Promise<string[]>;
  
  getChatMessages(sessionId: string): Promise<ChatMessage[]>;
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  
  // Voice integration methods
  updateChatMessageWithVoiceData(sessionId: string, voiceData: any, verseReference?: any, context?: any): Promise<void>;
  saveInterruptionData(sessionId: string, interruptionData: any, isInterrupted: boolean, context?: any): Promise<void>;
  
  getUserReadings(userId: number): Promise<UserReading[]>;
  createUserReading(reading: InsertUserReading): Promise<UserReading>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private scriptures: Map<string, Scripture>;
  private chatMessages: Map<string, ChatMessage[]>;
  private userReadings: Map<number, UserReading[]>;
  private currentId: number;
  private currentScriptureId: number;
  private currentChatId: number;
  private currentReadingId: number;

  constructor() {
    this.users = new Map();
    this.scriptures = new Map();
    this.chatMessages = new Map();
    this.userReadings = new Map();
    this.currentId = 1;
    this.currentScriptureId = 1;
    this.currentChatId = 1;
    this.currentReadingId = 1;
    this.initializeScriptures();
  }

  private initializeScriptures() {
    // Initialize with some sample scripture data
    const sampleScriptures: Omit<Scripture, 'id'>[] = [
      {
        religion: 'bible',
        book: 'Genesis',
        chapter: 1,
        verse: 1,
        text: 'In the beginning God created the heavens and the earth.',
        translation: 'NIV'
      },
      {
        religion: 'bible',
        book: 'Genesis',
        chapter: 1,
        verse: 2,
        text: 'Now the earth was formless and empty, darkness was over the surface of the deep, and the Spirit of God was hovering over the waters.',
        translation: 'NIV'
      },
      {
        religion: 'bible',
        book: 'Genesis',
        chapter: 1,
        verse: 3,
        text: 'And God said, "Let there be light," and there was light.',
        translation: 'NIV'
      },
      {
        religion: 'bible',
        book: 'Genesis',
        chapter: 1,
        verse: 4,
        text: 'God saw that the light was good, and he separated the light from the darkness.',
        translation: 'NIV'
      },
      {
        religion: 'bible',
        book: 'Genesis',
        chapter: 1,
        verse: 5,
        text: 'God called the light "day," and the darkness he called "night." And there was evening, and there was morning—the first day.',
        translation: 'NIV'
      },
      {
        religion: 'quran',
        book: 'Al-Fatihah',
        chapter: 1,
        verse: 1,
        text: 'In the name of Allah, the Most Gracious, the Most Merciful.',
        translation: 'English'
      },
      {
        religion: 'quran',
        book: 'Al-Fatihah',
        chapter: 1,
        verse: 2,
        text: 'All praise is due to Allah, the Lord of all worlds.',
        translation: 'English'
      },
      {
        religion: 'quran',
        book: 'Al-Fatihah',
        chapter: 1,
        verse: 3,
        text: 'The Most Gracious, the Most Merciful.',
        translation: 'English'
      },
      {
        religion: 'torah',
        book: 'Bereshit',
        chapter: 1,
        verse: 1,
        text: 'In the beginning God created the heaven and the earth.',
        translation: 'JPS'
      },
      {
        religion: 'torah',
        book: 'Bereshit',
        chapter: 1,
        verse: 2,
        text: 'And the earth was without form, and void; and darkness was upon the face of the deep.',
        translation: 'JPS'
      }
    ];

    sampleScriptures.forEach(scripture => {
      const id = this.currentScriptureId++;
      const key = `${scripture.religion}-${scripture.book}-${scripture.chapter}`;
      this.scriptures.set(key, { ...scripture, id });
    });
  }

  async getUser(id: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.id === id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = `user_${this.currentId++}`;
    const user: User = { 
      ...insertUser, 
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.users.set(this.currentId - 1, user);
    return user;
  }

  async getScriptures(religion: Religion, book: string, chapter: number): Promise<Scripture[]> {
    const results: Scripture[] = [];
    const key = `${religion}-${book}-${chapter}`;
    
    for (const [scriptureKey, scripture] of Array.from(this.scriptures.entries())) {
      if (scriptureKey.startsWith(key)) {
        results.push(scripture);
      }
    }
    
    return results.sort((a, b) => a.verse - b.verse);
  }

  async getScriptureBooks(religion: Religion): Promise<string[]> {
    const books = new Set<string>();
    
    for (const scripture of Array.from(this.scriptures.values())) {
      if (scripture.religion === religion) {
        books.add(scripture.book);
      }
    }
    
    return Array.from(books);
  }

  async getChatMessages(sessionId: string): Promise<ChatMessage[]> {
    return this.chatMessages.get(sessionId) || [];
  }

  async createChatMessage(insertMessage: InsertChatMessage): Promise<ChatMessage> {
    const id = this.currentChatId++;
    const message: ChatMessage = { 
      ...insertMessage, 
      id,
      context: insertMessage.context || null,
      timestamp: new Date()
    };
    
    if (!this.chatMessages.has(insertMessage.sessionId)) {
      this.chatMessages.set(insertMessage.sessionId, []);
    }
    
    this.chatMessages.get(insertMessage.sessionId)!.push(message);
    return message;
  }

  async updateChatMessageWithVoiceData(sessionId: string, voiceData: any, verseReference?: any, context?: any): Promise<void> {
    const sessionMessages = this.chatMessages.get(sessionId);
    if (sessionMessages && sessionMessages.length > 0) {
      const lastMessage = sessionMessages[sessionMessages.length - 1];
      (lastMessage as any).voiceData = voiceData;
      (lastMessage as any).verseReference = verseReference;
      if (context) {
        lastMessage.context = context;
      }
    }
    console.log('Updating chat message with voice data:', { sessionId, voiceData, verseReference });
  }

  async saveInterruptionData(sessionId: string, interruptionData: any, isInterrupted: boolean, context?: any): Promise<void> {
    const sessionMessages = this.chatMessages.get(sessionId);
    if (sessionMessages && sessionMessages.length > 0) {
      const lastMessage = sessionMessages[sessionMessages.length - 1];
      (lastMessage as any).interruptionData = interruptionData;
      (lastMessage as any).isInterrupted = isInterrupted ? 1 : 0;
      if (context) {
        lastMessage.context = context;
      }
    }
    console.log('Saving interruption data:', { sessionId, interruptionData, isInterrupted });
  }

  async getUserReadings(userId: string): Promise<UserReading[]> {
    return Array.from(this.userReadings.values()).flat().filter(
      reading => reading.userId === userId
    );
  }

  async createUserReading(insertReading: InsertUserReading): Promise<UserReading> {
    const id = this.currentReadingId++;
    const reading: UserReading = { 
      ...insertReading, 
      id,
      userId: insertReading.userId || null,
      timestamp: new Date()
    };
    
    const userId = insertReading.userId || "";
    const readings = this.userReadings.get(0) || [];
    readings.push(reading);
    this.userReadings.set(0, readings);
    
    return reading;
  }
}

export const storage = new MemStorage();
