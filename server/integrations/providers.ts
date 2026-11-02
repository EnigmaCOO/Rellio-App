import OpenAI from "openai";
import { generateScriptureResponse } from "../services/openai";
import type { ConversationMessage } from "../services/openai";
import { traceLog } from "../debug/trace";

// ─── Shared contract types ────────────────────────────────────────────────────

export interface ScholarPersonaContext {
  name: string;
  systemPrompt: string;
  expertise: string[];
  voiceTone: string;
}

export interface ChatContext {
  religion: string | null;
  book: string;
  chapter: number;
  persona: string | null;
  multiReligiousPerspective?: boolean;
}

export interface ChatProviderInput {
  message: string;
  context: ChatContext;
  personaContext?: ScholarPersonaContext | null;
  conversationHistory?: ConversationMessage[];
  /**
   * When set, providers use this fully-assembled system prompt verbatim instead
   * of building their own. Used by the flagged in-book passage-injection path.
   */
  systemPromptOverride?: string;
}

// ─── ChatProvider interface ───────────────────────────────────────────────────

export interface ChatProvider {
  readonly name: "openai" | "xai";
  generateResponse(input: ChatProviderInput): Promise<string>;
  generateMultiReligiousPerspective(
    message: string,
    conversationHistory?: ConversationMessage[]
  ): Promise<string>;
}

// ─── OpenAI provider (primary) ───────────────────────────────────────────────

export class OpenAIChatProvider implements ChatProvider {
  readonly name = "openai" as const;

  async generateResponse(input: ChatProviderInput): Promise<string> {
    const { message, context, conversationHistory = [], systemPromptOverride } = input;

    if (context.multiReligiousPerspective) {
      return this.generateMultiReligiousPerspective(message, conversationHistory);
    }

    const scriptureCtx =
      context.religion && context.book && context.chapter
        ? {
            religion: context.religion,
            book: context.book,
            chapter: context.chapter,
          }
        : undefined;

    return generateScriptureResponse(
      message,
      scriptureCtx,
      conversationHistory,
      systemPromptOverride
    );
  }

  async generateMultiReligiousPerspective(
    message: string,
    conversationHistory: ConversationMessage[] = []
  ): Promise<string> {
    return generateScriptureResponse(
      message,
      { religion: "", book: "", chapter: 0, multiReligiousPerspective: true },
      conversationHistory
    );
  }
}

// ─── XAI provider (secondary) ────────────────────────────────────────────────

export class XAIChatProvider implements ChatProvider {
  readonly name = "xai" as const;

  private readonly client: OpenAI;

  /**
   * Self-contained quota cache (5-minute TTL).
   * Exposed via `getQuotaStatus()` so the factory can consult it without
   * triggering a fresh network call.
   */
  private quotaStatus: { hasCredits: boolean; lastChecked: number } = {
    hasCredits: true,
    lastChecked: 0,
  };

  constructor() {
    this.client = new OpenAI({
      baseURL: "https://api.x.ai/v1",
      apiKey: process.env.XAI_API_KEY,
    });
  }

  /** Returns cached quota state (does NOT trigger a fresh check). */
  getQuotaStatus(): { hasCredits: boolean; lastChecked: number } {
    return { ...this.quotaStatus };
  }

  /** Returns true if the cached quota state is healthy (not depleted). */
  isQuotaHealthy(): boolean {
    // If the cache has never been primed, assume healthy until proven otherwise.
    if (this.quotaStatus.lastChecked === 0) return true;
    return this.quotaStatus.hasCredits;
  }

  // ── Quota check / refresh (5-minute TTL) ───────────────────────────────────

  private async refreshQuotaIfStale(): Promise<boolean> {
    const age = Date.now() - this.quotaStatus.lastChecked;
    if (age < 5 * 60 * 1000) {
      console.log(
        `📊 XAI quota cache: ${this.quotaStatus.hasCredits ? "available" : "depleted"}`
      );
      return this.quotaStatus.hasCredits;
    }

    try {
      console.log("📊 XAI: refreshing quota check…");
      await this.client.chat.completions.create({
        model: "grok-2-1212",
        messages: [{ role: "user", content: "Test" }],
        max_tokens: 1,
      });
      this.quotaStatus = { hasCredits: true, lastChecked: Date.now() };
      return true;
    } catch (err: any) {
      if (
        err.message?.includes("quota") ||
        err.message?.includes("credit") ||
        err.message?.includes("403") ||
        err.message?.includes("No credits")
      ) {
        this.quotaStatus = { hasCredits: false, lastChecked: Date.now() };
        return false;
      }
      console.warn("⚠️ XAI quota check inconclusive, assuming credits available");
      return true;
    }
  }

  // ── Retry helper with exponential backoff ───────────────────────────────────

  private async withRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    maxRetries = 3
  ): Promise<T> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 XAI ${operationName}: attempt ${attempt}/${maxRetries}`);
        return await operation();
      } catch (err: any) {
        const isQuotaError =
          err.message?.includes("quota") ||
          err.message?.includes("credit") ||
          err.message?.includes("403") ||
          err.message?.includes("No credits");

        if (isQuotaError) {
          this.quotaStatus = { hasCredits: false, lastChecked: Date.now() };
          throw err;
        }

        if (attempt === maxRetries) throw err;

        const delay = Math.pow(2, attempt) * 1000;
        console.log(`⏳ XAI: waiting ${delay}ms before retry…`);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
    throw new Error(`XAI: ${operationName} failed after ${maxRetries} attempts`);
  }

  // ── Build OpenAI-compatible messages ───────────────────────────────────────

  private buildMessages(
    systemPrompt: string,
    userContent: string,
    history: ConversationMessage[]
  ) {
    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: systemPrompt },
    ];
    history.slice(-10).forEach((m) => messages.push({ role: m.role, content: m.content }));
    messages.push({ role: "user", content: userContent });
    return messages;
  }

  // ── generateResponse ────────────────────────────────────────────────────────

  async generateResponse(input: ChatProviderInput): Promise<string> {
    const { message, context, personaContext, conversationHistory = [], systemPromptOverride } = input;

    if (context.multiReligiousPerspective) {
      return this.generateMultiReligiousPerspective(message, conversationHistory);
    }

    if (!(await this.refreshQuotaIfStale())) {
      throw new Error("XAI: no credits available");
    }

    const basePrompt = `You are a distinguished religious scholar and spiritual guide who engages in natural, flowing conversations. Your responses should be:
- Scholarly yet accessible, drawing from authentic religious texts and traditions
- Respectful of all faith traditions while providing deep insights
- Contextual to the specific scripture or religious text being discussed
- Encouraging of spiritual growth and understanding
- Rich with historical context and cross-references when appropriate
- Building naturally on previous conversation when history exists
- Include a thoughtful follow-up question to encourage deeper dialogue

Current context: ${
      context.religion
        ? `${context.religion} - ${context.book} Chapter ${context.chapter}`
        : "General spiritual inquiry"
    }`;

    let systemPrompt: string;
    let userContent: string;
    if (systemPromptOverride) {
      systemPrompt = systemPromptOverride;
      userContent = message;
    } else {
      systemPrompt = personaContext
        ? `${basePrompt}\n\nPersona: ${personaContext.systemPrompt}\n\nExpertise: ${personaContext.expertise.join(", ")}\n\nSpeaking style: ${personaContext.voiceTone}`
        : basePrompt;
      userContent = context.religion
        ? `Context: Reading ${context.religion} - ${context.book} Chapter ${context.chapter}\n\nCurrent question: ${message}`
        : `Current question: ${message}`;
    }

    return this.withRetry(async () => {
      const res = await this.client.chat.completions.create({
        model: "grok-2-1212",
        messages: this.buildMessages(systemPrompt, userContent, conversationHistory),
        max_tokens: 1200,
        temperature: 0.7,
        presence_penalty: 0.1,
        frequency_penalty: 0.1,
      });
      const content = res.choices[0]?.message?.content;
      if (!content) throw new Error("XAI: empty response");
      return content;
    }, "generateResponse");
  }

  // ── generateMultiReligiousPerspective ──────────────────────────────────────

  async generateMultiReligiousPerspective(
    message: string,
    conversationHistory: ConversationMessage[] = []
  ): Promise<string> {
    if (!(await this.refreshQuotaIfStale())) {
      throw new Error("XAI: no credits available");
    }

    const systemPrompt = `You are an interfaith scholar with deep knowledge of multiple religious traditions who engages in natural, flowing conversations. When providing perspectives from multiple religious traditions, use exactly these five traditions in this order:

<perspective>Christianity</perspective>
<perspective>Islam</perspective>
<perspective>Judaism</perspective>
<perspective>Hinduism</perspective>
<perspective>Buddhism</perspective>

Enhanced Conversation Guidelines:
- Build on previous exchanges naturally when conversation history exists
- Provide 2-3 sentences for each perspective
- Include authentic scriptural references when possible
- Ensure each perspective offers unique insights while highlighting common spiritual themes
- Keep responses balanced in length across all five traditions
- After your multi-religious response, add a proactive follow-up question to encourage deeper dialogue`;

    const userContent =
      conversationHistory.length > 0
        ? `Building on our conversation, please provide multi-religious perspectives on: ${message}`
        : `Please provide perspectives from multiple religious traditions on this question: ${message}`;

    return this.withRetry(async () => {
      const res = await this.client.chat.completions.create({
        model: "grok-2-1212",
        messages: this.buildMessages(systemPrompt, userContent, conversationHistory),
        max_tokens: 1400,
        temperature: 0.8,
        presence_penalty: 0.2,
      });
      return (
        res.choices[0]?.message?.content ??
        "Unable to generate multi-religious perspective."
      );
    }, "generateMultiReligiousPerspective");
  }
}

// ─── Provider singletons ──────────────────────────────────────────────────────

const _openai = new OpenAIChatProvider();
const _xai = new XAIChatProvider();

// ─── Provider factory ─────────────────────────────────────────────────────────

/**
 * Returns the preferred ChatProvider.
 *
 * Default policy: **OpenAI is primary**. XAI is returned only when it is
 * explicitly requested AND its key is present AND its quota cache is healthy.
 *
 * This satisfies the task spec: "OpenAI as primary and XAI as secondary fallback."
 */
export async function getChatProvider(
  preferred: "openai" | "xai" = "openai"
): Promise<ChatProvider> {
  if (preferred === "xai") {
    // XAI is only eligible when the key is set AND quota cache is not depleted.
    const keyPresent = Boolean(process.env.XAI_API_KEY);
    const quotaHealthy = _xai.isQuotaHealthy();

    if (keyPresent && quotaHealthy) {
      console.log("🤖 ChatProvider: using XAI (explicitly requested, quota healthy)");
      return _xai;
    }

    if (!keyPresent) {
      console.log("🤖 ChatProvider: XAI_API_KEY missing → falling back to OpenAI");
    } else {
      console.log("🤖 ChatProvider: XAI quota depleted → falling back to OpenAI");
    }
  } else {
    console.log("🤖 ChatProvider: using OpenAI (primary)");
  }

  return _openai;
}

// ─── Transparent fallback helpers ────────────────────────────────────────────

/**
 * Attempts the preferred provider and silently falls back to the other on any
 * error. Logs which provider handled each request.
 *
 * Default preference is OpenAI (primary). Pass preferred='xai' only when XAI
 * is explicitly desired (e.g., persona mode with XAI key available).
 */
export async function callWithFallback(
  input: ChatProviderInput,
  preferred: "openai" | "xai" = "openai"
): Promise<{ response: string; providerUsed: "openai" | "xai" }> {
  const primary = await getChatProvider(preferred);
  const secondary: ChatProvider = primary.name === "xai" ? _openai : _xai;

  traceLog("model_call.legacy", {
    path: "legacy (callWithFallback)",
    note: "LEGACY provider path — reached only when injection off or grounding unresolved",
    primary_provider: primary.name,
    primary_model: primary.name === "xai" ? "grok-2-1212" : "gpt-4o",
    secondary_provider: secondary.name,
    context: {
      religion: input?.context?.religion ?? null,
      book: input?.context?.book ?? null,
      chapter: input?.context?.chapter ?? null,
      persona: input?.context?.persona ?? null,
    },
    has_persona_context: !!input?.personaContext,
  });

  try {
    const response = await primary.generateResponse(input);
    console.log(`✅ ChatProvider: ${primary.name} handled the request`);
    return { response, providerUsed: primary.name };
  } catch (primaryErr: any) {
    console.warn(
      `⚠️ ChatProvider: ${primary.name} failed (${primaryErr.message}), falling back to ${secondary.name}`
    );
    const response = await secondary.generateResponse(input);
    console.log(`✅ ChatProvider: ${secondary.name} handled the request (fallback)`);
    return { response, providerUsed: secondary.name };
  }
}

/**
 * Same transparent fallback pattern for multi-religious perspective requests.
 */
export async function callMultiReligiousWithFallback(
  message: string,
  conversationHistory: ConversationMessage[] = [],
  preferred: "openai" | "xai" = "openai"
): Promise<{ response: string; providerUsed: "openai" | "xai" }> {
  const primary = await getChatProvider(preferred);
  const secondary: ChatProvider = primary.name === "xai" ? _openai : _xai;

  try {
    const response = await primary.generateMultiReligiousPerspective(
      message,
      conversationHistory
    );
    console.log(`✅ ChatProvider (multi): ${primary.name} handled the request`);
    return { response, providerUsed: primary.name };
  } catch (primaryErr: any) {
    console.warn(
      `⚠️ ChatProvider (multi): ${primary.name} failed, falling back to ${secondary.name}`
    );
    const response = await secondary.generateMultiReligiousPerspective(
      message,
      conversationHistory
    );
    console.log(
      `✅ ChatProvider (multi): ${secondary.name} handled the request (fallback)`
    );
    return { response, providerUsed: secondary.name };
  }
}
