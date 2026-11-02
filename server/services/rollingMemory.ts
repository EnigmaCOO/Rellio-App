import { storage } from "../storage";
import type { ChatMessage } from "@shared/schema";
import type { ConversationMessage } from "./openai";
import { summarizeConversation } from "./scholarModel";

/** Number of most-recent turns kept verbatim; older turns fold into the summary. */
const VERBATIM_TURNS = 3;

export interface InBookMemory {
  /** The last few turns, passed verbatim to the model. */
  conversationHistory: ConversationMessage[];
  /** Rolling summary of everything older than the verbatim window (if any). */
  summary?: string;
}

function toConversationMessage(msg: ChatMessage): ConversationMessage {
  return {
    role: msg.type === "user" ? "user" : "assistant",
    content: msg.content,
    timestamp: msg.timestamp ?? new Date(),
  };
}

/**
 * Build the in-book Scholar's rolling memory for a session:
 * - the last {@link VERBATIM_TURNS} turns verbatim, plus
 * - a running summary of all older turns.
 *
 * Older turns that have aged out of the verbatim window are folded into the
 * persisted running summary using the central Gemini wrapper. Only newly
 * aged-out turns are summarized on each call (tracked via `summarizedCount`),
 * so we don't re-summarize the whole history every message.
 *
 * `previousMessages` should be the conversation history WITHOUT the current
 * (just-received) user message.
 */
export async function buildInBookMemory(
  sessionId: string,
  previousMessages: ChatMessage[],
): Promise<InBookMemory> {
  const verbatim = previousMessages
    .slice(-VERBATIM_TURNS)
    .map(toConversationMessage);

  const olderCount = Math.max(0, previousMessages.length - VERBATIM_TURNS);
  const older = previousMessages.slice(0, olderCount);

  const existing = await storage.getConversationMemory(sessionId);
  let summary = existing?.summary ?? "";
  const summarizedCount = existing?.summarizedCount ?? 0;

  if (older.length > summarizedCount) {
    const newlyAgedOut = older.slice(summarizedCount).map(toConversationMessage);
    summary = await summarizeConversation(summary, newlyAgedOut);
    await storage.setConversationMemory(sessionId, {
      summary,
      summarizedCount: older.length,
    });
  }

  return {
    conversationHistory: verbatim,
    summary: summary.length > 0 ? summary : undefined,
  };
}
