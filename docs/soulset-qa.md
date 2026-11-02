# SoulSet Onboarding + Home — QA Document

## Overview

This document describes the expected behavior for three key scenarios: first-time user flow,
returning user flow, and guest-to-account merge behavior.

---

## 1. First-Time User Flow

**Entry point:** User arrives at `/` (landing page) and taps the primary CTA.

### Expected behavior

| Step | What happens |
|------|-------------|
| Landing | User sees the Rellio marketing landing page. |
| Auth or skip | User may sign up, log in, or proceed as a guest. |
| Splash | Navigating to `/onboarding` shows a 2-second branded splash (step 0 auto-advances). |
| Welcome | Value proposition screen with "Begin your journey" CTA and a "Skip for now" link. |
| Goals | Multi-select chip grid. **At least one goal is required.** The Continue button stays disabled and a prompt appears until a goal is chosen. |
| Traditions | Multi-select chips for 5 faiths. "Skip this step" label shows when nothing is selected. |
| Topics | 10 interest chips in a 2-column grid. Optional. |
| Reading rhythm | Single-select card list (daily / few times / weekends / casual). |
| Reminders | Toggle for daily reminder + time picker (only shown when toggle is on). |
| Language & size | Language dropdown + small/medium/large text size. |
| Summary | Displays all chosen values in labeled rows. "Enter Rellio" CTA. |
| Transition | Brief "Setting up your journey" screen with animated dots, then redirect to `/home`. |

### Acceptance criteria
- Onboarding completes in under 2 minutes for a typical user.
- Tapping "Enter Rellio" on the Summary screen:
  - Saves profile to `localStorage` key `rellio_onboarding`.
  - POSTs to `/api/v1/onboarding/complete` if the user is authenticated.
  - Redirects to `/home`.
- Without a goal selected, the Goals "Continue" button is disabled.
- Skipping to `/home` via "Skip for now" bypasses the remainder of the wizard.

---

## 2. Returning User Flow

**Entry point:** User revisits the app or opens a direct link.

### Expected behavior

| Condition | What happens |
|-----------|-------------|
| `rellio_onboarding.completed === true` in localStorage | User is sent directly to `/home`. Onboarding is NOT shown again. |
| User navigates to `/home` or `/read` | Works normally — AppShell with bottom nav is present. |
| User navigates to `/onboarding` manually | Wizard loads (allows editing preferences — all fields are pre-populated). |
| Home personalization | Traditions, topics, goals from profile drive the "Your traditions" section, weekly quote topic, and greeting line. |
| Progress API returns data | "Continue Reading" card shows the last active session. "Your progress" stats reflect real journey data. |
| Progress API unavailable or empty | Graceful fallbacks: "Start your first session" card and empty-state progress tile are shown. |

### Acceptance criteria
- Home content visibly differs based on selected traditions and topics.
- A returning user with `completed: true` in localStorage never sees the onboarding splash.
- Bottom navigation (Home / Read / Compare / Community / Profile) is always visible on app routes.
- The `/read` route resolves to the existing scripture dashboard (alias of `/dashboard`).

---

## 3. Guest-to-Account Merge Behavior

**Scenario:** User completes onboarding as a guest, then creates an account.

### Expected behavior

| Step | What happens |
|------|-------------|
| Guest completes onboarding | Profile is written to `localStorage` key `rellio_onboarding`. API returns `{ saved: false, reason: "guest" }` — no DB write. |
| Guest navigates to `/home` | Home loads using the localStorage profile for personalization. |
| Guest taps "Create free account" on the premium prompt | Navigates to `/auth`. |
| Account created successfully | Auth page (or calling code) should invoke `mergeGuestOnboardingToAccount()` from `useOnboarding.ts`. |
| Merge call | `POST /api/v1/onboarding/merge` with the localStorage profile body. Server inserts a DB row for the new `userId` **only if no profile already exists** for that user. |
| After merge | `localStorage` profile remains intact. Subsequent API calls to `GET /api/v1/onboarding/profile` return the merged DB record. |

### Acceptance criteria
- Guest onboarding choices are not lost when the user creates an account.
- If a user somehow has both a localStorage profile and an existing DB profile (e.g. logged in on a different device), the merge is skipped (DB profile takes precedence, no overwrite).
- `mergeGuestOnboardingToAccount()` is a no-op if onboarding was not completed (`completed: false`).

---

## How to invoke the merge in the auth flow

After a successful sign-up, add this call to the auth page or post-auth hook:

```typescript
import { mergeGuestOnboardingToAccount } from "@/hooks/useOnboarding";

// After successful account creation:
await mergeGuestOnboardingToAccount();
```

---

## API Reference

| Endpoint | Method | Auth required | Purpose |
|----------|--------|--------------|---------|
| `/api/v1/onboarding/profile` | GET | Optional | Fetch DB profile for the current session user. Returns `{ exists: false, profile: null }` for guests. |
| `/api/v1/onboarding/complete` | POST | Optional | Save/update onboarding profile. No-op for guests (returns `{ saved: false, reason: "guest" }`). |
| `/api/v1/onboarding/merge` | POST | Required | Insert DB profile for newly created account from localStorage data. Skips if profile already exists. |

### Request body shape (all three endpoints share the same body)

```json
{
  "goals": ["deepen_faith", "daily_habit"],
  "traditions": ["christianity", "buddhism"],
  "topics": ["prayer", "wisdom"],
  "readingRhythm": "daily",
  "reminderEnabled": true,
  "reminderTime": "08:00",
  "language": "en",
  "fontSize": "medium"
}
```

Validation: `goals` must contain at least one item. All other fields are optional with safe defaults.
