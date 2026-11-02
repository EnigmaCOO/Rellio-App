/**
 * Onboarding domain routes — /api/v1/onboarding
 *
 * Persists SoulSet onboarding profiles for authenticated users.
 * Guest onboarding lives in localStorage on the client; this endpoint
 * merges it into the database on account creation or explicit save.
 */

import { Router } from "express";
import { z } from "zod";
import { db } from "../../db";
import { onboardingProfiles } from "@shared/schema";
import { eq } from "drizzle-orm";

const onboardingSchema = z.object({
  goals: z.array(z.string()).min(1, "At least one goal is required"),
  traditions: z.array(z.string()).optional().default([]),
  topics: z.array(z.string()).optional().default([]),
  readingRhythm: z.enum(["daily", "few_times_week", "weekends", "casual"]).default("casual"),
  reminderEnabled: z.boolean().optional().default(false),
  reminderTime: z.string().optional().default("08:00"),
  language: z.string().optional().default("en"),
  fontSize: z.enum(["small", "medium", "large"]).optional().default("medium"),
});

export function createOnboardingRouter(): Router {
  const router = Router();

  // GET /api/v1/onboarding/profile — fetch the current user's onboarding profile
  router.get("/profile", async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        // Guests: profile lives in localStorage, not the DB
        return res.json({ exists: false, profile: null });
      }

      const [profile] = await db
        .select()
        .from(onboardingProfiles)
        .where(eq(onboardingProfiles.userId, userId))
        .limit(1);

      if (!profile) {
        return res.json({ exists: false, profile: null });
      }

      res.json({ exists: true, profile });
    } catch (err) {
      console.error("[onboarding] GET /profile error:", err);
      res.status(500).json({ error: "Failed to fetch onboarding profile" });
    }
  });

  // POST /api/v1/onboarding/complete — save or update onboarding profile
  router.post("/complete", async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        // Guests: acknowledge without saving to DB
        return res.json({ saved: false, reason: "guest" });
      }

      const data = onboardingSchema.parse(req.body);

      const existing = await db
        .select({ id: onboardingProfiles.id })
        .from(onboardingProfiles)
        .where(eq(onboardingProfiles.userId, userId))
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(onboardingProfiles)
          .set({
            goals: data.goals,
            traditions: data.traditions,
            topics: data.topics,
            readingRhythm: data.readingRhythm,
            reminderEnabled: data.reminderEnabled ? 1 : 0,
            reminderTime: data.reminderTime,
            language: data.language,
            fontSize: data.fontSize,
            completed: 1,
            completedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(onboardingProfiles.userId, userId));
      } else {
        await db.insert(onboardingProfiles).values({
          userId,
          goals: data.goals,
          traditions: data.traditions,
          topics: data.topics,
          readingRhythm: data.readingRhythm,
          reminderEnabled: data.reminderEnabled ? 1 : 0,
          reminderTime: data.reminderTime,
          language: data.language,
          fontSize: data.fontSize,
          completed: 1,
          completedAt: new Date(),
        });
      }

      res.json({ saved: true });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid onboarding data", details: err.errors });
      }
      console.error("[onboarding] POST /complete error:", err);
      res.status(500).json({ error: "Failed to save onboarding profile" });
    }
  });

  // POST /api/v1/onboarding/merge — merge guest localStorage profile on sign-up
  router.post("/merge", async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Authentication required for merge" });
      }

      const data = onboardingSchema.parse(req.body);

      const existing = await db
        .select({ id: onboardingProfiles.id })
        .from(onboardingProfiles)
        .where(eq(onboardingProfiles.userId, userId))
        .limit(1);

      if (existing.length === 0) {
        await db.insert(onboardingProfiles).values({
          userId,
          goals: data.goals,
          traditions: data.traditions,
          topics: data.topics,
          readingRhythm: data.readingRhythm,
          reminderEnabled: data.reminderEnabled ? 1 : 0,
          reminderTime: data.reminderTime,
          language: data.language,
          fontSize: data.fontSize,
          completed: 1,
          completedAt: new Date(),
        });
      }
      // If a profile already exists (user onboarded while logged in), skip merge

      res.json({ merged: true });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid onboarding data", details: err.errors });
      }
      console.error("[onboarding] POST /merge error:", err);
      res.status(500).json({ error: "Failed to merge onboarding profile" });
    }
  });

  return router;
}
