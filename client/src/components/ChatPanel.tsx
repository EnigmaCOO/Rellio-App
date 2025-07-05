import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Send, MoreVertical, Bot, User } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { Religion, ChatMessage } from "@shared/schema";

interface ChatPanelProps {
  sessionId: string;
  context: {
    religion: Religion | null;
    book: string;
    chapter: number;
  };
}

export function ChatPanel({ sessionId, context }: ChatPanelProps) {
  const [newMessage, setNewMessage] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: messages, isLoading } = useQuery<ChatMessage[]>({
    queryKey: ['/api/chat', sessionId],
    staleTime: 30 * 1000, // 30 seconds
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: { message: string; sessionId: string; context: any }) => {
      const response = await apiRequest("POST", "/api/chat", messageData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/chat', sessionId] });
      setNewMessage("");
    },
    onError: (error) => {
      toast({
        title: "Error sending message",
        description: error instanceof Error ? error.message : "Failed to send message",
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    
    sendMessageMutation.mutate({
      message: newMessage,
      sessionId,
      context,
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="w-1/4 bg-white shadow-md border-l border-scripture-200 flex flex-col">
      <div className="p-6 border-b border-scripture-200">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-scripture-800">AI Scripture Guide</h2>
          <Button variant="ghost" size="sm">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-sm text-scripture-600">
          Ask questions about {context.book} Chapter {context.chapter}
        </p>
      </div>

      {/* Chat Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex space-x-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : messages && messages.length > 0 ? (
            messages.map((message: ChatMessage) => (
              <div
                key={message.id}
                className={`flex items-start space-x-3 ${
                  message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                }`}
              >
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  message.type === 'user' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-scripture-200 text-scripture-700'
                }`}>
                  {message.type === 'user' ? (
                    <User className="h-4 w-4" />
                  ) : (
                    <Bot className="h-4 w-4" />
                  )}
                </div>
                <div className={`flex-1 max-w-[75%] ${
                  message.type === 'user' ? 'text-right' : 'text-left'
                }`}>
                  <div className={`inline-block p-3 rounded-lg ${
                    message.type === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-scripture-100 text-scripture-800'
                  }`}>
                    <p className="text-sm leading-relaxed">{message.content}</p>
                  </div>
                  <div className="text-xs text-scripture-500 mt-1">
                    {formatTime(message.timestamp?.toString() || new Date().toISOString())}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-scripture-600">
              <Bot className="h-12 w-12 mx-auto mb-4 text-scripture-400" />
              <p className="text-sm">
                Hello! I'm here to help you explore and understand the scriptures. 
                Ask me anything about {context.book} Chapter {context.chapter}.
              </p>
            </div>
          )}
          
          {/* Loading indicator */}
          {sendMessageMutation.isPending && (
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 rounded-full bg-scripture-200 flex items-center justify-center">
                <Bot className="h-4 w-4 text-scripture-700" />
              </div>
              <div className="bg-scripture-100 rounded-lg px-4 py-2">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-scripture-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-scripture-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}} />
                  <div className="w-2 h-2 bg-scripture-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}} />
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Chat Input */}
      <div className="p-4 border-t border-scripture-200">
        <div className="flex space-x-2">
          <Input
            type="text"
            placeholder="Ask about this passage..."
            className="flex-1"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={sendMessageMutation.isPending}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || sendMessageMutation.isPending}
            size="sm"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-scripture-500 mt-2">
          AI responses are contextual to your selected scripture passage.
        </p>
      </div>
    </div>
  );
}
