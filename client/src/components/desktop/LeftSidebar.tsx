import { useState } from "react";
import { useLocation } from "wouter";
import { Search, MessageSquare, Lightbulb, Plus, Clock, X } from "lucide-react";
import { cn } from "@/lib/utils";
import rellioLogo from "@assets/rellio-logo.png";

export type ChatSession = {
  id: string;
  title: string;
  snippet: string;
  timestamp: number;
};

const LS_KEY = "rellio_desktop_sessions";

export function loadSessions(): ChatSession[] {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveSession(session: ChatSession) {
  const all = loadSessions();
  const existing = all.findIndex((s) => s.id === session.id);
  if (existing > -1) {
    all[existing] = session;
  } else {
    all.unshift(session);
  }
  localStorage.setItem(LS_KEY, JSON.stringify(all.slice(0, 50)));
}

interface LeftSidebarProps {
  activeSessionId: string | null;
  onSessionSelect: (id: string) => void;
  onNewChat: () => void;
  sessions: ChatSession[];
  onClose?: () => void;
}

export function LeftSidebar({ activeSessionId, onSessionSelect, onNewChat, sessions, onClose }: LeftSidebarProps) {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");

  const filtered = sessions.filter(
    (s) =>
      !search ||
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      s.snippet.toLowerCase().includes(search.toLowerCase())
  );

  const formatTime = (ts: number) => {
    const diff = Date.now() - ts;
    if (diff < 60000) return "just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      {/* Logo + close */}
      <div className="px-5 pt-5 pb-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <img src={rellioLogo} alt="Rellio" className="h-10 w-auto object-contain" />
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={onNewChat}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-900"
              title="New chat"
            >
              <Plus size={16} />
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-900"
                title="Close"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
          <Search size={14} className="text-gray-400 flex-shrink-0" />
          <input
            type="text"
            placeholder="Search chats, scriptures, themes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-sm text-gray-700 placeholder:text-gray-400 outline-none min-w-0"
          />
        </div>
      </div>

      {/* Chat history */}
      <div className="flex-1 overflow-y-auto py-3 min-h-0">
        {filtered.length === 0 ? (
          <div className="px-5 py-6 text-center">
            <MessageSquare size={24} className="text-gray-300 mx-auto mb-2" />
            {search ? (
              <p className="text-xs text-gray-400">No chats match your search</p>
            ) : (
              <>
                <p className="text-xs text-gray-500 font-medium">No conversations yet</p>
                <p className="text-xs text-gray-400 mt-1">Start by asking a question below</p>
              </>
            )}
          </div>
        ) : (
          <>
            <p className="px-5 text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">
              Chat History
            </p>
            <div className="space-y-0.5 px-3">
              {filtered.map((session) => (
                <button
                  key={session.id}
                  onClick={() => onSessionSelect(session.id)}
                  className={cn(
                    "w-full text-left rounded-xl px-3 py-2.5 transition-all",
                    activeSessionId === session.id
                      ? "bg-gray-100 border border-gray-200"
                      : "hover:bg-gray-50 border border-transparent"
                  )}
                >
                  <p className="text-sm font-medium text-gray-900 truncate">{session.title}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Clock size={10} className="text-gray-400 flex-shrink-0" />
                    <p className="text-[11px] text-gray-400">{formatTime(session.timestamp)}</p>
                    {session.snippet && (
                      <p className="text-[11px] text-gray-400 truncate">· {session.snippet}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Bottom exploration buttons */}
      <div className="p-4 border-t border-gray-100 space-y-2">
        <button
          onClick={() => { navigate("/mysteries"); onClose?.(); }}
          className="w-full flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-left hover:border-gray-400 hover:bg-gray-100 transition-all"
        >
          <div className="w-8 h-8 rounded-xl bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
            <Lightbulb size={14} className="text-gray-700" />
          </div>
          <span className="text-sm font-medium text-gray-800">Biggest Unsolved Mysteries</span>
        </button>
      </div>
    </div>
  );
}
