import OpenAI from "openai";
import { getAskModel } from "../config/models";
import { traceLog } from "../debug/trace";

/**
 * Central client wrapper for the Ask page's grounded answer engine.
 *
 * Like the in-book Scholar (server/services/scholarModel.ts), the Ask engine is
 * backed by Gemini (Google AI Studio) via the configured ASK_MODEL. Gemini
 * exposes an OpenAI-compatible endpoint, so we reuse the existing `openai` SDK
 * pointed at the Gemini base URL.
 *
 * On any Gemini failure this throws an EXPLICIT error so the caller can decide
 * how to degrade (the route falls back to the legacy Ask builders when the
 * grounded path throws).
 */

const GEMINI_OPENAI_BASE_URL =
  "https://generativelanguage.googleapis.com/v1beta/openai/";

const DEFAULT_ASK_MAX_TOKENS = 1800;

let cachedClient: OpenAI | null = null;

function getGeminiClient(): OpenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Grounded Ask engine is not configured: GEMINI_API_KEY is missing. " +
        "Set the Gemini API key to enable grounded Ask (ASK_MODEL).",
    );
  }
  if (!cachedClient) {
    cachedClient = new OpenAI({ apiKey, baseURL: GEMINI_OPENAI_BASE_URL });
  }
  return cachedClient;
}

function getAskMaxTokens(): number {
  const raw = process.env.ASK_MAX_TOKENS;
  const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_ASK_MAX_TOKENS;
}

/**
 * Generate a structured (JSON) Ask answer with Gemini using the configured
 * ASK_MODEL. Requests a JSON object response. Throws an explicit error on
 * failure or empty output.
 */
export async function generateAskJson(
  systemPrompt: string,
  userMessage: string,
): Promise<string> {
  const model = getAskModel();
  const maxTokens = getAskMaxTokens();

  traceLog("model_call.ask", {
    path: "ask",
    provider: "gemini",
    model,
    max_tokens: maxTokens,
    temperature: 0.4,
    response_format: "json_object",
    messages_summary: {
      count: 2,
      roles: ["system", "user"],
      system_prompt_has_provided_context: systemPrompt.includes("PROVIDED CONTEXT"),
      user_message_preview: userMessage.slice(0, 200),
    },
    system_prompt: systemPrompt,
  });

  let response;
  try {
    response = await getGeminiClient().chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      max_tokens: maxTokens,
      temperature: 0.4,
      response_format: { type: "json_object" },
    });
  } catch (err) {
    const anyErr = err as { status?: number; response?: { status?: number; data?: unknown }; code?: unknown; name?: unknown };
    traceLog("model_call.ask.raw_error", {
      path: "ask",
      provider: "gemini",
      model,
      error_name: anyErr?.name ?? null,
      error_code: anyErr?.code ?? null,
      http_status: anyErr?.status ?? anyErr?.response?.status ?? null,
      message: err instanceof Error ? err.message : String(err),
      response_body: anyErr?.response?.data ?? null,
    });
    const detail = err instanceof Error ? err.message : String(err);
    throw new Error(`Grounded Ask (Gemini ${model}) failed: ${detail}`);
  }

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error(`Grounded Ask (Gemini ${model}) returned an empty response.`);
  }
  return content;
}
