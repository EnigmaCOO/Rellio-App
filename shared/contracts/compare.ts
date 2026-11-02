import { z } from "zod";
import { religionSchema } from "../schema";

export const compareRequestDto = z.object({
  theme: z.string().min(1),
  sessionId: z.string(),
  religions: z.array(religionSchema).optional(),
  maxVersesPerReligion: z.number().min(1).max(10).default(5),
});

export const compareVerseDto = z.object({
  religion: religionSchema,
  book: z.string(),
  chapter: z.number(),
  verse: z.number().optional(),
  text: z.string(),
  commentary: z.string().optional(),
});

export const compareResponseDto = z.object({
  theme: z.string(),
  verses: z.array(compareVerseDto),
  sharedWisdom: z.string().optional(),
  sessionId: z.string(),
});

export type CompareRequestDto = z.infer<typeof compareRequestDto>;
export type CompareVerseDto = z.infer<typeof compareVerseDto>;
export type CompareResponseDto = z.infer<typeof compareResponseDto>;
