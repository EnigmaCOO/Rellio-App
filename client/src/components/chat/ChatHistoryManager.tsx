import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  History, 
  Search, 
  Download, 
  Trash2, 
  MessageCircle, 
  Calendar,
  BookOpen,
  X,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@shared/schema";
import type { ScholarPersona } from "./ScholarPersonas";

interface ChatHistoryEntry {
  id: string;
  sessionId: string;
  title: string;
  summary: string;
  messages: ChatMessage[];
  persona?: ScholarPersona;
  context: {
    religion: string | null;
    book: string;
    chapter: number;
  };
  lastActivity: number;
  messageCount: number;
  bookmarked: boolean;
}

interface ChatHistoryManagerProps {
  isOpen: boolean;
  onClose: () => void;
  currentSessionId: string;
  currentMessages: ChatMessage[];
  currentPersona?: ScholarPersona | null;
  currentContext: {
    religion: string | null;
    book: string;
    chapter: number;
  };
  onLoadSession: (entry: ChatHistoryEntry) => void;
  onHighlightVerse?: (religion: string, book: string, chapter: number) => void;
}

export function ChatHistoryManager({
  isOpen,
  onClose,
  currentSessionId,
  currentMessages,
  currentPersona,
  currentContext,
  onLoadSession,
  onHighlightVerse
}: ChatHistoryManagerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [historyEntries, setHistoryEntries] = useState<ChatHistoryEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<ChatHistoryEntry[]>([]);

  // Load chat history from localStorage on mount
  useEffect(() => {
    const loadHistory = () => {
      try {
        const stored = localStorage.getItem('rellio-chat-history');
        if (stored) {
          const parsed = JSON.parse(stored);
          setHistoryEntries(parsed);
          setFilteredEntries(parsed);
        }
      } catch (error) {
        console.error('Failed to load chat history:', error);
      }
    };

    if (isOpen) {
      loadHistory();
    }
  }, [isOpen]);

  // Auto-save current session when messages change
  useEffect(() => {
    if (currentMessages.length > 0) {
      saveCurrentSession();
    }
  }, [currentMessages, currentPersona, currentContext]);

  // Filter entries based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredEntries(historyEntries);
    } else {
      const filtered = historyEntries.filter(entry => 
        entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.context.religion?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.context.book.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.persona?.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredEntries(filtered);
    }
  }, [searchQuery, historyEntries]);

  const saveCurrentSession = () => {
    if (currentMessages.length === 0) return;

    const lastUserMessage = currentMessages.filter(m => m.type === 'user').pop();
    const title = lastUserMessage?.content.substring(0, 50) + (lastUserMessage?.content.length > 50 ? '...' : '') || 'New Conversation';
    
    const summary = currentMessages.length > 1 
      ? currentMessages[currentMessages.length - 1].content.substring(0, 100) + '...'
      : 'New conversation started';

    const entry: ChatHistoryEntry = {
      id: currentSessionId,
      sessionId: currentSessionId,
      title,
      summary,
      messages: currentMessages,
      persona: currentPersona || undefined,
      context: currentContext,
      lastActivity: Date.now(),
      messageCount: currentMessages.length,
      bookmarked: false
    };

    const existing = [...historyEntries];
    const existingIndex = existing.findIndex(e => e.sessionId === currentSessionId);
    
    if (existingIndex >= 0) {
      existing[existingIndex] = entry;
    } else {
      existing.unshift(entry);
    }

    // Keep only the most recent 50 conversations
    const trimmed = existing.slice(0, 50);
    
    setHistoryEntries(trimmed);
    localStorage.setItem('rellio-chat-history', JSON.stringify(trimmed));
  };

  const deleteEntry = (entryId: string) => {
    const updated = historyEntries.filter(e => e.id !== entryId);
    setHistoryEntries(updated);
    localStorage.setItem('rellio-chat-history', JSON.stringify(updated));
  };

  const toggleBookmark = (entryId: string) => {
    const updated = historyEntries.map(e => 
      e.id === entryId ? { ...e, bookmarked: !e.bookmarked } : e
    );
    setHistoryEntries(updated);
    localStorage.setItem('rellio-chat-history', JSON.stringify(updated));
  };

  const exportToPDF = (entry: ChatHistoryEntry) => {
    // Create a simple text export (PDF would require additional library)
    const content = [
      `Chat History Export`,
      `Title: ${entry.title}`,
      `Date: ${new Date(entry.lastActivity).toLocaleDateString()}`,
      `Persona: ${entry.persona?.name || 'None'}`,
      `Context: ${entry.context.religion} - ${entry.context.book} Chapter ${entry.context.chapter}`,
      `Messages: ${entry.messageCount}`,
      '',
      'Conversation:',
      ...entry.messages.map(m => `${m.type.toUpperCase()}: ${m.content}`)
    ].join('\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rellio-chat-${entry.id}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-80 bg-white border-l border-gray-200 shadow-xl z-40 animate-in slide-in-from-right duration-300">
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-teal-50 to-cyan-50">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-teal-600" />
            <h2 className="font-semibold text-gray-900">Chat History</h2>
            <Badge variant="secondary" className="text-xs">
              {historyEntries.length}
            </Badge>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 text-sm"
            />
          </div>
        </div>

        {/* History List */}
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-2">
            {filteredEntries.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <MessageCircle className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No conversations found</p>
                {searchQuery && (
                  <p className="text-xs mt-1">Try a different search term</p>
                )}
              </div>
            ) : (
              filteredEntries.map((entry) => (
                <Card
                  key={entry.id}
                  className={cn(
                    "p-3 cursor-pointer transition-all duration-200 hover:shadow-md border",
                    entry.sessionId === currentSessionId 
                      ? "border-teal-300 bg-teal-50" 
                      : "border-gray-200 hover:border-gray-300",
                    entry.bookmarked && "border-yellow-300"
                  )}
                  onClick={() => onLoadSession(entry)}
                >
                  <div className="space-y-2">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm text-gray-900 truncate">
                          {entry.title}
                        </h3>
                        <div className="flex items-center gap-1 mt-1">
                          <Calendar className="h-3 w-3 text-gray-400" />
                          <span className="text-xs text-gray-500">
                            {formatDate(entry.lastActivity)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleBookmark(entry.id);
                          }}
                        >
                          <BookOpen className={cn(
                            "h-3 w-3",
                            entry.bookmarked ? "text-yellow-600" : "text-gray-400"
                          )} />
                        </Button>
                      </div>
                    </div>

                    {/* Context & Persona */}
                    <div className="space-y-1">
                      {entry.context.religion && (
                        <div className="flex items-center gap-1">
                          <Badge variant="outline" className="text-xs px-2 py-0">
                            {entry.context.religion}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {entry.context.book} Ch. {entry.context.chapter}
                          </span>
                          {onHighlightVerse && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-4 w-4 p-0 ml-auto"
                              onClick={(e) => {
                                e.stopPropagation();
                                onHighlightVerse(
                                  entry.context.religion!,
                                  entry.context.book,
                                  entry.context.chapter
                                );
                              }}
                            >
                              <ChevronRight className="h-3 w-3 text-teal-600" />
                            </Button>
                          )}
                        </div>
                      )}
                      
                      {entry.persona && (
                        <Badge 
                          variant="secondary" 
                          className={cn("text-xs", entry.persona.textColor)}
                        >
                          {entry.persona.name}
                        </Badge>
                      )}
                    </div>

                    {/* Summary */}
                    <p className="text-xs text-gray-600 line-clamp-2">
                      {entry.summary}
                    </p>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <MessageCircle className="h-3 w-3" />
                        <span>{entry.messageCount} messages</span>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            exportToPDF(entry);
                          }}
                        >
                          <Download className="h-3 w-3 mr-1" />
                          Export
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteEntry(entry.id);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <p className="text-xs text-gray-500 text-center">
            Conversations auto-saved • {historyEntries.length}/50 stored
          </p>
        </div>
      </div>
    </div>
  );
}