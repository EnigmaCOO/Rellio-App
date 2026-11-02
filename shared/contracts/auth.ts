import { z } from "zod";

export const loginRequestDto = z.object({
  email: z.string().email().optional(),
  phone: z.string().optional(),
  otp: z.string().length(6).optional(),
  provider: z.enum(["email", "phone", "google", "guest"]).optional(),
});

export const authResponseDto = z.object({
  id: z.union([z.string(), z.number()]),
  email: z.string().optional(),
  displayName: z.string().optional(),
  isGuest: z.boolean(),
  token: z.string().optional(),
});

export type LoginRequestDto = z.infer<typeof loginRequestDto>;
export type AuthResponseDto = z.infer<typeof authResponseDto>;
