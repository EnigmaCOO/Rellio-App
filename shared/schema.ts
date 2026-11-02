import { pgTable, text, serial, integer, json, timestamp, varchar, index, uniqueIndex, vector } from "drizzle-orm/pg-core";
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
  banned: integer("banned").default(0), // 0 = false, 1 = true
  banReason: text("ban_reason"),
  banExpiresAt: timestamp("ban_expires_at"),
  moderationWarnings: integer("moderation_warnings").default(0),
  firebaseUid: varchar("firebase_uid").unique(),
  welcomeEmailSentAt: timestamp("welcome_email_sent_at"),
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

// ─── Scholar Engine: embedded scripture chunks (pgvector) ────────────────────
// One row per verse-sized chunk, scoped by `namespace` (corpus + translation
// edition, e.g. "quran:en.asad"). The embedding dimension (768) is pinned here
// and at table-creation time in scripts/setup-pgvector.ts — both must agree with
// the embedding model (default Gemini gemini-embedding-001, reduced to 768 dims).
// Not yet wired into any
// runtime pipeline; populated by scripts/ingest-scriptures.ts and queried by
// lib/retrieval/search.ts.
export const scriptureChunks = pgTable(
  "scripture_chunks",
  {
    id: serial("id").primaryKey(),
    refId: text("ref_id").notNull(), // canonical id, e.g. "quran:2:255"
    tradition: text("tradition").notNull(), // TraditionId, e.g. "islam"
    book: text("book").notNull(),
    chapter: integer("chapter").notNull(),
    verse: integer("verse").notNull(),
    originalText: text("original_text").notNull(), // verse in source language
    originalLang: text("original_lang").notNull(), // ISO-ish code, e.g. "ar"
    translation: text("translation").notNull(),
    translationSource: text("translation_source").notNull(), // edition id, e.g. "en.asad"
    embedding: vector("embedding", { dimensions: 768 }).notNull(),
    namespace: text("namespace").notNull(), // corpus + edition, e.g. "quran:en.asad"
  },
  (table) => [
    // Idempotency key for upserts during (re-)ingestion.
    uniqueIndex("scripture_chunks_ref_ns_uq").on(table.refId, table.namespace),
    // Scoping filter for namespace/tradition-bounded nearest-neighbour search.
    index("scripture_chunks_ns_tradition_idx").on(table.namespace, table.tradition),
    // Approximate-NN index for cosine similarity over the embedding column.
    index("scripture_chunks_embedding_idx").using(
      "hnsw",
      table.embedding.op("vector_cosine_ops"),
    ),
  ],
);

export const insertScriptureChunkSchema = createInsertSchema(scriptureChunks).omit({ id: true });
export type InsertScriptureChunk = z.infer<typeof insertScriptureChunkSchema>;
export type ScriptureChunk = typeof scriptureChunks.$inferSelect;

// Commentary vector store (Scholar Engine). Each row is an excerpt of a named
// commentary work (e.g. Rashi) anchored, via `onRef`, to the scripture verse it
// comments on. Mirrors scripture_chunks (same 768-dim embedding + HNSW cosine).
// Add-only; not wired into any runtime pipeline yet.
export const commentaryChunks = pgTable(
  "commentary_chunks",
  {
    id: serial("id").primaryKey(),
    sourceId: text("source_id").notNull(), // CommentarySource.id, e.g. "rashi"
    sourceTitle: text("source_title").notNull(),
    author: text("author").notNull(),
    onRef: text("on_ref").notNull(), // scripture refId commented on, e.g. "torah:Genesis:1:1"
    chunkIndex: integer("chunk_index").notNull().default(0), // nth excerpt for (source, onRef)
    text: text("text").notNull(), // the commentary excerpt (HTML stripped)
    language: text("language").notNull(), // ISO-ish code, e.g. "en"
    tradition: text("tradition").notNull(), // TraditionId, e.g. "judaism"
    embedding: vector("embedding", { dimensions: 768 }).notNull(),
    namespace: text("namespace").notNull(), // source-scoped, e.g. "commentary:judaism:rashi"
  },
  (table) => [
    // Idempotency key — allows multiple excerpts per (source, onRef) without dupes.
    uniqueIndex("commentary_chunks_ns_ref_chunk_uq").on(
      table.namespace,
      table.onRef,
      table.chunkIndex,
    ),
    // Scoping filter for namespace/tradition-bounded nearest-neighbour search.
    index("commentary_chunks_ns_tradition_idx").on(table.namespace, table.tradition),
    // Lookup support for getCommentaryForRefs (tradition + onRef IN (...)).
    index("commentary_chunks_tradition_ref_idx").on(table.tradition, table.onRef),
    // Approximate-NN index for cosine similarity over the embedding column.
    index("commentary_chunks_embedding_idx").using(
      "hnsw",
      table.embedding.op("vector_cosine_ops"),
    ),
  ],
);

export const insertCommentaryChunkSchema = createInsertSchema(commentaryChunks).omit({ id: true });
export type InsertCommentaryChunk = z.infer<typeof insertCommentaryChunkSchema>;
export type CommentaryChunk = typeof commentaryChunks.$inferSelect;

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

// Flagged messages table for content moderation
export const flaggedMessages = pgTable("flagged_messages", {
  id: serial("id").primaryKey(),
  messageId: integer("message_id").notNull(),
  sessionId: text("session_id").notNull(),
  userId: varchar("user_id"),
  content: text("content").notNull(),
  flagReason: text("flag_reason").notNull(), // 'hate_speech', 'offensive_language', 'bias', 'user_report'
  moderationAction: text("moderation_action"), // 'blocked', 'warning', 'reviewed', 'approved'
  moderatorId: varchar("moderator_id"),
  reportedBy: varchar("reported_by"), // for user reports
  aiConfidence: integer("ai_confidence"), // 0-100 for AI-detected issues
  createdAt: timestamp("created_at").defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
});

// Moderation logs table for audit trail
export const moderationLogs = pgTable("moderation_logs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id"),
  action: text("action").notNull(), // 'message_blocked', 'warning_issued', 'user_banned', 'user_unbanned'
  details: json("details"), // additional context
  moderatorId: varchar("moderator_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Saved verse bookmarks
export const bookmarks = pgTable("bookmarks", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  religion: text("religion").notNull(),
  book: text("book").notNull(),
  chapter: integer("chapter").notNull(),
  verse: integer("verse").notNull(),
  text: text("text").notNull(),
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertBookmarkSchema = createInsertSchema(bookmarks).omit({ id: true, createdAt: true });
export type Bookmark = typeof bookmarks.$inferSelect;
export type InsertBookmark = z.infer<typeof insertBookmarkSchema>;

// Verse highlights
export const verseHighlights = pgTable("verse_highlights", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  religion: text("religion").notNull(),
  book: text("book").notNull(),
  chapter: integer("chapter").notNull(),
  verse: integer("verse").notNull(),
  color: text("color").notNull().default("gold"), // 'gold' | 'violet' | 'teal'
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertHighlightSchema = createInsertSchema(verseHighlights).omit({ id: true, createdAt: true });
export type VerseHighlight = typeof verseHighlights.$inferSelect;
export type InsertVerseHighlight = z.infer<typeof insertHighlightSchema>;

// Verse notes
export const verseNotes = pgTable("verse_notes", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  religion: text("religion").notNull(),
  book: text("book").notNull(),
  chapter: integer("chapter").notNull(),
  verse: integer("verse").notNull(),
  text: text("text").notNull(),
  verseText: text("verse_text"),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertVerseNoteSchema = createInsertSchema(verseNotes).omit({ id: true, createdAt: true, updatedAt: true });
export type VerseNote = typeof verseNotes.$inferSelect;
export type InsertVerseNote = z.infer<typeof insertVerseNoteSchema>;

// ─── EPUB Reader (iBooks-style) ──────────────────────────────────────────────

// Per-user reading position for an EPUB book
export const bookProgress = pgTable("book_progress", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  bookId: varchar("book_id").notNull(),
  cfi: text("cfi"),
  percentage: integer("percentage").default(0),
  updatedAt: timestamp("updated_at").defaultNow(),
});
export const insertBookProgressSchema = createInsertSchema(bookProgress).omit({ id: true, updatedAt: true });
export type BookProgress = typeof bookProgress.$inferSelect;
export type InsertBookProgress = z.infer<typeof insertBookProgressSchema>;

// Bookmarks within an EPUB book
export const bookBookmarks = pgTable("book_bookmarks", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  bookId: varchar("book_id").notNull(),
  cfi: text("cfi").notNull(),
  label: text("label"),
  snippet: text("snippet"),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertBookBookmarkSchema = createInsertSchema(bookBookmarks).omit({ id: true, createdAt: true });
export type BookBookmark = typeof bookBookmarks.$inferSelect;
export type InsertBookBookmark = z.infer<typeof insertBookBookmarkSchema>;

// Highlights and notes (combined: a row is a highlight, optionally with a note)
export const bookAnnotations = pgTable("book_annotations", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  bookId: varchar("book_id").notNull(),
  cfiRange: text("cfi_range").notNull(),
  color: text("color").notNull().default("yellow"),
  text: text("text"),
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
export const insertBookAnnotationSchema = createInsertSchema(bookAnnotations).omit({ id: true, createdAt: true, updatedAt: true });
export type BookAnnotation = typeof bookAnnotations.$inferSelect;
export type InsertBookAnnotation = z.infer<typeof insertBookAnnotationSchema>;

// ─── Saved Comparisons ────────────────────────────────────────────────────────
export const savedComparisons = pgTable("saved_comparisons", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  theme: text("theme").notNull(),
  faiths: json("faiths").$type<string[]>().notNull(),
  result: json("result").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSavedComparisonSchema = createInsertSchema(savedComparisons).omit({ id: true, createdAt: true });
export type SavedComparison = typeof savedComparisons.$inferSelect;
export type InsertSavedComparison = z.infer<typeof insertSavedComparisonSchema>;

// SoulSet onboarding profile — one per user (or guest localStorage key)
export const onboardingProfiles = pgTable("onboarding_profiles", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().unique(),
  goals: json("goals").$type<string[]>().notNull().default([]),
  traditions: json("traditions").$type<string[]>().default([]),
  topics: json("topics").$type<string[]>().default([]),
  readingRhythm: varchar("reading_rhythm").default("casual"),
  reminderEnabled: integer("reminder_enabled").default(0),
  reminderTime: varchar("reminder_time").default("08:00"),
  language: varchar("language").default("en"),
  fontSize: varchar("font_size").default("medium"),
  completed: integer("completed").default(0),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertOnboardingProfileSchema = createInsertSchema(onboardingProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type OnboardingProfile = typeof onboardingProfiles.$inferSelect;
export type InsertOnboardingProfile = typeof onboardingProfiles.$inferInsert;

export const insertScriptureSchema = createInsertSchema(scriptures);
export const insertChatMessageSchema = createInsertSchema(chatMessages);
export const insertUserReadingSchema = createInsertSchema(userReadings);
export const insertSpiritualJourneySchema = createInsertSchema(spiritualJourneys);
export const insertReadingSessionSchema = createInsertSchema(readingSessions);
export const insertJourneyMilestoneSchema = createInsertSchema(journeyMilestones);
export const insertWeeklyProgressSchema = createInsertSchema(weeklyProgress);
export const insertFlaggedMessageSchema = createInsertSchema(flaggedMessages);
export const insertModerationLogSchema = createInsertSchema(moderationLogs);

export type InsertScripture = z.infer<typeof insertScriptureSchema>;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type InsertUserReading = z.infer<typeof insertUserReadingSchema>;
export type InsertSpiritualJourney = z.infer<typeof insertSpiritualJourneySchema>;
export type InsertReadingSession = z.infer<typeof insertReadingSessionSchema>;
export type InsertJourneyMilestone = z.infer<typeof insertJourneyMilestoneSchema>;
export type InsertWeeklyProgress = z.infer<typeof insertWeeklyProgressSchema>;
export type InsertFlaggedMessage = z.infer<typeof insertFlaggedMessageSchema>;
export type InsertModerationLog = z.infer<typeof insertModerationLogSchema>;

export type Scripture = typeof scriptures.$inferSelect;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type UserReading = typeof userReadings.$inferSelect;
export type SpiritualJourney = typeof spiritualJourneys.$inferSelect;
export type ReadingSession = typeof readingSessions.$inferSelect;
export type JourneyMilestone = typeof journeyMilestones.$inferSelect;
export type WeeklyProgress = typeof weeklyProgress.$inferSelect;
export type FlaggedMessage = typeof flaggedMessages.$inferSelect;
export type ModerationLog = typeof moderationLogs.$inferSelect;
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

export const religionSchema = z.enum(['christianity', 'islam', 'judaism', 'hinduism', 'buddhism', 'shintoism', 'sikhism']);
export type Religion = z.infer<typeof religionSchema>;

export const scholarlyChatModeSchema = z.enum(['ask', 'single', 'compare', 'passage_scholar']);
export type ScholarlyChatMode = z.infer<typeof scholarlyChatModeSchema>;

export const passageSelectionSchema = z.object({
  text: z.string().trim().min(1).max(4000),
  cfiRange: z.string().max(2000).optional(),
});

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
    mode: scholarlyChatModeSchema.optional(),
    selectedSources: z.array(z.string()).max(20).optional(),
    selectedTraditions: z.array(religionSchema).max(7).optional(),
    bookTitle: z.string().max(250).nullable().optional(),
    edition: z.string().max(250).nullable().optional(),
    cfi: z.string().max(2000).nullable().optional(),
    percentage: z.number().min(0).max(100).nullable().optional(),
    passageSelection: passageSelectionSchema.nullable().optional(),
  }).optional(),
});

// ─── Structured Response Contract ──────────────────────────────────────────────

export type ResponseMode = "strict_source_grounded" | "general" | "comparative";

export interface ResponseMeta {
  titleLabel: string;
  scopeLabel: string;
  answeringFromLabel?: string;
  grounded: boolean;
}

export interface ResponseReference {
  tradition: string;
  source: string;
  citation: string;
  text: string;
  edition?: string;
  refId?: string;
  kind?: "scripture" | "commentary";
}

export type ResponseSectionType =
  | "direct_answer"
  | "source_explanation"
  | "tradition_view"
  | "comparison_overlap"
  | "comparison_difference"
  | "synthesis"
  | "limitations"
  | "next_steps";

export interface ResponseSection {
  type: ResponseSectionType;
  tradition?: string;
  heading: string;
  body: string;
}

export interface StructuredChatResponse {
  mode: ResponseMode;
  meta: ResponseMeta;
  summary: string;
  sections: ResponseSection[];
  references: ResponseReference[];
  limitations?: string;
  coverage?: {
    requestedTraditions: string[];
    evidencedTraditions: string[];
    missingTraditions: string[];
    failedTraditions?: string[];
  };
  followups?: string[];
  renderHints?: {
    answerStyle?: "in_depth" | "concise";
    groupReferencesByTradition?: boolean;
  };
}

// Compare Mode schema for cross-religious verse comparison
export const compareRequestSchema = z.object({
  theme: z.string().min(1),
  sessionId: z.string(),
  maxVersesPerReligion: z.number().min(1).max(10).default(5),
  selectedTraditions: z.array(religionSchema).max(7).optional(),
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

// ─── Community ─────────────────────────────────────────────────────────────────

export const communityCircles = pgTable("community_circles", {
  id:          serial("id").primaryKey(),
  name:        text("name").notNull(),
  description: text("description"),
  topic:       varchar("topic", { length: 80 }),
  imageEmoji:  varchar("image_emoji", { length: 8 }).default("🌟"),
  memberCount: integer("member_count").default(0),
  isPublic:    integer("is_public").default(1), // 1=true 0=false
  createdAt:   timestamp("created_at").defaultNow(),
});

export const circleMembers = pgTable("circle_members", {
  id:       serial("id").primaryKey(),
  circleId: integer("circle_id").notNull(),
  userId:   varchar("user_id").notNull(),
  joinedAt: timestamp("joined_at").defaultNow(),
});

export const communityPosts = pgTable("community_posts", {
  id:            serial("id").primaryKey(),
  userId:        varchar("user_id").notNull(),
  circleId:      integer("circle_id"), // null = general feed
  content:       text("content").notNull(),
  scriptureRef:  text("scripture_ref"),
  scriptureText: text("scripture_text"),
  reactionCount: integer("reaction_count").default(0),
  replyCount:    integer("reply_count").default(0),
  reportCount:   integer("report_count").default(0),
  isHidden:      integer("is_hidden").default(0), // moderation
  createdAt:     timestamp("created_at").defaultNow(),
});

export const communityReplies = pgTable("community_replies", {
  id:        serial("id").primaryKey(),
  postId:    integer("post_id").notNull(),
  userId:    varchar("user_id").notNull(),
  content:   text("content").notNull(),
  isHidden:  integer("is_hidden").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const communityReactions = pgTable("community_reactions", {
  id:        serial("id").primaryKey(),
  postId:    integer("post_id").notNull(),
  userId:    varchar("user_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const communityReports = pgTable("community_reports", {
  id:        serial("id").primaryKey(),
  postId:    integer("post_id"),
  replyId:   integer("reply_id"),
  userId:    varchar("user_id").notNull(),
  reason:    text("reason").notNull(),
  status:    varchar("status", { length: 20 }).default("pending"), // pending | resolved
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── Community insert schemas + types ─────────────────────────────────────────

export const insertCircleSchema = createInsertSchema(communityCircles).omit({ id: true, memberCount: true, createdAt: true });
export type InsertCircle = z.infer<typeof insertCircleSchema>;
export type Circle = typeof communityCircles.$inferSelect;

export const insertCircleMemberSchema = createInsertSchema(circleMembers).omit({ id: true, joinedAt: true });
export type InsertCircleMember = z.infer<typeof insertCircleMemberSchema>;
export type CircleMember = typeof circleMembers.$inferSelect;

export const insertCommunityPostSchema = createInsertSchema(communityPosts).omit({ id: true, reactionCount: true, replyCount: true, reportCount: true, isHidden: true, createdAt: true });
export type InsertCommunityPost = z.infer<typeof insertCommunityPostSchema>;
export type CommunityPost = typeof communityPosts.$inferSelect;

export const insertCommunityReplySchema = createInsertSchema(communityReplies).omit({ id: true, isHidden: true, createdAt: true });
export type InsertCommunityReply = z.infer<typeof insertCommunityReplySchema>;
export type CommunityReply = typeof communityReplies.$inferSelect;

export const insertCommunityReactionSchema = createInsertSchema(communityReactions).omit({ id: true, createdAt: true });
export type InsertCommunityReaction = z.infer<typeof insertCommunityReactionSchema>;
export type CommunityReaction = typeof communityReactions.$inferSelect;

export const insertCommunityReportSchema = createInsertSchema(communityReports).omit({ id: true, status: true, createdAt: true });
export type InsertCommunityReport = z.infer<typeof insertCommunityReportSchema>;
export type CommunityReport = typeof communityReports.$inferSelect;

// ─── Zod validation for API bodies ────────────────────────────────────────────

export const createPostBodySchema = z.object({
  content:       z.string().min(1).max(2000),
  circleId:      z.number().int().positive().optional(),
  scriptureRef:  z.string().max(120).optional(),
  scriptureText: z.string().max(500).optional(),
});

export const createReplyBodySchema = z.object({
  content: z.string().min(1).max(1000),
});

export const reportBodySchema = z.object({
  reason:  z.string().min(1).max(500),
  replyId: z.number().int().positive().optional(),
});
