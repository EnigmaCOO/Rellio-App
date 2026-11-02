/**
 * Rellio lightweight analytics tracker.
 *
 * All events are stored in localStorage so they survive page reloads
 * and can be batch-flushed when a real analytics endpoint is added.
 * The track() function never throws — analytics must never crash the app.
 */

export type AnalyticsEvent =
  | "home_opened"
  | "home_card_clicked"
  | "scripture_session_started"
  | "ai_prompt_clicked"
  | "ai_question_sent"
  | "ai_response_received"
  | "ai_voice_started"
  | "verse_bookmarked"
  | "verse_bookmark_removed"
  | "insight_saved"
  | "compare_mode_opened"
  | "compare_theme_selected"
  | "compare_tradition_toggled"
  | "compare_run_started"
  | "compare_result_received"
  | "compare_saved"
  | "compare_source_drawer_opened"
  | "compare_reader_cta_clicked"
  | "continue_reading_clicked"
  | "tradition_card_clicked"
  | "first_session_cta_clicked"
  | "auth_upgrade_cta_clicked"
  | "routine_slot_toggled"
  | "challenge_joined"
  | "achievement_unlocked"
  | "me_tab_changed"
  | "saved_item_opened";

interface TrackedEvent {
  event: AnalyticsEvent;
  properties?: Record<string, unknown>;
  timestamp: number;
}

const STORAGE_KEY = "rellio_events";
const MAX_EVENTS = 500;

export function track(event: AnalyticsEvent, properties?: Record<string, unknown>): void {
  try {
    const entry: TrackedEvent = { event, properties, timestamp: Date.now() };

    const raw = localStorage.getItem(STORAGE_KEY);
    const existing: TrackedEvent[] = raw ? JSON.parse(raw) : [];
    const updated = [...existing, entry].slice(-MAX_EVENTS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    if (import.meta.env.DEV) {
      console.debug(`[analytics] ${event}`, properties ?? "");
    }
  } catch {
    // silently swallow
  }
}

export function getEvents(): TrackedEvent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function clearEvents(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // silently swallow
  }
}
