import { ALL_SOURCES, SUPPORTED_RELIGIONS } from "../../shared/scriptureSources";
import type { ResponseMode, ScholarlyChatMode } from "@shared/schema";

export const DEFAULT_COMPARE_TRADITIONS = [...SUPPORTED_RELIGIONS];

export type AskScopeResult =
  | {
      ok: true;
      chatMode: "ask" | "single" | "compare";
      responseMode: ResponseMode;
      selectedSources: string[];
      selectedTraditions: string[];
    }
  | { ok: false; error: string };

export function resolveAskScope(input: {
  mode?: ScholarlyChatMode;
  selectedSources?: string[];
  selectedTraditions?: string[];
}): AskScopeResult {
  const selectedSources = Array.from(new Set(input.selectedSources ?? []));
  const unknownSources = selectedSources.filter(
    (sourceId) => !ALL_SOURCES.some((source) => source.id === sourceId),
  );

  if (unknownSources.length > 0) {
    return {
      ok: false,
      error: `Unknown source selection: ${unknownSources.join(", ")}.`,
    };
  }

  const sourceTraditions = Array.from(new Set(
    selectedSources
      .map((sourceId) => ALL_SOURCES.find((source) => source.id === sourceId)?.religion)
      .filter(Boolean) as string[],
  ));
  const requestedTraditions = Array.from(new Set(input.selectedTraditions ?? []));
  const hasScope = selectedSources.length > 0 || requestedTraditions.length > 0;
  const chatMode = input.mode ?? (hasScope ? "single" : "ask");

  if (chatMode === "passage_scholar") {
    return {
      ok: false,
      error: "Passage Scholar requires an explicit reader passage selection.",
    };
  }

  if (chatMode === "ask") {
    if (hasScope) {
      return {
        ok: false,
        error: "Ask mode uses broad evidence. Choose Single tradition to restrict sources.",
      };
    }
    return {
      ok: true,
      chatMode,
      responseMode: "general",
      selectedSources: [],
      selectedTraditions: [],
    };
  }

  if (chatMode === "single") {
    const traditions = sourceTraditions.length > 0 ? sourceTraditions : requestedTraditions;
    if (traditions.length === 0) {
      return {
        ok: false,
        error: "Choose a source or tradition before asking in Single tradition mode.",
      };
    }
    if (traditions.length > 1) {
      return {
        ok: false,
        error:
          "Single-tradition mode can use sources from one tradition. Switch to Compare to include multiple traditions.",
      };
    }
    if (
      sourceTraditions.length > 0 &&
      requestedTraditions.length > 0 &&
      requestedTraditions.some((tradition) => !sourceTraditions.includes(tradition))
    ) {
      return {
        ok: false,
        error: "The selected tradition does not match the selected texts.",
      };
    }

    return {
      ok: true,
      chatMode,
      responseMode: selectedSources.length > 0 || traditions.length > 0
        ? "strict_source_grounded"
        : "general",
      selectedSources,
      selectedTraditions: traditions,
    };
  }

  const traditions = requestedTraditions.length > 0
    ? requestedTraditions
    : sourceTraditions.length > 0
      ? sourceTraditions
      : input.selectedTraditions === undefined
        ? DEFAULT_COMPARE_TRADITIONS
        : [];

  if (
    sourceTraditions.length > 0 &&
    requestedTraditions.length > 0 &&
    sourceTraditions.some((tradition) => !requestedTraditions.includes(tradition))
  ) {
    return {
      ok: false,
      error: "Every selected text must belong to a tradition included in the comparison.",
    };
  }
  if (traditions.length < 2) {
    return {
      ok: false,
      error: "Choose at least two traditions to compare.",
    };
  }

  return {
    ok: true,
    chatMode,
    responseMode: "comparative",
    selectedSources,
    selectedTraditions: traditions,
  };
}
