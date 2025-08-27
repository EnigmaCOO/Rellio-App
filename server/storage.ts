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
  type Religion
} from "@shared/schema";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByPhone(phone: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User>;
  
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
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private scriptures: Map<string, Scripture>;
  private chatMessages: Map<string, ChatMessage[]>;
  private userReadings: Map<number, UserReading[]>;
  private spiritualJourneys: Map<string, SpiritualJourney>;
  private readingSessions: Map<string, ReadingSession[]>;
  private journeyMilestones: Map<string, JourneyMilestone[]>;
  private weeklyProgress: Map<string, WeeklyProgress[]>;
  private otpCodes: Map<number, OtpCode>;
  private refreshTokens: Map<number, RefreshToken>;
  private flaggedMessages: Map<number, FlaggedMessage>;
  private moderationLogs: Map<number, ModerationLog>;
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
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.users.set(this.currentId - 1, user);
    return user;
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
    console.log(`✅ Cleared all chat messages for session: ${sessionId}`);
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

  // Spiritual Journey Progress Tracking Implementation
  async getSpiritualJourney(userId: string): Promise<SpiritualJourney | undefined> {
    return this.spiritualJourneys.get(userId);
  }

  async createSpiritualJourney(insertJourney: InsertSpiritualJourney): Promise<SpiritualJourney> {
    const id = this.currentJourneyId++;
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
    for (const [userId, sessions] of this.readingSessions.entries()) {
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
}

export const storage = new MemStorage();
