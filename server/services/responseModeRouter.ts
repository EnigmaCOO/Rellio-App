import type { ResponseMode } from "@shared/schema";

export interface RoutingInput {
  message: string;
  selectedSources: string[];
  selectedTraditions: string[];
  /** Explicit user-selected mode from the Ask page toggle. Overrides heuristics. */
  explicitMode?: "ask" | "single" | "compare";
}

export function routeResponseMode(input: RoutingInput): ResponseMode {
  const { selectedSources, selectedTraditions, explicitMode } = input;

  // The selected UI mode is authoritative. User wording must never silently
  // widen a single-tradition answer into a comparison.
  if (explicitMode === "compare") {
    return "comparative";
  }
  if (explicitMode === "ask") {
    return "general";
  }

  return selectedSources.length > 0 || selectedTraditions.length > 0
    ? "strict_source_grounded"
    : "general";
}
