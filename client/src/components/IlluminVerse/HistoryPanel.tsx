import { useState, useEffect } from "react";
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

  // Group messages by date
  const groupedMessages = messages?.reduce((groups, message) => {
    const date = new Date(message.timestamp).toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {} as Record<string, ChatMessage[]>) || {};

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-80 bg-rellio-white shadow-2xl border-l border-gray-200 z-50 transform transition-transform duration-300 ease-in-out">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-rellio-dark-gray" />
          <h3 className="font-semibold text-rellio-dark-gray">Chat History</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="text-gray-500 hover:text-rellio-dark-gray"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Timeline Content */}
      <ScrollArea className="flex-1 h-[calc(100vh-80px)]">
        <div className="p-4">
          {isLoading ? (
            <div className="text-center text-gray-500 py-8">Loading history...</div>
          ) : Object.keys(groupedMessages).length === 0 ? (
            <div className="text-center text-gray-500 py-8">No chat history yet</div>
          ) : (
            Object.entries(groupedMessages).map(([date, dayMessages]) => (
              <div key={date} className="mb-6">
                <div className="text-sm font-medium text-gray-600 mb-3 sticky top-0 bg-rellio-white py-1">
                  {date}
                </div>
                <div className="space-y-3">
                  {dayMessages.map((message, index) => (
                    <div
                      key={message.id}
                      className={`p-3 rounded-lg cursor-pointer transition-colors hover:bg-gray-50 ${
                        message.type === 'user' 
                          ? 'bg-gray-100 border-l-2 border-rellio-accent-teal' 
                          : 'bg-rellio-white border border-gray-200'
                      }`}
                      onClick={() => onSelectMessage?.(message)}
                    >
                      <div className="flex items-start gap-2">
                        <MessageCircle className={`h-4 w-4 mt-0.5 ${
                          message.type === 'user' ? 'text-rellio-accent-teal' : 'text-gray-500'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-rellio-dark-gray line-clamp-3">
                            {message.content}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {new Date(message.timestamp).toLocaleTimeString()}
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