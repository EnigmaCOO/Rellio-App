import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Sparkles, Layers, Menu, BookOpen } from "lucide-react";
import { LeftSidebar, loadSessions, saveSession, type ChatSession } from "@/components/desktop/LeftSidebar";
import { CenterChatPanel, type ChatMessage } from "@/components/desktop/CenterChatPanel";
import { SUPPORTED_RELIGIONS } from "@shared/scriptureSources";

function generateId() {
  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

const LS_MESSAGES_KEY = "rellio_desktop_messages";

function loadMessages(sessionId: string): ChatMessage[] {
  try {
    const all = JSON.parse(localStorage.getItem(LS_MESSAGES_KEY) || "{}");
    return all[sessionId] ?? [];
  } catch {
    return [];
  }
}

function persistMessages(sessionId: string, messages: ChatMessage[]) {
  try {
    const all = JSON.parse(localStorage.getItem(LS_MESSAGES_KEY) || "{}");
    all[sessionId] = messages.slice(-100);
    localStorage.setItem(LS_MESSAGES_KEY, JSON.stringify(all));
  } catch { /* ignore */ }
}

type AskMode = "ask" | "single" | "compare";

export default function AskPage() {
  const [location] = useLocation();
  const [sessions, setSessions] = useState<ChatSession[]>(() => loadSessions());
  // Always begin on a fresh chat when the Ask page mounts; past chats remain
  // reachable from the history sidebar.
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [compareTraditions, setCompareTraditions] = useState<string[]>([...SUPPORTED_RELIGIONS]);
  const [mode, setMode] = useState<AskMode>("ask");
  const [leftOpen, setLeftOpen] = useState(false);
  const [initialSend, setInitialSend] = useState<string | null>(null);
  // Track which (search) strings we've already consumed so re-renders don't double-fire.
  const consumedQueryRef = useRef<Set<string>>(new Set());

  // Parse query string on every navigation to /ask (including from /compare → /ask?mode=compare).
  useEffect(() => {
    const search = location.includes("?") ? location.split("?")[1] : window.location.search.replace(/^\?/, "");
    if (!search) return;
    if (consumedQueryRef.current.has(search)) return;
    const params = new URLSearchParams(search);
    const m = params.get("mode");
    const seed = params.get("seed");
    if (!m && !seed) return;
    consumedQueryRef.current.add(search);
    if (m === "compare") {
      setMode("compare");
      setSelectedSources([]);
    } else if (m === "single") {
      setMode("single");
    } else if (m === "ask") {
      setMode("ask");
      setSelectedSources([]);
    }
    if (seed) {
      const newId = generateId();
      setActiveSessionId(newId);
      setMessages([]);
      setInitialSend(seed);
    }
    window.history.replaceState({}, "", "/ask");
  }, [location]);

  const handleMessagesChange = useCallback(
    (msgs: ChatMessage[]) => {
      const id = activeSessionId;
      if (!id) return;
      setMessages(msgs);
      persistMessages(id, msgs);
      const firstUser = msgs.find((m) => m.role === "user");
      if (firstUser) {
        const title = firstUser.content.slice(0, 45) + (firstUser.content.length > 45 ? "…" : "");
        const snippet = msgs.length > 1 ? `${msgs.length} messages` : "";
        saveSession({ id, title, snippet, timestamp: firstUser.timestamp });
        setSessions(loadSessions());
      }
    },
    [activeSessionId],
  );

  const handleNewChat = useCallback(() => {
    const newId = generateId();
    setActiveSessionId(newId);
    setMessages([]);
    setLeftOpen(false);
  }, []);

  const handleSessionSelect = useCallback((id: string) => {
    setActiveSessionId(id);
    setMessages(loadMessages(id));
    setLeftOpen(false);
  }, []);

  const handleSourceToggle = useCallback((sourceId: string) => {
    if (mode === "compare") return; // Sources are auto-managed in compare mode
    setSelectedSources((prev) => (prev.includes(sourceId) ? prev.filter((s) => s !== sourceId) : [...prev, sourceId]));
  }, [mode]);
  const handleTraditionToggle = useCallback((tradition: string) => {
    setCompareTraditions((prev) => {
      if (prev.includes(tradition)) {
        return prev.length > 2 ? prev.filter((item) => item !== tradition) : prev;
      }
      return [...prev, tradition];
    });
  }, []);

  const currentSessionId = useMemo(() => activeSessionId ?? generateId(), [activeSessionId]);
  useEffect(() => {
    if (!activeSessionId) setActiveSessionId(currentSessionId);
  }, [activeSessionId, currentSessionId]);

  return (
    <div className="flex h-full w-full overflow-hidden bg-white relative">
      {leftOpen && <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setLeftOpen(false)} />}

      {/* Chat history — slide-in drawer at every breakpoint */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-[85vw] sm:w-80 transition-transform duration-300 ease-in-out",
          leftOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <LeftSidebar
          activeSessionId={activeSessionId}
          onSessionSelect={handleSessionSelect}
          onNewChat={handleNewChat}
          sessions={sessions}
          onClose={() => setLeftOpen(false)}
        />
      </div>

      {/* Center column with mode header + chat */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top bar: mobile menu + mode toggle */}
        <div className="flex items-center gap-2 px-3 lg:px-6 py-2.5 border-b border-gray-100 flex-shrink-0">
          <button
            onClick={() => setLeftOpen(true)}
            className="p-2 -ml-1 rounded-xl hover:bg-gray-100 text-gray-600"
            aria-label="Open chat history"
            data-testid="ask-menu"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 p-0.5">
            <button
              onClick={() => { setMode("ask"); setSelectedSources([]); }}
              data-testid="mode-ask"
              className={cn(
                "flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full text-xs font-semibold transition-colors",
                mode === "ask" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500",
              )}
            >
              <Sparkles size={11} /> Ask
            </button>
            <button
              onClick={() => setMode("single")}
              data-testid="mode-single"
              className={cn(
                "flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full text-xs font-semibold transition-colors",
                mode === "single" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500",
              )}
            >
              <BookOpen size={11} />
              <span className="hidden sm:inline">Single tradition</span>
              <span className="sm:hidden">Single</span>
            </button>
            <button
              onClick={() => {
                setMode("compare");
                setSelectedSources([]);
                if (compareTraditions.length === 0) setCompareTraditions([...SUPPORTED_RELIGIONS]);
              }}
              data-testid="mode-compare"
              className={cn(
                "flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full text-xs font-semibold transition-colors",
                mode === "compare" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500",
              )}
            >
              <Layers size={11} />
              <span className="hidden sm:inline">Compare across traditions</span>
              <span className="sm:hidden">Compare</span>
            </button>
          </div>
        </div>

        <CenterChatPanel
          sessionId={currentSessionId}
          messages={messages}
          onMessagesChange={handleMessagesChange}
          selectedSources={selectedSources}
          onSourceToggle={handleSourceToggle}
          mode={mode}
          selectedTraditions={compareTraditions}
          onTraditionToggle={handleTraditionToggle}
          initialSend={initialSend}
          onInitialSent={() => setInitialSend(null)}
        />
      </div>
    </div>
  );
}
