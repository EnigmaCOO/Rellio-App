import { 
  users, 
  scriptures, 
  chatMessages, 
  userReadings,
  spiritualJourneys,
  readingSessions,
  journeyMilestones,
  weeklyProgress,
  otpCodes,
  refreshTokens,
  flaggedMessages,
  moderationLogs,
  bookmarks,
  type User, 
  type InsertUser,
  type Scripture,
  type InsertScripture,
  type ChatMessage,
  type InsertChatMessage,
  type UserReading,
  type InsertUserReading,
  type SpiritualJourney,
  type InsertSpiritualJourney,
  type ReadingSession,
  type InsertReadingSession,
  type JourneyMilestone,
  type InsertJourneyMilestone,
  type WeeklyProgress,
  type InsertWeeklyProgress,
  type FlaggedMessage,
  type InsertFlaggedMessage,
  type ModerationLog,
  type InsertModerationLog,
  type OtpCode,
  type InsertOtpCode,
  type RefreshToken,
  type InsertRefreshToken,
  type Religion,
  type Bookmark,
  type InsertBookmark,
  type VerseHighlight,
  type InsertVerseHighlight,
  type VerseNote,
  type InsertVerseNote,
  type SavedComparison,
  type InsertSavedComparison,
} from "@shared/schema";

/**
 * Rolling-summary memory for the in-book Scholar.
 * `summary` is the compressed running summary of older turns; `summarizedCount`
 * is how many of the conversation's messages have already been folded into it,
 * so we only summarize newly aged-out turns.
 */
export interface ConversationMemory {
  summary: string;
  summarizedCount: number;
}

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByPhone(phone: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User>;
  getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined>;
  markWelcomeEmailSent(id: string): Promise<User>;
  
  // OTP operations
  createOtpCode(otpData: InsertOtpCode): Promise<OtpCode>;
  verifyOtpCode(email: string | undefined, phone: string | undefined, code: string, purpose: string): Promise<boolean>;
  clearUnverifiedOtpCodes(email: string | undefined, phone: string | undefined): Promise<void>;
  
  // Refresh token operations
  createRefreshToken(tokenData: InsertRefreshToken): Promise<RefreshToken>;
  getRefreshToken(token: string): Promise<RefreshToken | undefined>;
  deleteRefreshToken(token: string): Promise<void>;
  
  getScriptures(religion: Religion, book: string, chapter: number): Promise<Scripture[]>;
  getScriptureBooks(religion: Religion): Promise<string[]>;
  
  getChatMessages(sessionId: string): Promise<ChatMessage[]>;
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  clearChatMessages(sessionId: string): Promise<void>;

  // Rolling-summary memory for the in-book Scholar (keyed by session)
  getConversationMemory(sessionId: string): Promise<ConversationMemory | undefined>;
  setConversationMemory(sessionId: string, memory: ConversationMemory): Promise<void>;
  
  // Voice integration methods
  updateChatMessageWithVoiceData(sessionId: string, voiceData: any, verseReference?: any, context?: any): Promise<void>;
  saveInterruptionData(sessionId: string, interruptionData: any, isInterrupted: boolean, context?: any): Promise<void>;
  
  getUserReadings(userId: number): Promise<UserReading[]>;
  createUserReading(reading: InsertUserReading): Promise<UserReading>;
  
  // Spiritual Journey Progress Tracking
  getSpiritualJourney(userId: string): Promise<SpiritualJourney | undefined>;
  createSpiritualJourney(journey: InsertSpiritualJourney): Promise<SpiritualJourney>;
  updateSpiritualJourney(userId: string, updates: Partial<SpiritualJourney>): Promise<SpiritualJourney>;
  
  startReadingSession(session: InsertReadingSession): Promise<ReadingSession>;
  endReadingSession(sessionId: number, updates: Partial<ReadingSession>): Promise<ReadingSession>;
  getActiveReadingSession(userId: string): Promise<ReadingSession | undefined>;
  getUserReadingSessions(userId: string, limit?: number): Promise<ReadingSession[]>;
  
  createJourneyMilestone(milestone: InsertJourneyMilestone): Promise<JourneyMilestone>;
  getUserMilestones(userId: string): Promise<JourneyMilestone[]>;
  
  getWeeklyProgress(userId: string, weekStart: Date): Promise<WeeklyProgress | undefined>;
  createWeeklyProgress(progress: InsertWeeklyProgress): Promise<WeeklyProgress>;
  updateWeeklyProgress(userId: string, weekStart: Date, updates: Partial<WeeklyProgress>): Promise<WeeklyProgress>;
  getUserProgressSummary(userId: string): Promise<{
    totalSessions: number;
    totalMinutes: number;
    currentStreak: number;
    longestStreak: number;
    religionsExplored: string[];
    recentMilestones: JourneyMilestone[];
  }>;

  // Moderation operations
  createFlaggedMessage(flaggedMessage: InsertFlaggedMessage): Promise<FlaggedMessage>;
  getFlaggedMessages(limit?: number): Promise<FlaggedMessage[]>;
  updateFlaggedMessage(id: number, updates: Partial<FlaggedMessage>): Promise<FlaggedMessage>;
  
  createModerationLog(log: InsertModerationLog): Promise<ModerationLog>;
  getModerationLogs(userId?: string, limit?: number): Promise<ModerationLog[]>;

  // Bookmark operations
  createBookmark(bookmark: InsertBookmark): Promise<Bookmark>;
  getUserBookmarks(userId: string): Promise<Bookmark[]>;
  deleteBookmark(id: number, userId: string): Promise<void>;
  getBookmarkByVerse(userId: string, religion: string, book: string, chapter: number, verse: number): Promise<Bookmark | undefined>;

  // Highlight operations
  createHighlight(highlight: InsertVerseHighlight): Promise<VerseHighlight>;
  getUserHighlights(userId: string): Promise<VerseHighlight[]>;
  getChapterHighlights(userId: string, religion: string, book: string, chapter: number): Promise<VerseHighlight[]>;
  getHighlightByVerse(userId: string, religion: string, book: string, chapter: number, verse: number): Promise<VerseHighlight | undefined>;
  updateHighlight(id: number, userId: string, updates: Partial<VerseHighlight>): Promise<VerseHighlight>;
  deleteHighlight(id: number, userId: string): Promise<void>;

  // Note operations
  createNote(note: InsertVerseNote): Promise<VerseNote>;
  getUserNotes(userId: string): Promise<VerseNote[]>;
  getChapterNotes(userId: string, religion: string, book: string, chapter: number): Promise<VerseNote[]>;
  getNoteByVerse(userId: string, religion: string, book: string, chapter: number, verse: number): Promise<VerseNote | undefined>;
  updateNote(id: number, userId: string, text: string): Promise<VerseNote>;
  deleteNote(id: number, userId: string): Promise<void>;

  // Saved comparison operations
  saveComparison(data: InsertSavedComparison): Promise<SavedComparison>;
  getUserComparisons(userId: string): Promise<SavedComparison[]>;
  deleteComparison(id: number, userId: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private scriptures: Map<string, Scripture>;
  private chatMessages: Map<string, ChatMessage[]>;
  private conversationMemories: Map<string, ConversationMemory>;
  private userReadings: Map<number, UserReading[]>;
  private spiritualJourneys: Map<string, SpiritualJourney>;
  private readingSessions: Map<string, ReadingSession[]>;
  private journeyMilestones: Map<string, JourneyMilestone[]>;
  private weeklyProgress: Map<string, WeeklyProgress[]>;
  private otpCodes: Map<number, OtpCode>;
  private refreshTokens: Map<number, RefreshToken>;
  private flaggedMessages: Map<number, FlaggedMessage>;
  private moderationLogs: Map<number, ModerationLog>;
  private bookmarksMap: Map<string, Bookmark[]>;
  private currentBookmarkId: number;
  private highlightsMap: Map<string, VerseHighlight[]>;
  private currentHighlightId: number;
  private notesMap: Map<string, VerseNote[]>;
  private currentNoteId: number;
  private comparisonsMap: Map<string, SavedComparison[]>;
  private currentComparisonId: number;
  private currentId: number;
  private currentScriptureId: number;
  private currentChatId: number;
  private currentReadingId: number;
  private currentJourneyId: number;
  private currentSessionId: number;
  private currentMilestoneId: number;
  private currentProgressId: number;
  private currentOtpId: number;
  private currentRefreshTokenId: number;
  private currentFlaggedMessageId: number;
  private currentModerationLogId: number;

  constructor() {
    this.users = new Map();
    this.scriptures = new Map();
    this.chatMessages = new Map();
    this.conversationMemories = new Map();
    this.userReadings = new Map();
    this.spiritualJourneys = new Map();
    this.readingSessions = new Map();
    this.journeyMilestones = new Map();
    this.weeklyProgress = new Map();
    this.otpCodes = new Map();
    this.refreshTokens = new Map();
    this.flaggedMessages = new Map();
    this.moderationLogs = new Map();
    this.currentId = 1;
    this.currentScriptureId = 1;
    this.currentChatId = 1;
    this.currentReadingId = 1;
    this.currentJourneyId = 1;
    this.currentSessionId = 1;
    this.currentMilestoneId = 1;
    this.currentProgressId = 1;
    this.currentOtpId = 1;
    this.currentRefreshTokenId = 1;
    this.currentFlaggedMessageId = 1;
    this.currentModerationLogId = 1;
    this.comparisonsMap = new Map();
    this.currentComparisonId = 1;
    this.bookmarksMap = new Map();
    this.currentBookmarkId = 1;
    this.highlightsMap = new Map();
    this.currentHighlightId = 1;
    this.notesMap = new Map();
    this.currentNoteId = 1;
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

  async getUserByPhone(phone: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.phone === phone,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = `user_${this.currentId++}`;
    const user: User = {
      id,
      email: insertUser.email || null,
      phone: insertUser.phone || null,
      username: insertUser.username || null,
      password: insertUser.password || null,
      firstName: insertUser.firstName || null,
      lastName: insertUser.lastName || null,
      profileImageUrl: insertUser.profileImageUrl || null,
      verified: insertUser.verified || 0,
      socialProvider: insertUser.socialProvider || null,
      notificationPreferences: insertUser.notificationPreferences || { email: true, sms: false, push: true },
      banned: 0,
      banReason: null,
      banExpiresAt: null,
      moderationWarnings: 0,
      firebaseUid: insertUser.firebaseUid ?? null,
      welcomeEmailSentAt: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.users.set(this.currentId - 1, user);
    return user;
  }

  async getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.firebaseUid === firebaseUid,
    );
  }

  async markWelcomeEmailSent(id: string): Promise<User> {
    // Conditional/idempotent: only set the timestamp when it's currently null.
    // This enforces one-time semantics at the persistence layer so a race
    // (two concurrent welcome triggers for the same user) cannot overwrite
    // the original "first welcomed at" moment.
    const existing = await this.getUser(id);
    if (!existing) {
      throw new Error('User not found');
    }
    if (existing.welcomeEmailSentAt) {
      return existing;
    }
    return this.updateUser(id, { welcomeEmailSentAt: new Date() });
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const existingUser = await this.getUser(id);
    if (!existingUser) {
      throw new Error('User not found');
    }

    const updatedUser: User = {
      ...existingUser,
      ...updates,
      updatedAt: new Date(),
    };

    // Find and update in the map
    for (const [key, user] of Array.from(this.users.entries())) {
      if (user.id === id) {
        this.users.set(key, updatedUser);
        break;
      }
    }

    return updatedUser;
  }

  // OTP operations
  async createOtpCode(otpData: InsertOtpCode): Promise<OtpCode> {
    const id = this.currentOtpId++;
    const otpCode: OtpCode = {
      id,
      email: otpData.email || null,
      phone: otpData.phone || null,
      code: otpData.code,
      purpose: otpData.purpose,
      expiresAt: otpData.expiresAt,
      verified: otpData.verified || 0,
      createdAt: new Date(),
    };
    this.otpCodes.set(id, otpCode);
    return otpCode;
  }

  async verifyOtpCode(
    email: string | undefined,
    phone: string | undefined,
    code: string,
    purpose: string
  ): Promise<boolean> {
    const now = new Date();
    
    for (const [id, otpCode] of Array.from(this.otpCodes.entries())) {
      if (
        otpCode.code === code &&
        otpCode.purpose === purpose &&
        otpCode.verified === 0 &&
        otpCode.expiresAt > now &&
        ((email && otpCode.email === email) || (phone && otpCode.phone === phone))
      ) {
        // Mark as verified
        otpCode.verified = 1;
        this.otpCodes.set(id, otpCode);
        return true;
      }
    }
    
    return false;
  }

  async clearUnverifiedOtpCodes(
    email: string | undefined,
    phone: string | undefined
  ): Promise<void> {
    const toDelete: number[] = [];
    
    for (const [id, otpCode] of Array.from(this.otpCodes.entries())) {
      if (
        otpCode.verified === 0 &&
        ((email && otpCode.email === email) || (phone && otpCode.phone === phone))
      ) {
        toDelete.push(id);
      }
    }
    
    toDelete.forEach(id => this.otpCodes.delete(id));
  }

  // Refresh token operations
  async createRefreshToken(tokenData: InsertRefreshToken): Promise<RefreshToken> {
    const id = this.currentRefreshTokenId++;
    const refreshToken: RefreshToken = {
      ...tokenData,
      id,
      createdAt: new Date(),
    };
    this.refreshTokens.set(id, refreshToken);
    return refreshToken;
  }

  async getRefreshToken(token: string): Promise<RefreshToken | undefined> {
    return Array.from(this.refreshTokens.values()).find(
      (rt) => rt.token === token && rt.expiresAt > new Date()
    );
  }

  async deleteRefreshToken(token: string): Promise<void> {
    const toDelete: number[] = [];
    
    for (const [id, refreshToken] of Array.from(this.refreshTokens.entries())) {
      if (refreshToken.token === token) {
        toDelete.push(id);
      }
    }
    
    toDelete.forEach(id => this.refreshTokens.delete(id));
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
    // @ts-expect-error: pre-existing type issue — scheduled for systematic refactor
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

  async clearChatMessages(sessionId: string): Promise<void> {
    this.chatMessages.delete(sessionId);
    this.conversationMemories.delete(sessionId);
    console.log(`✅ Cleared all chat messages for session: ${sessionId}`);
  }

  async getConversationMemory(sessionId: string): Promise<ConversationMemory | undefined> {
    return this.conversationMemories.get(sessionId);
  }

  async setConversationMemory(sessionId: string, memory: ConversationMemory): Promise<void> {
    this.conversationMemories.set(sessionId, memory);
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

  // @ts-expect-error: pre-existing type issue — scheduled for systematic refactor
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

  // Spiritual Journey Progress Tracking Implementation
  async getSpiritualJourney(userId: string): Promise<SpiritualJourney | undefined> {
    return this.spiritualJourneys.get(userId);
  }

  async createSpiritualJourney(insertJourney: InsertSpiritualJourney): Promise<SpiritualJourney> {
    const id = this.currentJourneyId++;
    // @ts-expect-error: pre-existing type issue — scheduled for systematic refactor
    const journey: SpiritualJourney = {
      ...insertJourney,
      id,
      startDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      lastActiveDate: null,
      favoriteReligion: null
    };
    
    this.spiritualJourneys.set(insertJourney.userId, journey);
    return journey;
  }

  async updateSpiritualJourney(userId: string, updates: Partial<SpiritualJourney>): Promise<SpiritualJourney> {
    const existing = this.spiritualJourneys.get(userId);
    if (!existing) {
      throw new Error('Spiritual journey not found');
    }
    
    const updated: SpiritualJourney = {
      ...existing,
      ...updates,
      updatedAt: new Date()
    };
    
    this.spiritualJourneys.set(userId, updated);
    return updated;
  }

  async startReadingSession(insertSession: InsertReadingSession): Promise<ReadingSession> {
    const id = this.currentSessionId++;
    // @ts-expect-error: pre-existing type issue — scheduled for systematic refactor
    const session: ReadingSession = {
      ...insertSession,
      id,
      startTime: new Date(),
      endTime: null,
      createdAt: new Date()
    };
    
    const sessions = this.readingSessions.get(insertSession.userId) || [];
    sessions.push(session);
    this.readingSessions.set(insertSession.userId, sessions);
    
    return session;
  }

  async endReadingSession(sessionId: number, updates: Partial<ReadingSession>): Promise<ReadingSession> {
    // @ts-expect-error: pre-existing type issue — scheduled for systematic refactor
    for (const [userId, sessions] of this.readingSessions.entries()) {
      // @ts-expect-error: pre-existing type issue — scheduled for systematic refactor
      const sessionIndex = sessions.findIndex(s => s.id === sessionId);
      if (sessionIndex !== -1) {
        const updated = {
          ...sessions[sessionIndex],
          ...updates,
          endTime: new Date()
        };
        sessions[sessionIndex] = updated;
        return updated;
      }
    }
    throw new Error('Reading session not found');
  }

  async getActiveReadingSession(userId: string): Promise<ReadingSession | undefined> {
    const sessions = this.readingSessions.get(userId) || [];
    return sessions.find(s => !s.endTime);
  }

  async getUserReadingSessions(userId: string, limit = 50): Promise<ReadingSession[]> {
    const sessions = this.readingSessions.get(userId) || [];
    return sessions.slice(-limit).reverse();
  }

  async createJourneyMilestone(insertMilestone: InsertJourneyMilestone): Promise<JourneyMilestone> {
    const id = this.currentMilestoneId++;
    // @ts-expect-error: pre-existing type issue — scheduled for systematic refactor
    const milestone: JourneyMilestone = {
      ...insertMilestone,
      id,
      achievedAt: new Date()
    };
    
    const milestones = this.journeyMilestones.get(insertMilestone.userId) || [];
    milestones.push(milestone);
    this.journeyMilestones.set(insertMilestone.userId, milestones);
    
    return milestone;
  }

  async getUserMilestones(userId: string): Promise<JourneyMilestone[]> {
    return this.journeyMilestones.get(userId) || [];
  }

  async getWeeklyProgress(userId: string, weekStart: Date): Promise<WeeklyProgress | undefined> {
    const progressList = this.weeklyProgress.get(userId) || [];
    return progressList.find(p => 
      p.weekStart.getTime() === weekStart.getTime()
    );
  }

  async createWeeklyProgress(insertProgress: InsertWeeklyProgress): Promise<WeeklyProgress> {
    const id = this.currentProgressId++;
    // @ts-expect-error: pre-existing type issue — scheduled for systematic refactor
    const progress: WeeklyProgress = {
      ...insertProgress,
      id,
      createdAt: new Date()
    };
    
    const progressList = this.weeklyProgress.get(insertProgress.userId) || [];
    progressList.push(progress);
    this.weeklyProgress.set(insertProgress.userId, progressList);
    
    return progress;
  }

  async updateWeeklyProgress(userId: string, weekStart: Date, updates: Partial<WeeklyProgress>): Promise<WeeklyProgress> {
    const progressList = this.weeklyProgress.get(userId) || [];
    const progressIndex = progressList.findIndex(p => 
      p.weekStart.getTime() === weekStart.getTime()
    );
    
    if (progressIndex === -1) {
      throw new Error('Weekly progress not found');
    }
    
    const updated = {
      ...progressList[progressIndex],
      ...updates
    };
    
    progressList[progressIndex] = updated;
    return updated;
  }

  async getUserProgressSummary(userId: string): Promise<{
    totalSessions: number;
    totalMinutes: number;
    currentStreak: number;
    longestStreak: number;
    religionsExplored: string[];
    recentMilestones: JourneyMilestone[];
  }> {
    const journey = this.spiritualJourneys.get(userId);
    const sessions = this.readingSessions.get(userId) || [];
    const milestones = this.journeyMilestones.get(userId) || [];
    
    // @ts-expect-error: pre-existing type issue — scheduled for systematic refactor
    const religionsExplored = [...new Set(sessions.map(s => s.religion))];
    const recentMilestones = milestones.slice(-5).reverse();
    
    return {
      totalSessions: journey?.totalReadingSessions || 0,
      totalMinutes: journey?.totalTimeMinutes || 0,
      currentStreak: journey?.currentStreak || 0,
      longestStreak: journey?.longestStreak || 0,
      religionsExplored,
      recentMilestones
    };
  }

  // Moderation operations implementation
  async createFlaggedMessage(insertFlaggedMessage: InsertFlaggedMessage): Promise<FlaggedMessage> {
    const id = this.currentFlaggedMessageId++;
    const flaggedMessage: FlaggedMessage = {
      ...insertFlaggedMessage,
      id,
      userId: insertFlaggedMessage.userId || null,
      moderationAction: insertFlaggedMessage.moderationAction || null,
      reportedBy: insertFlaggedMessage.reportedBy || null,
      aiConfidence: insertFlaggedMessage.aiConfidence || null,
      createdAt: new Date(),
      reviewedAt: null,
      moderatorId: insertFlaggedMessage.moderatorId || null
    };
    
    this.flaggedMessages.set(id, flaggedMessage);
    return flaggedMessage;
  }

  async getFlaggedMessages(limit = 50): Promise<FlaggedMessage[]> {
    const messages = Array.from(this.flaggedMessages.values());
    return messages.slice(-limit).reverse();
  }

  async updateFlaggedMessage(id: number, updates: Partial<FlaggedMessage>): Promise<FlaggedMessage> {
    const existing = this.flaggedMessages.get(id);
    if (!existing) {
      throw new Error('Flagged message not found');
    }
    
    const updated: FlaggedMessage = {
      ...existing,
      ...updates
    };
    
    this.flaggedMessages.set(id, updated);
    return updated;
  }

  async createModerationLog(insertLog: InsertModerationLog): Promise<ModerationLog> {
    const id = this.currentModerationLogId++;
    const log: ModerationLog = {
      ...insertLog,
      id,
      userId: insertLog.userId || null,
      moderatorId: insertLog.moderatorId || null,
      details: insertLog.details || null,
      createdAt: new Date()
    };
    
    this.moderationLogs.set(id, log);
    return log;
  }

  async getModerationLogs(userId?: string, limit = 50): Promise<ModerationLog[]> {
    let logs = Array.from(this.moderationLogs.values());
    
    if (userId) {
      logs = logs.filter(log => log.userId === userId);
    }
    
    return logs.slice(-limit).reverse();
  }

  async createBookmark(insertBookmark: InsertBookmark): Promise<Bookmark> {
    const id = this.currentBookmarkId++;
    const bookmark: Bookmark = {
      ...insertBookmark,
      id,
      note: insertBookmark.note ?? null,
      createdAt: new Date(),
    };
    const existing = this.bookmarksMap.get(insertBookmark.userId) || [];
    existing.push(bookmark);
    this.bookmarksMap.set(insertBookmark.userId, existing);
    return bookmark;
  }

  async getUserBookmarks(userId: string): Promise<Bookmark[]> {
    return [...(this.bookmarksMap.get(userId) || [])].reverse();
  }

  async deleteBookmark(id: number, userId: string): Promise<void> {
    const list = this.bookmarksMap.get(userId) || [];
    this.bookmarksMap.set(userId, list.filter(b => b.id !== id));
  }

  async getBookmarkByVerse(userId: string, religion: string, book: string, chapter: number, verse: number): Promise<Bookmark | undefined> {
    const list = this.bookmarksMap.get(userId) || [];
    return list.find(b => b.religion === religion && b.book === book && b.chapter === chapter && b.verse === verse);
  }

  // ─── Highlight MemStorage ────────────────────────────────────────────────

  async createHighlight(data: InsertVerseHighlight): Promise<VerseHighlight> {
    const id = this.currentHighlightId++;
    const h: VerseHighlight = { ...data, id, createdAt: new Date() };
    const list = this.highlightsMap.get(data.userId) || [];
    list.push(h);
    this.highlightsMap.set(data.userId, list);
    return h;
  }

  async getUserHighlights(userId: string): Promise<VerseHighlight[]> {
    return [...(this.highlightsMap.get(userId) || [])].reverse();
  }

  async getChapterHighlights(userId: string, religion: string, book: string, chapter: number): Promise<VerseHighlight[]> {
    return (this.highlightsMap.get(userId) || []).filter(
      h => h.religion === religion && h.book === book && h.chapter === chapter
    );
  }

  async getHighlightByVerse(userId: string, religion: string, book: string, chapter: number, verse: number): Promise<VerseHighlight | undefined> {
    return (this.highlightsMap.get(userId) || []).find(
      h => h.religion === religion && h.book === book && h.chapter === chapter && h.verse === verse
    );
  }

  async updateHighlight(id: number, userId: string, updates: Partial<VerseHighlight>): Promise<VerseHighlight> {
    const list = this.highlightsMap.get(userId) || [];
    const idx = list.findIndex(h => h.id === id);
    if (idx === -1) throw new Error("Highlight not found");
    list[idx] = { ...list[idx], ...updates };
    this.highlightsMap.set(userId, list);
    return list[idx];
  }

  async deleteHighlight(id: number, userId: string): Promise<void> {
    const list = this.highlightsMap.get(userId) || [];
    this.highlightsMap.set(userId, list.filter(h => h.id !== id));
  }

  // ─── Note MemStorage ─────────────────────────────────────────────────────

  async createNote(data: InsertVerseNote): Promise<VerseNote> {
    const id = this.currentNoteId++;
    const now = new Date();
    const n: VerseNote = { ...data, id, verseText: data.verseText ?? null, createdAt: now, updatedAt: now };
    const list = this.notesMap.get(data.userId) || [];
    list.push(n);
    this.notesMap.set(data.userId, list);
    return n;
  }

  async getUserNotes(userId: string): Promise<VerseNote[]> {
    return [...(this.notesMap.get(userId) || [])].reverse();
  }

  async getChapterNotes(userId: string, religion: string, book: string, chapter: number): Promise<VerseNote[]> {
    return (this.notesMap.get(userId) || []).filter(
      n => n.religion === religion && n.book === book && n.chapter === chapter
    );
  }

  async getNoteByVerse(userId: string, religion: string, book: string, chapter: number, verse: number): Promise<VerseNote | undefined> {
    return (this.notesMap.get(userId) || []).find(
      n => n.religion === religion && n.book === book && n.chapter === chapter && n.verse === verse
    );
  }

  async updateNote(id: number, userId: string, text: string): Promise<VerseNote> {
    const list = this.notesMap.get(userId) || [];
    const idx = list.findIndex(n => n.id === id);
    if (idx === -1) throw new Error("Note not found");
    list[idx] = { ...list[idx], text, updatedAt: new Date() };
    this.notesMap.set(userId, list);
    return list[idx];
  }

  async deleteNote(id: number, userId: string): Promise<void> {
    const list = this.notesMap.get(userId) || [];
    this.notesMap.set(userId, list.filter(n => n.id !== id));
  }

  // ─── Saved Comparison MemStorage ─────────────────────────────────────────

  async saveComparison(data: InsertSavedComparison): Promise<SavedComparison> {
    const id = this.currentComparisonId++;
    const c: SavedComparison = { ...data, id, createdAt: new Date() };
    const list = this.comparisonsMap.get(data.userId) || [];
    list.unshift(c);
    this.comparisonsMap.set(data.userId, list);
    return c;
  }

  async getUserComparisons(userId: string): Promise<SavedComparison[]> {
    return [...(this.comparisonsMap.get(userId) || [])];
  }

  async deleteComparison(id: number, userId: string): Promise<void> {
    const list = this.comparisonsMap.get(userId) || [];
    this.comparisonsMap.set(userId, list.filter(c => c.id !== id));
  }
}

export const storage = new MemStorage();
