import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Send, Mic, MicOff, X, ChevronDown, Sparkles, BookMarked, GitCompare, Layers } from "lucide-react";
import compassIcon from "@assets/IMG_5070_1776159014303.jpg";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { ALL_SOURCES, SUGGESTED_PROMPTS, type Source } from "@/config/bookshelfData";
import { RELIGION_LABELS, SUPPORTED_RELIGIONS } from "@shared/scriptureSources";
import type { StructuredChatResponse, ResponseSection, ResponseReference } from "@shared/schema";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
};

interface CenterChatPanelProps {
  sessionId: string;
  messages: ChatMessage[];
  onMessagesChange: (msgs: ChatMessage[]) => void;
  selectedSources: string[];
  onSourceToggle: (sourceId: string) => void;
  /** Explicit answer scope. */
  mode?: "ask" | "single" | "compare" | "passage_scholar";
  selectedTraditions?: string[];
  onTraditionToggle?: (tradition: string) => void;
  /** When set, the source picker is hidden and these sources are always used. */
  pinnedSources?: string[];
  /** Auto-send this prompt once when the panel mounts (no user click needed). */
  initialSend?: string | null;
  /** Fired exactly once after the seeded prompt has been sent so the parent can clear `initialSend`. */
  onInitialSent?: () => void;
  /** Extra context fields (book/tradition/cfi/passage) merged into every chat request payload. */
  requestContext?: Record<string, unknown>;
}

function SourceChip({ source, onRemove }: { source: Source; onRemove: () => void }) {
  return (
    <span className="flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full border border-gray-300 bg-white text-xs text-gray-700 font-medium">
      {source.label}
      <button
        onClick={onRemove}
        className="p-0.5 rounded-full hover:bg-gray-100 transition-colors"
      >
        <X size={10} className="text-gray-500" />
      </button>
    </span>
  );
}

function SourceSelector({
  selectedSources,
  onToggle,
}: {
  selectedSources: string[];
  onToggle: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const grouped = ALL_SOURCES.reduce<Record<string, Source[]>>((acc, s) => {
    if (!acc[s.religion]) acc[s.religion] = [];
    acc[s.religion].push(s);
    return acc;
  }, {});
  const selectedTraditions = [...new Set(
    selectedSources
      .map((id) => ALL_SOURCES.find((source) => source.id === id)?.religion)
      .filter(Boolean),
  )];
  const lockedTradition = selectedTraditions[0];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((p) => !p)}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all",
          selectedSources.length > 0
            ? "border-gray-900 bg-gray-900 text-white"
            : "border-gray-300 bg-white text-gray-700 hover:border-gray-500"
        )}
      >
        <Sparkles size={11} />
        Texts to use
        {selectedSources.length > 0 && (
          <span className="bg-white/20 text-white rounded-full px-1.5 py-0 text-[10px] font-bold">
            {selectedSources.length}
          </span>
        )}
        <ChevronDown size={11} className={cn("transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute bottom-full left-0 mb-2 w-64 rounded-2xl border border-gray-200 bg-white shadow-lg z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-700">Texts to use</p>
            <p className="text-[11px] text-gray-400 mt-0.5">Pick which traditions answer your question</p>
          </div>
          <div className="max-h-64 overflow-y-auto py-2">
            {Object.entries(grouped).map(([religion, sources]) => (
              <div key={religion}>
                <p className="px-4 py-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                  {RELIGION_LABELS[religion as keyof typeof RELIGION_LABELS] ?? religion}
                </p>
                {sources.map((s) => (
                  (() => {
                    const blockedBySingleScope =
                      !!lockedTradition &&
                      lockedTradition !== s.religion &&
                      !selectedSources.includes(s.id);
                    return (
                  <button
                    key={s.id}
                    onClick={() => onToggle(s.id)}
                    disabled={blockedBySingleScope}
                    title={blockedBySingleScope ? "Single tradition mode allows one tradition at a time" : undefined}
                    className={cn(
                      "w-full flex items-center justify-between px-4 py-2 text-sm transition-colors",
                      selectedSources.includes(s.id)
                        ? "bg-gray-50 text-gray-900 font-medium"
                        : "text-gray-600 hover:bg-gray-50",
                      blockedBySingleScope && "cursor-not-allowed opacity-40",
                    )}
                  >
                    {s.label}
                    {selectedSources.includes(s.id) && (
                      <span className="w-4 h-4 rounded-full bg-gray-900 flex items-center justify-center">
                        <span className="text-white text-[10px]">✓</span>
                      </span>
                    )}
                  </button>
                    );
                  })()
                ))}
              </div>
            ))}
          </div>
          {selectedSources.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-100">
              <button
                onClick={() => selectedSources.forEach((id) => onToggle(id))}
                className="text-xs text-gray-500 hover:text-gray-900 transition-colors"
              >
                Clear all texts
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TraditionSelector({
  selectedTraditions,
  onToggle,
}: {
  selectedTraditions: string[];
  onToggle?: (tradition: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5" data-testid="compare-traditions">
      <span className="text-[11px] text-gray-500 mr-1">Compare:</span>
      {SUPPORTED_RELIGIONS.map((tradition) => {
        const selected = selectedTraditions.includes(tradition);
        const atMinimum = selected && selectedTraditions.length <= 2;
        return (
          <button
            key={tradition}
            type="button"
            aria-pressed={selected}
            disabled={atMinimum}
            onClick={() => onToggle?.(tradition)}
            className={cn(
              "rounded-full border px-2.5 py-1 text-[11px] transition-colors",
              selected
                ? "border-gray-900 bg-gray-900 text-white"
                : "border-gray-200 bg-white text-gray-600 hover:border-gray-400",
              atMinimum && "cursor-not-allowed opacity-70",
            )}
          >
            {RELIGION_LABELS[tradition]}
          </button>
        );
      })}
    </div>
  );
}

function UserMessage({ msg }: { msg: ChatMessage }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[75%] rounded-2xl rounded-tr-sm bg-gray-900 text-white px-4 py-3">
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
      </div>
    </div>
  );
}

// ── Mode badge ────────────────────────────────────────────────────────────────

const MODE_BADGE: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  strict_source_grounded: {
    label: "Grounded answer",
    icon: <BookMarked size={11} />,
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  general: {
    label: "General overview",
    icon: <Layers size={11} />,
    color: "bg-blue-50 text-blue-700 border-blue-200",
  },
  comparative: {
    label: "Comparative answer",
    icon: <GitCompare size={11} />,
    color: "bg-violet-50 text-violet-700 border-violet-200",
  },
};

function ModeBadge({ mode, titleLabel, scopeLabel }: { mode: string; titleLabel: string; scopeLabel: string }) {
  const cfg = MODE_BADGE[mode] ?? MODE_BADGE.general;
  return (
    <div className="flex items-center gap-2 mb-3 flex-wrap">
      <span className={cn("flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-semibold", cfg.color)}>
        {cfg.icon}
        {titleLabel || cfg.label}
      </span>
      <span className="text-[11px] text-gray-400">{scopeLabel}</span>
    </div>
  );
}

// ── Section renderer ──────────────────────────────────────────────────────────

function SectionBlock({ section }: { section: ResponseSection }) {
  const isTradition = section.type === "tradition_view";
  const isOverlap = section.type === "comparison_overlap";
  const isDiff = section.type === "comparison_difference";
  const isLimitation = section.type === "limitations";

  return (
    <div className={cn(
      "mt-3 first:mt-0",
      isOverlap && "rounded-xl border border-emerald-100 bg-emerald-50 p-3",
      isDiff && "rounded-xl border border-amber-100 bg-amber-50 p-3",
      isLimitation && "rounded-xl border border-gray-100 bg-gray-50 p-3",
    )}>
      {section.heading && (
        <p className={cn(
          "text-xs font-semibold mb-1",
          isTradition ? "text-gray-500 uppercase tracking-wider" : "text-gray-700",
          isOverlap && "text-emerald-700",
          isDiff && "text-amber-700",
          isLimitation && "text-gray-500",
        )}>
          {section.heading}
        </p>
      )}
      <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{section.body}</p>
    </div>
  );
}

// ── Reference list ────────────────────────────────────────────────────────────

// Normalize a free-form tradition/citation string to a tradition id used by the catalog.
function inferTradition(s?: string): string | null {
  if (!s) return null;
  const t = s.toLowerCase();
  const map: Record<string, string> = {
    islam: "islam", muslim: "islam", quran: "islam", "qur'an": "islam",
    christianity: "christianity", christian: "christianity", bible: "christianity", gospel: "christianity",
    judaism: "judaism", jewish: "judaism", torah: "judaism", tanakh: "judaism", talmud: "judaism",
    hinduism: "hinduism", hindu: "hinduism", "bhagavad gita": "hinduism", gita: "hinduism", vedas: "hinduism", upanishad: "hinduism",
    buddhism: "buddhism", buddhist: "buddhism", dhammapada: "buddhism", sutta: "buddhism",
    shintoism: "shintoism", shinto: "shintoism", kojiki: "shintoism", kami: "shintoism",
    sikhism: "sikhism", sikh: "sikhism", granth: "sikhism", gurbani: "sikhism", "guru granth": "sikhism",
  };
  for (const key of Object.keys(map)) if (t.includes(key)) return map[key];
  return null;
}

type LibBook = { id: string; tradition: string };

function CitationLink({ reference }: { reference: ResponseReference }) {
  const { data: books = [] } = useQuery<LibBook[]>({
    queryKey: ["/api/v1/library"],
    staleTime: 5 * 60_000,
  });

  const href = useMemo(() => {
    if (!reference) return "/read";
    const tradition = inferTradition(reference.tradition) ?? inferTradition(reference.citation);
    if (!tradition) return "/read";
    const matches = books.filter((b) => b.tradition === tradition);
    if (matches.length === 0) return `/read?tradition=${tradition}`;
    // Prefer a known canonical book id per tradition when available.
    const priority: Record<string, string[]> = {
      islam: ["quran", "hadith"],
      christianity: ["bible", "new-testament", "old-testament"],
      judaism: ["torah", "tanakh", "talmud"],
      hinduism: ["bhagavad-gita-as-it-is", "bhagavad-gita", "vedas", "upanishads"],
      buddhism: ["dhammapada", "tripitaka"],
      shintoism: ["kojiki"],
      sikhism: ["guru-granth-sahib"],
    };
    const order = priority[tradition] ?? [];
    const preferred = order.map((id) => matches.find((b) => b.id === id)).find(Boolean);
    return `/reader/${(preferred ?? matches[0]).id}`;
  }, [books, reference]);

  if (!reference) return null;

  return (
    <Link
      href={href}
      className="text-[11px] font-medium text-gray-700 hover:text-gray-900 hover:underline no-underline cursor-pointer"
      data-testid="citation-link"
      title={`Open ${reference.citation} in the Reader`}
    >
      {reference.citation}
    </Link>
  );
}

function ReferenceList({ references, grouped }: { references: ResponseReference[]; grouped: boolean }) {
  if (!references || references.length === 0) return null;

  if (grouped) {
    const byTradition = references.reduce<Record<string, ResponseReference[]>>((acc, r) => {
      const key = r.tradition || "Other";
      if (!acc[key]) acc[key] = [];
      acc[key].push(r);
      return acc;
    }, {});

    return (
      <div className="mt-4 pt-3 border-t border-gray-100">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2">Sources cited</p>
        {Object.entries(byTradition).map(([tradition, refs]) => (
          <div key={tradition} className="mb-2">
            <p className="text-[11px] font-semibold text-gray-500 mb-1">{tradition}</p>
            <div className="space-y-1">
              {refs.map((r, i) => (
                <div key={i} className="flex flex-col">
                  <span className="text-[10px] text-gray-400">
                    {r.source}{r.edition ? ` · ${r.edition}` : ""}
                  </span>
                  <CitationLink reference={r} />
                  {r.text && <span className="text-[11px] text-gray-500 italic">{r.text}</span>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="mt-4 pt-3 border-t border-gray-100">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2">Sources cited</p>
      <div className="space-y-1">
        {references.map((r, i) => (
          <div key={i} className="flex flex-col">
            <span className="text-[10px] text-gray-400">
              {r.source}{r.edition ? ` · ${r.edition}` : ""}
            </span>
            <CitationLink reference={r} />
            {r.text && <span className="text-[11px] text-gray-500 italic">{r.text}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Follow-up chips ───────────────────────────────────────────────────────────

function FollowUpChips({ followups, onSelect }: { followups: string[]; onSelect: (q: string) => void }) {
  if (!followups || followups.length === 0) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {followups.map((q, i) => (
        <button
          key={i}
          onClick={() => onSelect(q)}
          className="text-[11px] px-3 py-1 rounded-full border border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-400 hover:bg-white transition-all text-left"
        >
          {q}
        </button>
      ))}
    </div>
  );
}

// ── Limitations block ─────────────────────────────────────────────────────────

function LimitationsBlock({ text }: { text: string }) {
  return (
    <div className="mt-3 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Limitations</p>
      <p className="text-xs text-gray-600 leading-relaxed">{text}</p>
    </div>
  );
}

// ── Structured assistant message ──────────────────────────────────────────────

function parseStructured(content: string): StructuredChatResponse | null {
  if (!content.startsWith("{")) return null;
  try {
    const parsed = JSON.parse(content);
    if (parsed && parsed.mode && parsed.meta && parsed.sections) return parsed as StructuredChatResponse;
    return null;
  } catch {
    return null;
  }
}

function StructuredAssistantMessage({ msg, onFollowUp }: { msg: ChatMessage; onFollowUp: (q: string) => void }) {
  const structured = parseStructured(msg.content);

  if (!structured) {
    return (
      <div className="flex gap-3">
        <div className="w-7 h-7 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Sparkles size={13} className="text-gray-700" />
        </div>
        <div className="max-w-[80%] rounded-2xl rounded-tl-sm border border-gray-200 bg-white px-4 py-3">
          <p className="text-sm leading-relaxed whitespace-pre-wrap text-gray-800">{msg.content}</p>
        </div>
      </div>
    );
  }

  const { mode, meta, summary, sections, references, limitations, followups, renderHints } = structured;
  const groupRefs = renderHints?.groupReferencesByTradition !== false;

  const limitationsSection = sections.find((s) => s.type === "limitations");
  const mainSections = sections.filter((s) => s.type !== "limitations");

  return (
    <div className="flex gap-3">
      <div className="w-7 h-7 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Sparkles size={13} className="text-gray-700" />
      </div>
      <div className="max-w-[82%] rounded-2xl rounded-tl-sm border border-gray-200 bg-white px-4 py-3">
        <ModeBadge mode={mode} titleLabel={meta.titleLabel} scopeLabel={meta.scopeLabel} />

        {summary && (
          <p className="text-sm font-medium text-gray-900 leading-relaxed mb-3">{summary}</p>
        )}

        <div className="space-y-0">
          {mainSections.map((section, i) => (
            <SectionBlock key={i} section={section} />
          ))}
        </div>

        {limitations && <LimitationsBlock text={limitations} />}
        {limitationsSection && !limitations && <LimitationsBlock text={limitationsSection.body} />}

        <ReferenceList references={references} grouped={groupRefs} />

        {followups && followups.length > 0 && (
          <FollowUpChips followups={followups} onSelect={onFollowUp} />
        )}
      </div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({
  onPromptClick,
}: {
  onPromptClick: (prompt: string) => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-8 text-center">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4">
        <img src={compassIcon} alt="Rellio compass" className="w-14 h-14 object-contain rounded-xl" />
      </div>
      <h2 className="font-serif text-2xl text-gray-900 mb-2">
        {mode === "compare" ? "Compare across traditions" : mode === "single" ? "Ask within one tradition" : "Ask across traditions"}
      </h2>
      <p className="text-sm text-gray-500 leading-relaxed mb-8 max-w-md">
        {mode === "single"
          ? "Choose a tradition and source first. Answers stay within that evidence."
          : mode === "compare"
            ? "Choose at least two traditions. Each perspective is grounded in its own retrieved sources."
            : "Ask a broad question. Answers use available indexed sources and disclose missing evidence."}
      </p>
      <div className="w-full max-w-lg space-y-2">
        {SUGGESTED_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            onClick={() => onPromptClick(prompt)}
            className="w-full text-left rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 hover:border-gray-400 hover:bg-gray-50 transition-all"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────

export function CenterChatPanel({
  sessionId,
  messages,
  onMessagesChange,
  selectedSources,
  onSourceToggle,
  mode = "ask",
  selectedTraditions: compareTraditions = [],
  onTraditionToggle,
  pinnedSources,
  initialSend,
  onInitialSent,
  requestContext,
}: CenterChatPanelProps) {
  const effectiveSources = pinnedSources ?? selectedSources;
  const showSourcePicker = !pinnedSources;
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const selectedSourceObjects = ALL_SOURCES.filter((s) => effectiveSources.includes(s.id));

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isSending) return;
      const sourceScope = mode === "single" ? effectiveSources : [];
      const activeSources = sourceScope
        .map((id) => ALL_SOURCES.find((source) => source.id === id))
        .filter(Boolean) as Source[];
      const selectedTraditions = mode === "compare"
        ? compareTraditions
        : mode === "single"
          ? Array.from(new Set(activeSources.map((source) => source.religion)))
          : [];
      const scopeError = mode === "single" && selectedTraditions.length === 0
        ? "Choose a tradition from Texts to use before asking in Single tradition mode."
        : mode === "compare" && selectedTraditions.length < 2
          ? "Choose at least two traditions before asking for a comparison."
          : null;
      const userMsg: ChatMessage = {
        id: `u-${Date.now()}`,
        role: "user",
        content: text.trim(),
        timestamp: Date.now(),
      };
      const updatedMsgs = [...messages, userMsg];
      setInput("");
      if (scopeError) {
        onMessagesChange([
          ...updatedMsgs,
          {
            id: `e-${Date.now()}`,
            role: "assistant",
            content: scopeError,
            timestamp: Date.now(),
          },
        ]);
        return;
      }
      onMessagesChange(updatedMsgs);
      setIsSending(true);

      try {
        const context: Record<string, unknown> = {
          religion: null,
          book: null,
          chapter: null,
          ...(requestContext ?? {}),
          selectedSources: sourceScope,
          selectedTraditions,
          mode,
        };

        const payload: Record<string, unknown> = {
          message: text.trim(),
          sessionId,
          context,
        };

        const res = await apiRequest("/api/chat", {
          method: "POST",
          body: JSON.stringify(payload),
        }) as { aiMessage?: { content?: string }; structuredResponse?: StructuredChatResponse; message?: string; response?: string };

        const reply = res?.structuredResponse
          ? JSON.stringify(res.structuredResponse)
          : res?.aiMessage?.content ||
            res?.message ||
            res?.response ||
            "I'm sorry, I couldn't find an answer. Please try again.";

        const assistantMsg: ChatMessage = {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: reply,
          timestamp: Date.now(),
        };
        onMessagesChange([...updatedMsgs, assistantMsg]);
      } catch (error) {
        const errorMessage = error instanceof Error && error.message
          ? error.message
          : "The answer service is unavailable. Please try again.";
        const errMsg: ChatMessage = {
          id: `e-${Date.now()}`,
          role: "assistant",
          content: errorMessage,
          timestamp: Date.now(),
        };
        onMessagesChange([...updatedMsgs, errMsg]);
      } finally {
        setIsSending(false);
      }
    },
    [
      isSending,
      messages,
      onMessagesChange,
      sessionId,
      effectiveSources,
      mode,
      compareTraditions,
      requestContext,
    ]
  );

  // Fire `initialSend` exactly once per (sessionId, prompt) pair.
  const sentInitialRef = useRef<string | null>(null);
  useEffect(() => {
    const fingerprint = initialSend ? `${sessionId}::${initialSend}` : null;
    if (!fingerprint || sentInitialRef.current === fingerprint) return;
    if (isSending) return;
    sentInitialRef.current = fingerprint;
    sendMessage(initialSend!);
    // Notify parent so it can clear `initialSend` and prevent re-fires across sessions.
    onInitialSent?.();
  }, [initialSend, sessionId, sendMessage, isSending, onInitialSent]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const toggleVoice = useCallback(() => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      return;
    }
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    const SR = (window as unknown as { SpeechRecognition?: typeof SpeechRecognition; webkitSpeechRecognition?: typeof SpeechRecognition }).SpeechRecognition || (window as unknown as { webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition;
    if (!SR) return;
    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      setInput((prev) => prev ? `${prev} ${transcript}` : transcript);
      setIsListening(false);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [isListening]);

  return (
    <div className="flex flex-col flex-1 h-full min-h-0 min-w-0 bg-white">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {messages.length === 0 ? (
          <EmptyState onPromptClick={(p) => setInput(p)} />
        ) : (
          <div className="px-6 py-6 space-y-5 max-w-3xl mx-auto">
            {messages.map((msg) =>
              msg.role === "user" ? (
                <UserMessage key={msg.id} msg={msg} />
              ) : (
                <StructuredAssistantMessage
                  key={msg.id}
                  msg={msg}
                  onFollowUp={(q) => sendMessage(q)}
                />
              )
            )}
            {isSending && (
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Sparkles size={13} className="text-gray-700" />
                </div>
                <div className="rounded-2xl rounded-tl-sm border border-gray-200 bg-white px-4 py-3">
                  <div className="flex gap-1.5 items-center">
                    <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: "0.15s" }} />
                    <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: "0.3s" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="flex-shrink-0 border-t border-gray-200 bg-white px-6 py-4">
        <div className="max-w-3xl mx-auto">
          {/* Controls above composer: "Texts to use" picker + selected source chips */}
          {(showSourcePicker && mode === "single") || mode === "compare" || selectedSourceObjects.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1.5 mb-3" data-testid="texts-to-use-row">
              {showSourcePicker && mode === "single" && (
                <SourceSelector selectedSources={selectedSources} onToggle={onSourceToggle} />
              )}
              {mode === "compare" && (
                <TraditionSelector
                  selectedTraditions={compareTraditions}
                  onToggle={onTraditionToggle}
                />
              )}
              {selectedSourceObjects.map((s) => (
                <SourceChip key={s.id} source={s} onRemove={() => onSourceToggle(s.id)} />
              ))}
            </div>
          ) : null}

          <div className="flex items-end gap-3 rounded-2xl border border-gray-300 bg-white px-4 py-3 focus-within:border-gray-500 transition-colors">
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
              }}
              onKeyDown={handleKeyDown}
              placeholder={mode === "compare"
                ? "Ask a theme to compare across traditions…"
                : "Ask about meaning, history, or spiritual themes…"}
              className="flex-1 resize-none bg-transparent text-sm text-gray-900 placeholder:text-gray-400 outline-none min-w-0 leading-relaxed"
              style={{ height: "24px", maxHeight: "160px" }}
              data-testid="chat-input"
            />
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={toggleVoice}
                className={cn(
                  "p-2 rounded-full transition-colors",
                  isListening
                    ? "bg-gray-900 text-white"
                    : "text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                )}
                title={isListening ? "Stop listening" : "Voice input"}
              >
                {isListening ? <MicOff size={16} /> : <Mic size={16} />}
              </button>
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || isSending}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Send
                <Send size={13} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
