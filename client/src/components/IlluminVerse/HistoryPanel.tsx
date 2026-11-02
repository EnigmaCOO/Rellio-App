import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, Clock, MessageCircle } from "lucide-react";
import type { ChatMessage } from "@shared/schema";

interface HistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  onSelectMessage?: (message: ChatMessage) => void;
}

export function HistoryPanel({ isOpen, onClose, sessionId, onSelectMessage }: HistoryPanelProps) {
  const { data: messages, isLoading } = useQuery<ChatMessage[]>({
    queryKey: [`/api/chat/${sessionId}`],
    enabled: isOpen,
    staleTime: 30 * 1000,
  });

  const groupedMessages = messages?.reduce((groups, message) => {
    const date = new Date(message.timestamp).toDateString();
    if (!groups[date]) groups[date] = [];
    groups[date].push(message);
    return groups;
  }, {} as Record<string, ChatMessage[]>) || {};

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-y-0 right-0 w-80 shadow-2xl border-l z-50 transform transition-transform duration-300 ease-in-out"
      style={{ background: 'var(--bg-elevated)', borderColor: '#e5e5e5' }}
    >
      <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: '#e5e5e5' }}>
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5" style={{ color: 'var(--text-muted)' }} />
          <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Chat History</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="hover:bg-gray-100"
          style={{ color: 'var(--text-muted)' }}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1 h-[calc(100vh-80px)]">
        <div className="p-4">
          {isLoading ? (
            <div className="text-center py-8 text-sm" style={{ color: 'var(--text-muted)' }}>Loading history...</div>
          ) : Object.keys(groupedMessages).length === 0 ? (
            <div className="text-center py-8 text-sm" style={{ color: 'var(--text-muted)' }}>No chat history yet</div>
          ) : (
            Object.entries(groupedMessages).map(([date, dayMessages]) => (
              <div key={date} className="mb-6">
                <div
                  className="text-xs font-semibold uppercase tracking-wide mb-3 sticky top-0 py-1"
                  style={{ color: 'var(--text-muted)', background: 'var(--bg-elevated)' }}
                >
                  {date}
                </div>
                <div className="space-y-3">
                  {dayMessages.map((message) => (
                    <div
                      key={message.id}
                      className={`p-3 rounded-lg cursor-pointer transition-colors hover:bg-gray-50 ${
                        message.type === 'user'
                          ? 'bg-gray-100 border-l-2 border-gray-400'
                          : 'bg-gray-100 border border-gray-200'
                      }`}
                      onClick={() => onSelectMessage?.(message)}
                    >
                      <div className="flex items-start gap-2">
                        <MessageCircle
                          className="h-4 w-4 mt-0.5"
                          style={{ color: '#0a0a0a' }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm line-clamp-3" style={{ color: 'var(--text-primary)' }}>
                            {message.content}
                          </div>
                          <div className="text-xs mt-1" style={{ color: 'var(--text-disabled)' }}>
                            {new Date(message.timestamp as string | number | Date).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
