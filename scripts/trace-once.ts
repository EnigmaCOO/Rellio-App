/**
 * THROWAWAY DIAGNOSTIC — observe-only (DEBUG_TRACE).
 *
 * Drives the EXISTING, UNMODIFIED services that the /api/chat handler calls,
 * for ONE in-book Scholar request (Sahih al-Bukhari) and ONE Ask request, with
 * DEBUG_TRACE on, so the gated trace logs fire and we can see exactly which path
 * runs and what is sent to the model. This mirrors the route's selection logic
 * (it does NOT reimplement the services — it calls the real exported functions).
 *
 * It makes real Gemini API calls (that is the point: to capture the raw error
 * for the failing Bukhari case). Run with:
 *   npx tsx scripts/trace-once.ts
 *
 * Safe to delete — this changes no app behavior.
 */

process.env.DEBUG_TRACE = "true";

import {
  buildInBookGrounding,
  generateGroundedInBookAnswer,
  isInBookPassageInjectionEnabled,
  resolveCanonicalReaderPassage,
} from "../server/services/inBookGrounding";
import { generateScholarResponse } from "../server/services/scholarModel";
import { isCitationValidationEnabled } from "../validators/citations";
import {
  buildGroundedAskResponse,
  isAskGroundedEnabled,
} from "../server/services/askGrounding";
import { routeResponseMode } from "../server/services/responseModeRouter";
import { callWithFallback } from "../server/integrations/providers";
import { traceLog } from "../server/debug/trace";

function banner(label: string) {
  console.log("\n" + "═".repeat(78));
  console.log(label);
  console.log("═".repeat(78));
}

/** Reproduce the route's three-way split decision from a context payload. */
function logBranch(context: Record<string, unknown> | null) {
  const isPersonaMode = !!context?.persona;
  const isDashboardReadingContext = !!(context?.book && context?.religion);
  const isHomeChatMode = !isPersonaMode && !isDashboardReadingContext;
  traceLog("script.branch_decision", {
    branch_taken: isHomeChatMode
      ? "home (Ask)"
      : isPersonaMode
        ? "persona"
        : "dashboard-reading (in_book)",
    deciding_values: {
      "context.persona": context?.persona ?? null,
      "context.book": context?.book ?? null,
      "context.religion": context?.religion ?? null,
      "context.selectedSources": context?.selectedSources ?? null,
      "context.selectedTraditions": context?.selectedTraditions ?? null,
    },
  });
}

async function traceInBookBukhari() {
  banner("CASE 1 — IN-BOOK SCHOLAR — Sahih al-Bukhari (islam)");

  // The exact context an in-book reading request carries.
  const context = {
    religion: "islam" as const,
    book: "Sahih al-Bukhari",
    chapter: 1,
  };
  const message = "What does this hadith teach about intentions?";

  logBranch(context);
  traceLog("script.flags", {
    IN_BOOK_PASSAGE_INJECTION: isInBookPassageInjectionEnabled(),
    CITATION_VALIDATION: isCitationValidationEnabled(),
  });

  try {
    // === Real selection logic, exactly as routes.ts does it ===
    let grounding = null;
    const selectedText = (
      context as typeof context & { passageSelection?: { text?: string } }
    ).passageSelection?.text;
    if (isInBookPassageInjectionEnabled() && context.religion && context.book && selectedText) {
      const resolution = await resolveCanonicalReaderPassage(
        context.religion,
        context.book,
        selectedText,
      );
      if (resolution.ok) {
        grounding = await buildInBookGrounding(
          context.religion,
          resolution.passages,
          undefined, // no rolling-memory summary in the trace
          message,
        );
      }
    }

    if (grounding) {
      traceLog("script.in_book.path_selected", {
        selected: "NEW grounded path (buildScholarSystemPrompt + Gemini SCHOLAR_MODEL)",
      });
      const runGeneration = (systemPrompt: string) =>
        generateScholarResponse({
          systemPrompt,
          conversationHistory: [],
          userMessage: message,
        });

      if (isCitationValidationEnabled()) {
        const { answer, regenerated, validation } =
          await generateGroundedInBookAnswer(
            grounding.ctx,
            grounding.systemPrompt,
            runGeneration,
          );
        console.log("\n[RESULT] in-book grounded answer (truncated):");
        console.log(answer.slice(0, 400));
        console.log(
          `[RESULT] regenerated=${regenerated} validation.ok=${validation.ok}`,
        );
      } else {
        const answer = await runGeneration(grounding.systemPrompt);
        console.log("\n[RESULT] in-book grounded answer (truncated):");
        console.log(answer.slice(0, 400));
      }
    } else {
      traceLog("script.in_book.path_selected", {
        selected:
          "LEGACY path (callWithFallback Grok-2 -> OpenAI) — grounding did not resolve",
      });
      const { response, providerUsed } = await callWithFallback({
        message,
        context: {
          religion: context.religion,
          book: context.book,
          chapter: context.chapter,
          persona: null,
        },
        personaContext: null,
        conversationHistory: [],
      });
      console.log(`\n[RESULT] legacy answer via ${providerUsed} (truncated):`);
      console.log(response.slice(0, 400));
    }
  } catch (err) {
    const anyErr = err as {
      status?: number;
      response?: { status?: number; data?: unknown };
      name?: unknown;
      message?: unknown;
    };
    traceLog("script.in_book.CAUGHT_ERROR", {
      error_name: anyErr?.name ?? null,
      http_status: anyErr?.status ?? anyErr?.response?.status ?? null,
      message: err instanceof Error ? err.message : String(err),
      response_body: anyErr?.response?.data ?? null,
    });
  }
}

async function traceAsk() {
  banner("CASE 2 — ASK (home chat)");

  // An Ask request carries no persona and no book+religion reading context.
  const context = {
    selectedSources: ["quran"],
    selectedTraditions: ["islam"],
  };
  const message = "What do the scriptures say about patience?";

  logBranch(context);

  const selectedSources = context.selectedSources;
  const selectedTraditions = context.selectedTraditions;
  const mode = routeResponseMode({
    message,
    selectedSources,
    selectedTraditions,
  });

  traceLog("script.flags", {
    ASK_GROUNDED: isAskGroundedEnabled(),
    mode,
  });

  try {
    if (isAskGroundedEnabled()) {
      traceLog("script.ask.path_selected", {
        selected: "NEW grounded path (buildAskSystemPrompt + Gemini ASK_MODEL)",
      });
      const structured = await buildGroundedAskResponse(
        message,
        mode,
        selectedSources,
        selectedTraditions,
      );
      console.log("\n[RESULT] grounded Ask structured response (truncated):");
      console.log(JSON.stringify(structured).slice(0, 500));
    } else {
      console.log(
        "[DEBUG_TRACE] ASK_GROUNDED off — legacy Ask builders would run (not exercised here).",
      );
    }
  } catch (err) {
    const anyErr = err as {
      status?: number;
      response?: { status?: number; data?: unknown };
      name?: unknown;
      message?: unknown;
    };
    traceLog("script.ask.CAUGHT_ERROR", {
      error_name: anyErr?.name ?? null,
      http_status: anyErr?.status ?? anyErr?.response?.status ?? null,
      message: err instanceof Error ? err.message : String(err),
      response_body: anyErr?.response?.data ?? null,
    });
  }
}

async function main() {
  console.log("DEBUG_TRACE one-shot diagnostic (observe-only). No behavior changed.\n");
  await traceInBookBukhari();
  await traceAsk();
  console.log("\nDone.");
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error("trace-once fatal:", err);
    process.exit(1);
  },
);
