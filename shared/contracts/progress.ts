import { z } from "zod";
import { religionSchema } from "../schema";

export const readingSessionDto = z.object({
  id: z.number().optional(),
  userId: z.union([z.string(), z.number()]),
  religion: religionSchema,
  book: z.string(),
  chapter: z.number(),
  startTime: z.string().or(z.date()).optional(),
  endTime: z.string().or(z.date()).optional(),
  durationMinutes: z.number().optional(),
  versesRead: z.number().optional(),
  chatMessages: z.number().optional(),
  completedChapter: z.boolean().optional(),
});

export const journeyStatsDto = z.object({
  totalReadingSessions: z.number(),
  totalTimeMinutes: z.number(),
  currentStreak: z.number(),
  longestStreak: z.number(),
  favoriteReligion: religionSchema.nullable().optional(),
  lastActiveDate: z.string().or(z.date()).optional(),
});

export const milestoneDto = z.object({
  id: z.number(),
  title: z.string(),
  description: z.string(),
  achievedAt: z.string().or(z.date()),
  type: z.string(),
});

export type ReadingSessionDto = z.infer<typeof readingSessionDto>;
export type JourneyStatsDto = z.infer<typeof journeyStatsDto>;
export type MilestoneDto = z.infer<typeof milestoneDto>;
