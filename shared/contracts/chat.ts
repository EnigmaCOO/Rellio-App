import { z } from "zod";
import { religionSchema } from "../schema";

export const chatMessageDto = z.object({
  id: z.number().optional(),
  sessionId: z.string(),
  type: z.enum(["user", "ai"]),
  content: z.string(),
  context: z.object({
    religion: religionSchema.nullable().optional(),
    book: z.string().nullable().optional(),
    chapter: z.number().nullable().optional(),
    persona: z.string().nullable().optional(),
  }).optional(),
  timestamp: z.date().optional(),
});

export const chatRequestDto = z.object({
  message: z.string().min(1),
  sessionId: z.string(),
  context: z.object({
    religion: religionSchema.nullable().optional(),
    book: z.string().nullable().optional(),
    chapter: z.number().nullable().optional(),
    persona: z.string().nullable().optional(),
    multiReligiousPerspective: z.boolean().optional(),
  }).optional(),
});

export const chatResponseDto = z.object({
  userMessage: chatMessageDto,
  aiMessage: chatMessageDto,
});

export type ChatMessageDto = z.infer<typeof chatMessageDto>;
export type ChatRequestDto = z.infer<typeof chatRequestDto>;
export type ChatResponseDto = z.infer<typeof chatResponseDto>;
