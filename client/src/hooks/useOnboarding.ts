/**
 * Onboarding state management.
 *
 * Source of truth: localStorage ("rellio_onboarding").
 * For authenticated users the profile is also synced to /api/v1/onboarding.
 * Guests carry the profile in localStorage only; it is merged to the DB
 * automatically when they create an account.
 */

import { useState, useCallback } from "react";
import { apiRequest } from "@/lib/queryClient";

export type Goal =
  | "deepen_faith"
  | "compare_traditions"
  | "daily_habit"
  | "find_peace"
  | "community"
  | "learn";

export type ReadingRhythm = "daily" | "few_times_week" | "weekends" | "casual";
export type FontSize = "small" | "medium" | "large";

export interface OnboardingProfile {
  goals: Goal[];
  traditions: string[];
  topics: string[];
  readingRhythm: ReadingRhythm;
  reminderEnabled: boolean;
  reminderTime: string;
  language: string;
  fontSize: FontSize;
  completed: boolean;
  completedAt?: string;
}

const STORAGE_KEY = "rellio_onboarding";

const defaultProfile: OnboardingProfile = {
  goals: [],
  traditions: [],
  topics: [],
  readingRhythm: "casual",
  reminderEnabled: false,
  reminderTime: "08:00",
  language: "en",
  fontSize: "medium",
  completed: false,
};

export function loadOnboardingProfile(): OnboardingProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaultProfile };
    return { ...defaultProfile, ...JSON.parse(raw) };
  } catch {
    return { ...defaultProfile };
  }
}

export function saveOnboardingProfile(profile: Partial<OnboardingProfile>): OnboardingProfile {
  const current = loadOnboardingProfile();
  const merged = { ...current, ...profile };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  return merged;
}

export function clearOnboardingProfile(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function isOnboardingComplete(): boolean {
  return loadOnboardingProfile().completed === true;
}

/**
 * Persist the completed profile to the API for authenticated users.
 * Returns silently for guests.
 */
export async function persistOnboardingToApi(
  profile: OnboardingProfile,
): Promise<void> {
  try {
    await apiRequest("/api/v1/onboarding/complete", {
      method: "POST",
      body: JSON.stringify({
        goals: profile.goals,
        traditions: profile.traditions,
        topics: profile.topics,
        readingRhythm: profile.readingRhythm,
        reminderEnabled: profile.reminderEnabled,
        reminderTime: profile.reminderTime,
        language: profile.language,
        fontSize: profile.fontSize,
      }),
    });
  } catch {
    // Guest — server returns { saved: false, reason: 'guest' } which is fine
  }
}

/**
 * Call this after a guest creates an account to push their localStorage
 * onboarding data to the server.
 */
export async function mergeGuestOnboardingToAccount(): Promise<void> {
  const profile = loadOnboardingProfile();
  if (!profile.completed) return;
  try {
    await apiRequest("/api/v1/onboarding/merge", {
      method: "POST",
      body: JSON.stringify({
        goals: profile.goals,
        traditions: profile.traditions,
        topics: profile.topics,
        readingRhythm: profile.readingRhythm,
        reminderEnabled: profile.reminderEnabled,
        reminderTime: profile.reminderTime,
        language: profile.language,
        fontSize: profile.fontSize,
      }),
    });
  } catch {
    // Non-critical — local profile is still valid
  }
}

/** React hook for onboarding profile reactive state. */
export function useOnboarding() {
  const [profile, setProfile] = useState<OnboardingProfile>(loadOnboardingProfile);

  const update = useCallback((patch: Partial<OnboardingProfile>) => {
    const next = saveOnboardingProfile(patch);
    setProfile(next);
    return next;
  }, []);

  const complete = useCallback(
    async (finalPatch?: Partial<OnboardingProfile>) => {
      const completed: OnboardingProfile = saveOnboardingProfile({
        ...(finalPatch ?? {}),
        completed: true,
        completedAt: new Date().toISOString(),
      });
      setProfile(completed);
      await persistOnboardingToApi(completed);
      return completed;
    },
    [],
  );

  return { profile, update, complete, isComplete: profile.completed };
}
