import { pgTable, text, serial, integer, json, timestamp, varchar, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from 'drizzle-orm';

// Session storage table for authentication
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: json("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// OTP verification table
export const otpCodes = pgTable("otp_codes", {
  id: serial("id").primaryKey(),
  email: varchar("email"),
  phone: varchar("phone"),
  code: varchar("code", { length: 6 }).notNull(),
  purpose: varchar("purpose").notNull(), // 'signup', 'login', 'reset'
  expiresAt: timestamp("expires_at").notNull(),
  verified: integer("verified").default(0), // 0 = false, 1 = true
  createdAt: timestamp("created_at").defaultNow(),
});

// Refresh tokens table for JWT
export const refreshTokens = pgTable("refresh_tokens", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  token: text("token").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  phone: varchar("phone").unique(),
  username: text("username").unique(),
  password: text("password"),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  verified: integer("verified").default(0), // 0 = false, 1 = true
  socialProvider: varchar("social_provider"), // 'google', 'facebook', 'twitter', 'instagram', null for email/phone
  notificationPreferences: json("notification_preferences").$type<{
    email: boolean;
    sms: boolean;
    push: boolean;
  }>().default({ email: true, sms: false, push: true }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const scriptures = pgTable("scriptures", {
  id: serial("id").primaryKey(),
  religion: text("religion").notNull(), // 'bible', 'quran', 'torah', etc.
  book: text("book").notNull(),
  chapter: integer("chapter").notNull(),
  verse: integer("verse").notNull(),
  text: text("text").notNull(),
  translation: text("translation").default("default"),
});

export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  type: text("type").notNull(), // 'user' or 'ai'
  content: text("content").notNull(),
  context: json("context"), // scripture context
  verseReference: json("verse_reference"), // linked verse for context recall
  interruptionData: json("interruption_data"), // interruption context and timing
  voiceData: json("voice_data"), // voice persona, tone, playback info
  isInterrupted: integer("is_interrupted").default(0), // 0 = false, 1 = true
  responseLatency: integer("response_latency"), // latency in milliseconds
  timestamp: timestamp("timestamp").defaultNow(),
});

export const userReadings = pgTable("user_readings", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id"),
  religion: text("religion").notNull(),
  book: text("book").notNull(),
  chapter: integer("chapter").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
});

// Enhanced spiritual journey tracking
export const spiritualJourneys = pgTable("spiritual_journeys", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  startDate: timestamp("start_date").defaultNow(),
  totalReadingSessions: integer("total_reading_sessions").default(0),
  totalTimeMinutes: integer("total_time_minutes").default(0),
  currentStreak: integer("current_streak").default(0),
  longestStreak: integer("longest_streak").default(0),
  lastActiveDate: timestamp("last_active_date"),
  favoriteReligion: text("favorite_religion"),
  readingGoal: integer("reading_goal").default(0), // minutes per week
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const readingSessions = pgTable("reading_sessions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  journeyId: integer("journey_id").notNull(),
  religion: text("religion").notNull(),
  book: text("book").notNull(),
  chapter: integer("chapter").notNull(),
  startTime: timestamp("start_time").defaultNow(),
  endTime: timestamp("end_time"),
  durationMinutes: integer("duration_minutes").default(0),
  versesRead: integer("verses_read").default(0),
  chatMessages: integer("chat_messages").default(0),
  completedChapter: integer("completed_chapter").default(0), // 0 = partial, 1 = completed
  mood: text("mood"), // optional mood tracking
  notes: text("notes"), // optional personal notes
  createdAt: timestamp("created_at").defaultNow(),
});

export const journeyMilestones = pgTable("journey_milestones", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  journeyId: integer("journey_id").notNull(),
  type: text("type").notNull(), // 'streak', 'chapters_read', 'time_spent', 'multi_religion', 'daily_goal'
  title: text("title").notNull(),
  description: text("description"),
  achievedAt: timestamp("achieved_at").defaultNow(),
  value: integer("value"), // the milestone number achieved
  badge: text("badge"), // badge icon/name
  isSpecial: integer("is_special").default(0), // 0 = regular, 1 = special milestone
});

export const weeklyProgress = pgTable("weekly_progress", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  journeyId: integer("journey_id").notNull(),
  weekStart: timestamp("week_start").notNull(),
  weekEnd: timestamp("week_end").notNull(),
  totalMinutes: integer("total_minutes").default(0),
  sessionsCount: integer("sessions_count").default(0),
  chaptersCompleted: integer("chapters_completed").default(0),
  goalAchieved: integer("goal_achieved").default(0), // 0 = not achieved, 1 = achieved
  religionsExplored: json("religions_explored"), // array of religions explored this week
  streakMaintained: integer("streak_maintained").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertScriptureSchema = createInsertSchema(scriptures);
export const insertChatMessageSchema = createInsertSchema(chatMessages);
export const insertUserReadingSchema = createInsertSchema(userReadings);
export const insertSpiritualJourneySchema = createInsertSchema(spiritualJourneys);
export const insertReadingSessionSchema = createInsertSchema(readingSessions);
export const insertJourneyMilestoneSchema = createInsertSchema(journeyMilestones);
export const insertWeeklyProgressSchema = createInsertSchema(weeklyProgress);

export type InsertScripture = z.infer<typeof insertScriptureSchema>;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type InsertUserReading = z.infer<typeof insertUserReadingSchema>;
export type InsertSpiritualJourney = z.infer<typeof insertSpiritualJourneySchema>;
export type InsertReadingSession = z.infer<typeof insertReadingSessionSchema>;
export type InsertJourneyMilestone = z.infer<typeof insertJourneyMilestoneSchema>;
export type InsertWeeklyProgress = z.infer<typeof insertWeeklyProgressSchema>;

export type Scripture = typeof scriptures.$inferSelect;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type UserReading = typeof userReadings.$inferSelect;
export type SpiritualJourney = typeof spiritualJourneys.$inferSelect;
export type ReadingSession = typeof readingSessions.$inferSelect;
export type JourneyMilestone = typeof journeyMilestones.$inferSelect;
export type WeeklyProgress = typeof weeklyProgress.$inferSelect;
export type User = typeof users.$inferSelect;
export type OtpCode = typeof otpCodes.$inferSelect;
export type RefreshToken = typeof refreshTokens.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertOtpCode = typeof otpCodes.$inferInsert;
export type InsertRefreshToken = typeof refreshTokens.$inferInsert;

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const loginSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().optional(),
  username: z.string().optional(),
  password: z.string().min(6),
}).refine(data => data.email || data.phone || data.username, {
  message: "Either email, phone, or username is required",
});

export const signupSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().optional(),
  username: z.string().min(3).max(20),
  password: z.string().min(6),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
}).refine(data => data.email || data.phone, {
  message: "Either email or phone is required",
});

// OTP verification schemas
export const sendOtpSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().optional(),
  purpose: z.enum(['signup', 'login', 'reset']),
}).refine(data => data.email || data.phone, {
  message: "Either email or phone is required",
});

export const verifyOtpSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().optional(),
  code: z.string().length(6),
  purpose: z.enum(['signup', 'login', 'reset']),
}).refine(data => data.email || data.phone, {
  message: "Either email or phone is required",
});

// Social auth schema
export const socialAuthCallbackSchema = z.object({
  provider: z.enum(['google', 'facebook', 'twitter', 'instagram']),
  code: z.string(),
  state: z.string().optional(),
});

// Notification preferences schema
export const updateNotificationPreferencesSchema = z.object({
  email: z.boolean().optional(),
  sms: z.boolean().optional(),
  push: z.boolean().optional(),
});

export const religionSchema = z.enum(['christianity', 'islam', 'judaism', 'hinduism', 'buddhism']);
export type Religion = z.infer<typeof religionSchema>;

export const scriptureRequestSchema = z.object({
  religion: religionSchema,
  book: z.string(),
  chapter: z.number().min(1),
});

export const chatRequestSchema = z.object({
  message: z.string().min(1),
  sessionId: z.string(),
  context: z.object({
    religion: religionSchema.nullable(),
    book: z.string().nullable(),
    chapter: z.number().nullable(),
    multiReligiousPerspective: z.boolean().optional(),
    persona: z.string().nullable().optional(),
  }).optional(),
});

// Progress tracking schemas
export const startReadingSessionSchema = z.object({
  religion: religionSchema,
  book: z.string(),
  chapter: z.number().min(1),
});

export const updateReadingSessionSchema = z.object({
  sessionId: z.number(),
  endTime: z.string().optional(),
  durationMinutes: z.number().min(0).optional(),
  versesRead: z.number().min(0).optional(),
  chatMessages: z.number().min(0).optional(),
  completedChapter: z.boolean().optional(),
  mood: z.string().optional(),
  notes: z.string().optional(),
});

export const updateJourneyGoalSchema = z.object({
  readingGoal: z.number().min(0).max(10080), // max 1 week in minutes
});
