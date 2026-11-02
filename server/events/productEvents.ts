/**
 * Canonical product event definitions for Rellio.
 *
 * All progress, achievement, streak, and challenge logic should be triggered
 * by publishing events through this module instead of calling storage/services
 * directly. This keeps domain logic decoupled and makes future event streaming easy.
 *
 * Usage:
 *   import { publishEvent } from "@server/events/productEvents";
 *   await publishEvent({ type: "reading_started", payload: { ... } });
 */

import type { Religion } from "@shared/schema";

// ─── Event Shapes ────────────────────────────────────────────────────────────

export interface ReadingStartedEvent {
  type: "reading_started";
  payload: {
    userId: string | number;
    religion: Religion;
    book: string;
    chapter: number;
    sessionId: number;
    timestamp: Date;
  };
}

export interface ReadingUpdatedEvent {
  type: "reading_updated";
  payload: {
    userId: string | number;
    sessionId: number;
    versesRead: number;
    durationMinutes: number;
    timestamp: Date;
  };
}

export interface VerseBookmarkedEvent {
  type: "verse_bookmarked";
  payload: {
    userId: string | number;
    religion: Religion;
    book: string;
    chapter: number;
    verse: number;
    timestamp: Date;
  };
}

export interface NoteCreatedEvent {
  type: "note_created";
  payload: {
    userId: string | number;
    religion: Religion;
    book: string;
    chapter: number;
    content: string;
    timestamp: Date;
  };
}

export interface ComparisonSavedEvent {
  type: "comparison_saved";
  payload: {
    userId: string | number;
    theme: string;
    religions: Religion[];
    timestamp: Date;
  };
}

export interface ChallengeJoinedEvent {
  type: "challenge_joined";
  payload: {
    userId: string | number;
    challengeId: string;
    timestamp: Date;
  };
}

export interface StreakUpdatedEvent {
  type: "streak_updated";
  payload: {
    userId: string | number;
    currentStreak: number;
    longestStreak: number;
    timestamp: Date;
  };
}

export interface AchievementUnlockedEvent {
  type: "achievement_unlocked";
  payload: {
    userId: string | number;
    achievementId: string;
    title: string;
    timestamp: Date;
  };
}

export interface CommunityPostCreatedEvent {
  type: "community_post_created";
  payload: {
    userId: string | number;
    postId: string;
    religion?: Religion;
    timestamp: Date;
  };
}

export type ProductEvent =
  | ReadingStartedEvent
  | ReadingUpdatedEvent
  | VerseBookmarkedEvent
  | NoteCreatedEvent
  | ComparisonSavedEvent
  | ChallengeJoinedEvent
  | StreakUpdatedEvent
  | AchievementUnlockedEvent
  | CommunityPostCreatedEvent;

// ─── Event Bus ───────────────────────────────────────────────────────────────

type EventHandler<T extends ProductEvent = ProductEvent> = (event: T) => Promise<void> | void;

const handlers = new Map<string, EventHandler[]>();

/**
 * Subscribe to a product event type.
 * Returns an unsubscribe function.
 */
export function onEvent<T extends ProductEvent>(
  type: T["type"],
  handler: EventHandler<T>,
): () => void {
  if (!handlers.has(type)) {
    handlers.set(type, []);
  }
  handlers.get(type)!.push(handler as EventHandler);
  return () => {
    const existing = handlers.get(type);
    if (existing) {
      handlers.set(type, existing.filter(h => h !== handler));
    }
  };
}

/**
 * Publish a product event. All registered handlers are called asynchronously.
 * Errors in individual handlers are logged but do not propagate.
 */
export async function publishEvent(event: ProductEvent): Promise<void> {
  const eventHandlers = handlers.get(event.type) || [];
  await Promise.allSettled(
    eventHandlers.map(async (handler) => {
      try {
        await handler(event as any);
      } catch (err) {
        console.error(`[ProductEvent] Handler error for "${event.type}":`, err);
      }
    }),
  );
}
