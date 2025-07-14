import { pgTable, text, serial, integer, json, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
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
  timestamp: timestamp("timestamp").defaultNow(),
});

export const userReadings = pgTable("user_readings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
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
  username: true,
  password: true,
});

export const religionSchema = z.enum(['bible', 'quran', 'torah', 'buddhist', 'hindu']);
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
  }).optional(),
});
