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

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  username: text("username").unique(),
  password: text("password"),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
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

export const insertScriptureSchema = createInsertSchema(scriptures);
export const insertChatMessageSchema = createInsertSchema(chatMessages);
export const insertUserReadingSchema = createInsertSchema(userReadings);

export type InsertScripture = z.infer<typeof insertScriptureSchema>;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type InsertUserReading = z.infer<typeof insertUserReadingSchema>;

export type Scripture = typeof scriptures.$inferSelect;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type UserReading = typeof userReadings.$inferSelect;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  username: true,
  password: true,
  firstName: true,
  lastName: true,
});

export const loginSchema = z.object({
  email: z.string().email().optional(),
  username: z.string().optional(),
  password: z.string().min(6),
}).refine(data => data.email || data.username, {
  message: "Either email or username is required",
});

export const signupSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(20),
  password: z.string().min(6),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
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
