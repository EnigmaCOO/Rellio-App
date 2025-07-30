import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  History, 
  MessageSquare, 
  Clock, 
  BookOpen, 
  Trash2, 
  Search,
  X,
  Star
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import type { Religion, ChatMessage } from "@shared/schema";

interface ChatSession {
  id: string;
  title: string;
  context: {
    religion: Religion | null;
    book: string;
    chapter: number;
  };
  messageCount: number;
  lastActivity: number;
  isStarred?: boolean;
}

interface ChatHistoryManagerProps {
  currentSessionId: string;
  onSessionSelect: (sessionId: string) => void;
  onNewSession: () => void;
  context?: {
    religion: Religion | null;
    book: string;
    chapter: number;
  };
}

export function ChatHistoryManager({
  currentSessionId,
  onSessionSelect,
  onNewSession,
  context
}: ChatHistoryManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);

  // Load sessions from localStorage
  useEffect(() => {
    const loadSessions = () => {
      const stored = localStorage.getItem('rellio-chat-sessions');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setSessions(parsed);
        } catch (error) {
          console.error('Failed to parse stored sessions:', error);
          setSessions([]);
        }
      }
    };

    loadSessions();
  }, []);

  // Save current session info
  useEffect(() => {
    if (context && currentSessionId) {
      const updateCurrentSession = () => {
        setSessions(prev => {
          const existing = prev.find(s => s.id === currentSessionId);
          const title = context.religion 
            ? `${context.religion} - ${context.book} Ch.${context.chapter}`
            : 'General Discussion';

          const updatedSession: ChatSession = {
            id: currentSessionId,
            title,
            context: context,
            messageCount: existing?.messageCount || 0,
            lastActivity: Date.now(),
            isStarred: existing?.isStarred || false
          };

          const filtered = prev.filter(s => s.id !== currentSessionId);
          const updated = [updatedSession, ...filtered].slice(0, 20); // Keep max 20 sessions
          
          localStorage.setItem('rellio-chat-sessions', JSON.stringify(updated));
          return updated;
        });
      };

      updateCurrentSession();
    }
  }, [context, currentSessionId]);

  // Filter sessions based on search
  const filteredSessions = sessions.filter(session => 
    session.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (session.context.religion && session.context.religion.toLowerCase().includes(searchTerm.toLowerCase())) ||
    session.context.book.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleStar = (sessionId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setSessions(prev => {
      const updated = prev.map(session => 
        session.id === sessionId 
          ? { ...session, isStarred: !session.isStarred }
          : session
      );
      localStorage.setItem('rellio-chat-sessions', JSON.stringify(updated));
      return updated;
    });
  };

  const deleteSession = (sessionId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setSessions(prev => {
      const updated = prev.filter(s => s.id !== sessionId);
      localStorage.setItem('rellio-chat-sessions', JSON.stringify(updated));
      return updated;
    });
  };

  const formatLastActivity = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  const getReligionColor = (religion: Religion | null) => {
    switch (religion) {
      case 'bible': return 'text-blue-600 bg-blue-50';
      case 'quran': return 'text-green-600 bg-green-50';
      case 'torah': return 'text-indigo-600 bg-indigo-50';
      case 'hindu': return 'text-orange-600 bg-orange-50';
      case 'buddhist': return 'text-purple-600 bg-purple-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  if (!isOpen) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="text-gray-700 hover:bg-gray-50"
      >
        <History className="h-4 w-4 mr-1" />
        History ({sessions.length})
      </Button>
    );
  }

  return (
    <Card className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg z-50">
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <History className="h-4 w-4 text-teal-600" />
            Chat History
          </h3>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onNewSession}
              className="text-xs text-teal-600 border-teal-200 hover:bg-teal-50"
            >
              New Chat
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="mb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-8 text-sm"
            />
          </div>
        </div>

        {/* Sessions List */}
        <ScrollArea className="h-64">
          {filteredSessions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No chat history found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredSessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() => {
                    onSessionSelect(session.id);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "p-3 rounded-lg border cursor-pointer transition-all hover:shadow-sm",
                    session.id === currentSessionId 
                      ? "bg-teal-50 border-teal-200" 
                      : "bg-white border-gray-200 hover:bg-gray-50"
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {session.context.religion && (
                          <Badge 
                            variant="secondary" 
                            className={cn("text-xs px-1 py-0", getReligionColor(session.context.religion))}
                          >
                            {session.context.religion}
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-xs px-1 py-0">
                          {session.messageCount} msgs
                        </Badge>
                      </div>
                      <p className="font-medium text-sm text-gray-800 truncate">
                        {session.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Clock className="h-3 w-3 text-gray-400" />
                        <span className="text-xs text-gray-500">
                          {formatLastActivity(session.lastActivity)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1 ml-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => toggleStar(session.id, e)}
                        className={cn(
                          "h-6 w-6 p-0",
                          session.isStarred ? "text-yellow-500" : "text-gray-400 hover:text-yellow-500"
                        )}
                      >
                        <Star className={cn("h-3 w-3", session.isStarred && "fill-current")} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => deleteSession(session.id, e)}
                        className="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    </Card>
  );
}