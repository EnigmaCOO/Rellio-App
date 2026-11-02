import OpenAI from "openai";
import type {
  ResponseMode,
  ResponseMeta,
  ResponseSection,
  ResponseReference,
  StructuredChatResponse,
} from "@shared/schema";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "",
});

const TRADITION_DISPLAY: Record<string, string> = {
  islam: "Islam",
  christianity: "Christianity",
  judaism: "Judaism",
  hinduism: "Hinduism",
  buddhism: "Buddhism",
  shintoism: "Shintoism",
  sikhism: "Sikhism",
};

const SOURCE_DISPLAY: Record<string, string> = {
  quran: "Quran",
  hadith: "Hadith",
  bible: "Bible",
  "old-testament": "Old Testament",
  "new-testament": "New Testament",
  torah: "Torah",
  tanakh: "Tanakh",
  talmud: "Talmud",
  "bhagavad-gita": "Bhagavad Gita",
  vedas: "Vedas",
  upanishads: "Upanishads",
  dhammapada: "Dhammapada",
  tripitaka: "Tripitaka",
  mahayana: "Mahayana Sutras",
  kojiki: "Kojiki",
  "guru-granth-sahib": "Guru Granth Sahib",
};

const SOURCE_DISPLAY_REVERSE: Record<string, string> = Object.fromEntries(
  Object.entries(SOURCE_DISPLAY).map(([id, label]) => [label.toLowerCase(), id]),
);

function sourceDisplayList(sources: string[]): string {
  return sources.map((s) => SOURCE_DISPLAY[s] ?? s).join(", ");
}

function traditionDisplayList(traditions: string[]): string {
  return traditions.map((t) => TRADITION_DISPLAY[t] ?? t).join(", ");
}

function stripXmlTags(text: string): string {
  return text.replace(/<\/?[a-zA-Z][^>]*>/g, "");
}

function detectRawXmlViolations(parsed: Partial<StructuredChatResponse>): string[] {
  const violations: string[] = [];
  for (const section of parsed.sections ?? []) {
    if (section.body && /<[a-zA-Z]/.test(section.body)) {
      violations.push(`Raw XML tags found in section "${section.heading}" before sanitization`);
    }
  }
  if (parsed.summary && /<[a-zA-Z]/.test(parsed.summary)) {
    violations.push("Raw XML tags found in summary before sanitization");
  }
  return violations;
}

async function callOpenAI(systemPrompt: string, userMessage: string, maxTokens = 1400): Promise<string> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
    max_tokens: maxTokens,
    temperature: 0.4,
    response_format: { type: "json_object" },
  });
  return response.choices[0].message.content ?? "{}";
}

export async function buildStrictSourceGroundedResponse(
  message: string,
  selectedSources: string[],
  selectedTraditions: string[],
): Promise<StructuredChatResponse> {
  const sourceList = sourceDisplayList(selectedSources);
  const traditionList = traditionDisplayList(selectedTraditions);

  const systemPrompt = `You are a scripture scholar. The user has selected ONLY these sources: ${sourceList}.
You MUST answer ONLY from these sources. Do NOT reference any other religion, tradition, or scripture not listed above.
If the selected sources do not fully address the question, say so honestly in the limitations field.

Return a JSON object matching this exact structure:
{
  "mode": "strict_source_grounded",
  "meta": {
    "titleLabel": "Grounded answer",
    "scopeLabel": "Only selected sources",
    "grounded": true
  },
  "summary": "<2-3 sentence direct answer grounded only in the selected sources>",
  "sections": [
    {
      "type": "direct_answer",
      "heading": "Answer",
      "body": "<detailed answer from selected sources only>"
    },
    {
      "type": "source_explanation",
      "heading": "<source name, e.g. Quranic perspective>",
      "body": "<explanation with specific references>"
    }
  ],
  "references": [
    {
      "tradition": "<tradition name, e.g. Islam>",
      "source": "<source name, e.g. Quran>",
      "citation": "<e.g. Quran 2:255 or Sahih Bukhari 6502>",
      "text": "<brief verse or hadith text>"
    }
  ],
  "limitations": "<if the sources don't fully answer the question, explain what is missing; otherwise null>",
  "followups": ["<relevant follow-up question>", "<another follow-up question>"],
  "renderHints": {
    "answerStyle": "in_depth",
    "groupReferencesByTradition": true
  }
}

Rules:
- sections array MUST have a direct_answer section first, then source_explanation sections, then optionally a limitations section.
- All references MUST be from: ${sourceList} only. References from any other tradition are FORBIDDEN.
- Do NOT include traditions or scriptures not in the list: ${traditionList}.
- Do NOT include any XML tags like <perspective> in body text.
- If limitations is not needed, set it to null.
- Return only valid JSON, no markdown fences.`;

  const raw = await callOpenAI(systemPrompt, message);

  let parsed: StructuredChatResponse;
  try {
    parsed = JSON.parse(raw);
    const xmlViolations = detectRawXmlViolations(parsed);
    if (xmlViolations.length > 0) {
      console.warn("strict_source_grounded: XML violations in raw response, using fallback:", xmlViolations);
      return buildFallbackStructured("strict_source_grounded", message, "", selectedTraditions);
    }
  } catch {
    parsed = buildFallbackStructured("strict_source_grounded", message, raw, selectedTraditions);
  }

  return sanitize(parsed);
}

export async function buildGeneralResponse(message: string): Promise<StructuredChatResponse> {
  const systemPrompt = `You are an interfaith scholar. The user has NOT selected any specific sources, so you will provide a broad, multi-faith overview.
Be clear this is a general overview, not a source-grounded answer. Invite the user to select sources for a grounded answer.

Return a JSON object matching this exact structure:
{
  "mode": "general",
  "meta": {
    "titleLabel": "General overview",
    "scopeLabel": "Not limited to selected sources",
    "answeringFromLabel": "General multi-faith view",
    "grounded": false
  },
  "summary": "<2-3 sentence broad overview of how major traditions approach this topic>",
  "sections": [
    {
      "type": "direct_answer",
      "heading": "Overview",
      "body": "<broad introductory answer>"
    },
    {
      "type": "tradition_view",
      "tradition": "Islam",
      "heading": "Islam",
      "body": "<brief Islamic perspective>"
    },
    {
      "type": "tradition_view",
      "tradition": "Christianity",
      "heading": "Christianity",
      "body": "<brief Christian perspective>"
    },
    {
      "type": "tradition_view",
      "tradition": "Judaism",
      "heading": "Judaism",
      "body": "<brief Jewish perspective>"
    },
    {
      "type": "tradition_view",
      "tradition": "Hinduism",
      "heading": "Hinduism",
      "body": "<brief Hindu perspective>"
    },
    {
      "type": "tradition_view",
      "tradition": "Buddhism",
      "heading": "Buddhism",
      "body": "<brief Buddhist perspective>"
    },
    {
      "type": "synthesis",
      "heading": "Common threads",
      "body": "<what these traditions share on this topic>"
    }
  ],
  "references": [
    {
      "tradition": "<tradition>",
      "source": "<source name>",
      "citation": "<reference>",
      "text": "<brief text>"
    }
  ],
  "limitations": null,
  "followups": [
    "Select Quran and Hadith to get a grounded Islamic answer",
    "Select Bible to explore the Christian perspective in depth",
    "Which tradition would you like to explore further?"
  ],
  "renderHints": {
    "answerStyle": "in_depth",
    "groupReferencesByTradition": true
  }
}

Rules:
- meta.grounded MUST be false for general mode.
- Include tradition_view sections for at least 3 traditions relevant to the question.
- Do NOT include any XML tags like <perspective> in body text.
- Always include a followup inviting source selection.
- Return only valid JSON, no markdown fences.`;

  const raw = await callOpenAI(systemPrompt, message);

  let parsed: StructuredChatResponse;
  try {
    parsed = JSON.parse(raw);
    const xmlViolations = detectRawXmlViolations(parsed);
    if (xmlViolations.length > 0) {
      console.warn("general: XML violations in raw response, using fallback:", xmlViolations);
      return buildFallbackStructured("general", message, "", []);
    }
  } catch {
    parsed = buildFallbackStructured("general", message, raw, []);
  }

  return sanitize(parsed);
}

export async function buildComparativeResponse(
  message: string,
  selectedSources: string[],
  selectedTraditions: string[],
): Promise<StructuredChatResponse> {
  const hasSelectedSources = selectedSources.length > 0;
  const traditionList = hasSelectedSources
    ? traditionDisplayList(selectedTraditions)
    : "Islam, Christianity, Judaism, Hinduism, Buddhism, Shintoism, Sikhism";
  const sourceList = hasSelectedSources ? sourceDisplayList(selectedSources) : "all major traditions";

  const grounded = hasSelectedSources;
  const titleLabel = "Comparative answer";
  const scopeLabel = hasSelectedSources ? "Selected traditions only" : "Cross-tradition overview";

  const systemPrompt = `You are an interfaith comparative scholar.
${hasSelectedSources
    ? `The user has selected these sources: ${sourceList}. Compare ONLY these traditions: ${traditionList}. Do NOT include any other tradition.`
    : `No specific sources were selected. Provide a broad comparative overview across major traditions: ${traditionList}.`
  }

Return a JSON object matching this exact structure:
{
  "mode": "comparative",
  "meta": {
    "titleLabel": "${titleLabel}",
    "scopeLabel": "${scopeLabel}",
    "grounded": ${grounded}
  },
  "summary": "<2-3 sentence comparative summary>",
  "sections": [
    {
      "type": "direct_answer",
      "heading": "Comparative overview",
      "body": "<introduction to the comparison>"
    },
    {
      "type": "tradition_view",
      "tradition": "<tradition name>",
      "heading": "<tradition name>",
      "body": "<this tradition's view on the topic with references>"
    },
    {
      "type": "comparison_overlap",
      "heading": "What they share",
      "body": "<common ground across the included traditions>"
    },
    {
      "type": "comparison_difference",
      "heading": "Where they differ",
      "body": "<key differences between the included traditions>"
    },
    {
      "type": "synthesis",
      "heading": "Synthesis",
      "body": "<broader insight from comparing these traditions>"
    }
  ],
  "references": [
    {
      "tradition": "<tradition>",
      "source": "<source name>",
      "citation": "<reference>",
      "text": "<brief text>"
    }
  ],
  "limitations": null,
  "followups": ["<follow-up question to go deeper>", "<another follow-up>"],
  "renderHints": {
    "answerStyle": "in_depth",
    "groupReferencesByTradition": true
  }
}

Rules:
- MUST include at least 2 tradition_view sections (one per included tradition).
- ${hasSelectedSources ? `All references MUST be from: ${sourceList} only.` : "References can be from any major tradition."}
- Do NOT include traditions not in the comparison list.
- Do NOT include any XML tags like <perspective> in body text.
- sections array order: direct_answer, tradition_view (one per tradition), comparison_overlap, comparison_difference, synthesis, optional followups.
- Return only valid JSON, no markdown fences.`;

  const raw = await callOpenAI(systemPrompt, message, 1800);

  let parsed: StructuredChatResponse;
  try {
    parsed = JSON.parse(raw);
    const xmlViolations = detectRawXmlViolations(parsed);
    if (xmlViolations.length > 0) {
      console.warn("comparative: XML violations in raw response, using fallback:", xmlViolations);
      return buildFallbackStructured("comparative", message, "", selectedTraditions);
    }
  } catch {
    parsed = buildFallbackStructured("comparative", message, raw, selectedTraditions);
  }

  return sanitize(parsed);
}

function buildFallbackStructured(
  mode: ResponseMode,
  message: string,
  rawText: string,
  traditions: string[],
): StructuredChatResponse {
  const meta: ResponseMeta = {
    titleLabel: mode === "general" ? "General overview" : mode === "comparative" ? "Comparative answer" : "Grounded answer",
    scopeLabel: mode === "general" ? "Not limited to selected sources" : mode === "comparative" ? "Selected traditions" : "Only selected sources",
    grounded: mode !== "general",
  };

  const baseSections: ResponseSection[] = [
    {
      type: "direct_answer",
      heading: "Answer",
      body: stripXmlTags(rawText),
    },
  ];

  if (mode === "comparative") {
    const traditionLabels = traditions.length > 0
      ? traditions.map((t) => TRADITION_DISPLAY[t] ?? t)
      : ["Tradition A", "Tradition B"];
    for (const label of traditionLabels) {
      baseSections.push({ type: "tradition_view", heading: `${label} perspective`, body: "See grounded answer for details.", tradition: label });
    }
    baseSections.push({ type: "comparison_overlap", heading: "Common ground", body: "Shared themes require further exploration." });
    baseSections.push({ type: "comparison_difference", heading: "Key differences", body: "Distinct positions require further exploration." });
  }

  return {
    mode,
    meta,
    summary: stripXmlTags(rawText).slice(0, 300),
    sections: baseSections,
    references: [],
    limitations: undefined,
    followups: ["Would you like to explore this topic further?"],
    renderHints: { answerStyle: "in_depth", groupReferencesByTradition: true },
  };
}

function sanitize(response: StructuredChatResponse): StructuredChatResponse {
  response.summary = stripXmlTags(response.summary ?? "");
  response.limitations = response.limitations ? stripXmlTags(response.limitations) : undefined;
  if (!response.sections) response.sections = [];
  response.sections = response.sections.map((s: ResponseSection) => ({
    ...s,
    heading: stripXmlTags(s.heading ?? ""),
    body: stripXmlTags(s.body ?? ""),
  }));
  if (!response.references) response.references = [];
  response.references = response.references.map((r: ResponseReference) => ({
    ...r,
    text: stripXmlTags(r.text ?? ""),
  }));
  if (!response.followups) response.followups = [];
  return response;
}

export function validateStructuredResponse(
  response: StructuredChatResponse,
  selectedTraditions: string[],
  mode: ResponseMode,
  selectedSources: string[] = [],
): { valid: boolean; violations: string[] } {
  const violations: string[] = [];

  const allowedSourceIds = new Set(selectedSources.map((s) => s.toLowerCase()));
  function isSourceAllowed(refSource: string | undefined): boolean {
    if (!refSource || allowedSourceIds.size === 0) return true;
    const normalized = refSource.toLowerCase();
    const id = SOURCE_DISPLAY_REVERSE[normalized] ?? normalized;
    return allowedSourceIds.has(id);
  }

  if (mode === "strict_source_grounded") {
    if (!response.meta.grounded) {
      violations.push("strict_source_grounded response must have meta.grounded = true");
    }
    if (selectedTraditions.length > 0) {
      const allowed = new Set(selectedTraditions.map((t) => t.toLowerCase()));
      for (const ref of response.references) {
        if (ref.tradition && !allowed.has(ref.tradition.toLowerCase())) {
          violations.push(`Reference from unselected tradition: ${ref.tradition}`);
        }
      }
      for (const section of response.sections) {
        if (section.type === "tradition_view" && section.tradition && !allowed.has(section.tradition.toLowerCase())) {
          violations.push(`tradition_view section for unselected tradition: ${section.tradition}`);
        }
      }
    }
    if (selectedSources.length > 0) {
      for (const ref of response.references) {
        if (!isSourceAllowed(ref.source)) {
          violations.push(`Reference from unselected source: ${ref.source} (allowed: ${selectedSources.join(", ")})`);
        }
      }
    }
  }

  if (mode === "general") {
    if (response.meta.grounded) {
      violations.push("general response must have meta.grounded = false");
    }
    if (!response.followups || response.followups.length === 0) {
      violations.push("general response must include at least one follow-up to invite source selection");
    }
  }

  if (mode === "comparative") {
    const sectionTypes = new Set(response.sections.map((s) => s.type));
    const traditionViews = response.sections.filter((s) => s.type === "tradition_view");
    if (traditionViews.length < 2) {
      violations.push(`comparative response must have at least 2 tradition_view sections, found ${traditionViews.length}`);
    }
    if (!sectionTypes.has("comparison_overlap")) {
      violations.push("comparative response must include a comparison_overlap section");
    }
    if (!sectionTypes.has("comparison_difference")) {
      violations.push("comparative response must include a comparison_difference section");
    }
    if (selectedSources.length > 0 && !response.meta.grounded) {
      violations.push("comparative response with selected sources must have meta.grounded = true");
    }
    if (selectedTraditions.length > 0) {
      const allowed = new Set(selectedTraditions.map((t) => t.toLowerCase()));
      for (const ref of response.references) {
        if (ref.tradition && !allowed.has(ref.tradition.toLowerCase())) {
          violations.push(`Comparative reference from unselected tradition: ${ref.tradition}`);
        }
      }
      for (const section of traditionViews) {
        if (section.tradition && !allowed.has(section.tradition.toLowerCase())) {
          violations.push(`Comparative tradition_view for unselected tradition: ${section.tradition}`);
        }
      }
    }
    if (selectedSources.length > 0) {
      for (const ref of response.references) {
        if (!isSourceAllowed(ref.source)) {
          violations.push(`Comparative reference from unselected source: ${ref.source} (allowed: ${selectedSources.join(", ")})`);
        }
      }
    }
  }

  for (const section of response.sections) {
    if (/<[a-zA-Z]/.test(section.body)) {
      violations.push(`Section "${section.heading}" contains raw XML tags (post-sanitize check)`);
    }
  }

  return { valid: violations.length === 0, violations };
}

export function buildConstraintViolationFallback(
  mode: ResponseMode,
  selectedTraditions: string[],
  violations: string[],
): StructuredChatResponse {
  const isGrounded = mode !== "general";
  const traditionList = selectedTraditions.join(", ") || "the selected sources";
  console.warn("Building constraint-violation fallback due to violations:", violations);

  return {
    mode,
    meta: {
      titleLabel: mode === "general" ? "General overview" : mode === "comparative" ? "Comparative answer" : "Grounded answer",
      scopeLabel: mode === "general" ? "Not limited to selected sources" : mode === "comparative" ? "Selected traditions only" : "Only selected sources",
      grounded: isGrounded,
    },
    summary: isGrounded
      ? `I can answer from ${traditionList}. Please try rephrasing your question for a more focused answer.`
      : "I can provide a broad overview across multiple traditions. Please try rephrasing your question.",
    sections: [
      {
        type: "direct_answer",
        heading: "Note",
        body: isGrounded
          ? `Your question is being answered strictly from ${traditionList}. Try asking a more specific question about these texts.`
          : "This is a general multi-faith overview. Select specific sources for a grounded answer.",
      },
      ...(mode === "comparative"
        ? [
            ...selectedTraditions.map((t) => ({
              type: "tradition_view" as const,
              heading: `${t} perspective`,
              body: "Please rephrase your question for a detailed comparative answer.",
              tradition: t,
            })),
            { type: "comparison_overlap" as const, heading: "Common ground", body: "Shared themes will appear here with a valid response." },
            { type: "comparison_difference" as const, heading: "Key differences", body: "Distinct positions will appear here with a valid response." },
          ]
        : []),
    ],
    references: [],
    limitations: isGrounded ? `This answer is limited to: ${traditionList}.` : undefined,
    followups: isGrounded
      ? [`Ask a specific question about ${traditionList}`, "Select different sources to explore more traditions"]
      : ["Select Quran to get a grounded Islamic answer", "Select Bible for a grounded Christian answer"],
    renderHints: { answerStyle: "in_depth", groupReferencesByTradition: true },
  };
}
