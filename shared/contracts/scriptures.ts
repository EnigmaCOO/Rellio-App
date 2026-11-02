import { z } from "zod";
import { religionSchema } from "../schema";

export const scriptureVerseDto = z.object({
  religion: religionSchema,
  book: z.string(),
  chapter: z.number().int().positive(),
  verse: z.number().int().positive(),
  text: z.string(),
  translation: z.string().optional(),
  reference: z.string().optional(),
});

export const scriptureFetchRequestDto = z.object({
  religion: religionSchema,
  book: z.string(),
  chapter: z.number().int().positive(),
});

export const scriptureSeedStatusDto = z.object({
  seeded: z.boolean(),
  count: z.number(),
  religions: z.array(z.string()),
});

export type ScriptureVerseDto = z.infer<typeof scriptureVerseDto>;
export type ScriptureFetchRequestDto = z.infer<typeof scriptureFetchRequestDto>;
export type ScriptureSeedStatusDto = z.infer<typeof scriptureSeedStatusDto>;
