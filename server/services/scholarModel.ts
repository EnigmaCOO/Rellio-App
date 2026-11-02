import OpenAI from "openai";
import type { ConversationMessage } from "./openai";
import { getScholarModel, getScholarMaxTokens } from "../config/models";
import { traceLog } from "../debug/trace";

/**
 * Central client wrapper for the in-book Scholar.
 *
 * The Scholar is backed by Gemini (Google AI Studio) via the configured
 * SCHOLAR_MODEL. Gemini exposes an OpenAI-compatible endpoint, so we reuse the
 * existing `openai` SDK pointed at the Gemini base URL — matching how the XAI
 * provider is wired in this codebase.
 *
 * On any Gemini failure this throws an EXPLICIT error. There is deliberately NO
 * cross-provider fallback for the in-book Scholar (user-confirmed): a failure
 * must surface, not silently switch models.
 */

const GEMINI_OPENAI_BASE_URL =
  "https://generativelanguage.googleapis.com/v1beta/openai/";

let cachedClient: OpenAI | null = null;

function getGeminiClient(): OpenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "In-book Scholar is not configured: GEMINI_API_KEY is missing. " +
        "Set the Gemini API key to enable the Scholar (SCHOLAR_MODEL).",
    );
  }
  if (!cachedClient) {
    cachedClient = new OpenAI({ apiKey, baseURL: GEMINI_OPENAI_BASE_URL });
  }
  return cachedClient;
}

type ChatRole = "system" | "user" | "assistant";

export interface ScholarGenerateParams {
  /** Fully-assembled system prompt (the grounded scholar prompt). */
  systemPrompt: string;
  /** Prior conversation turns to include verbatim (rolling-memory window). */
  conversationHistory?: ConversationMessage[];
  /** The current user message. */
  userMessage: string;
}

/**
 * Generate a Scholar response with Gemini using the configured SCHOLAR_MODEL and
 * SCHOLAR_MAX_TOKENS. Throws an explicit error on failure (no fallback).
 */
export async function generateScholarResponse({
  systemPrompt,
  conversationHistory = [],
  userMessage,
}: ScholarGenerateParams): Promise<string> {
  const model = getScholarModel();
  const maxTokens = getScholarMaxTokens();

  const messages: Array<{ role: ChatRole; content: string }> = [
    { role: "system", content: systemPrompt },
    ...conversationHistory.map((m) => ({
      role: m.role as ChatRole,
      content: m.content,
    })),
    { role: "user", content: userMessage },
  ];

  traceLog("model_call.in_book", {
    path: "in_book",
    provider: "gemini",
    model,
    max_tokens: maxTokens,
    temperature: 0.7,
    messages_summary: {
      count: messages.length,
      roles: messages.map((m) => m.role),
      system_prompt_has_provided_context: messages[0]?.content?.includes("PROVIDED CONTEXT") ?? false,
      user_message_preview: userMessage.slice(0, 200),
    },
    system_prompt: systemPrompt,
  });

  let response;
  try {
    response = await getGeminiClient().chat.completions.create({
      model,
      messages,
      max_tokens: maxTokens,
      temperature: 0.7,
    });
  } catch (err) {
    const anyErr = err as { status?: number; response?: { status?: number; data?: unknown }; code?: unknown; name?: unknown };
    traceLog("model_call.in_book.raw_error", {
      path: "in_book",
      provider: "gemini",
      model,
      error_name: anyErr?.name ?? null,
      error_code: anyErr?.code ?? null,
      http_status: anyErr?.status ?? anyErr?.response?.status ?? null,
      message: err instanceof Error ? err.message : String(err),
      response_body: anyErr?.response?.data ?? null,
    });
    const detail = err instanceof Error ? err.message : String(err);
    throw new Error(`In-book Scholar (Gemini ${model}) failed: ${detail}`);
  }

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error(`In-book Scholar (Gemini ${model}) returned an empty response.`);
  }
  return content;
}

/**
 * Fold older conversation turns into a running summary using the same central
 * Gemini wrapper. Used by the rolling-memory layer to compress turns that have
 * aged out of the verbatim window. Returns the updated summary text.
 */
export async function summarizeConversation(
  existingSummary: string,
  newTurns: ConversationMessage[],
): Promise<string> {
  if (newTurns.length === 0) return existingSummary;

  const transcript = newTurns
    .map((m) => `${m.role === "user" ? "Seeker" : "Scholar"}: ${m.content}`)
    .join("\n");

  const systemPrompt =
    "You maintain a concise running summary of a spiritual study conversation " +
    "between a Seeker and a Scholar. Update the existing summary by folding in " +
    "the new turns below. Preserve the threads, questions, passages, and points " +
    "raised earlier so later turns retain continuity. Keep it tight (a short " +
    "paragraph or a few bullet points). Return ONLY the updated summary text.";

  const userMessage =
    (existingSummary
      ? `EXISTING SUMMARY:\n${existingSummary}\n\n`
      : "EXISTING SUMMARY: (none yet)\n\n") +
    `NEW TURNS TO FOLD IN:\n${transcript}`;

  return generateScholarResponse({ systemPrompt, userMessage });
}
