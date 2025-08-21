
import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  MessageCircle, 
  Sparkles, 
  RefreshCw, 
  Volume2, 
  VolumeX,
  Clock,
  User,
  Bot,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { VoiceFirstInterface } from './VoiceFirstInterface';
import { AudioPlaybackButton } from './AudioPlaybackButton';
import { GrokStyleOrb } from './GrokStyleOrb';

interface Message {
  id: number;
  sessionId: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  context?: {
    religion?: string | null;
    book?: string | null;
    chapter?: number | null;
  };
}

interface ChatSession {
  sessionId: string;
  messages: Message[];
  createdAt: Date;
  lastActivity: Date;
}

interface InsightChatProps {
  context?: {
    religion?: string | null;
    book?: string | null;
    chapter?: number | null;
  };
  className?: string;
}

export function InsightChat({ context, className }: InsightChatProps) {
  const [sessionId] = useState(() => `session_${Date.now()}`);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [isVoicePlaying, setIsVoicePlaying] = useState(false);
  const [voiceInterrupted, setVoiceInterrupted] = useState(false);
  const [orbState, setOrbState] = useState<'idle' | 'listening' | 'processing' | 'responding' | 'interrupted'>('idle');

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Fetch chat history
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['chat', sessionId],
    queryFn: async () => {
      const response = await fetch(`/api/chat/${sessionId}`);
      if (!response.ok) throw new Error('Failed to fetch chat history');
      return response.json();
    },
    refetchInterval: 5000
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      console.log('📤 Sending message:', message);
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          message: message.trim(),
          context: context || { religion: null, book: null, chapter: 1 }
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to send message');
      }
      
      return response.json();
    },
    onMutate: () => {
      setIsTyping(true);
      setOrbState('processing');
    },
    onSuccess: () => {
      setCurrentMessage('');
      setIsTyping(false);
      queryClient.invalidateQueries({ queryKey: ['chat', sessionId] });
      scrollToBottom();
    },
    onError: (error) => {
      console.error('Failed to send message:', error);
      setIsTyping(false);
      setOrbState('idle');
    }
  });

  // Handle voice interruption
  const handleVoiceInterruption = () => {
    console.log('🛑 Voice interruption triggered');
    setVoiceInterrupted(true);
    setIsVoicePlaying(false);
    setOrbState('interrupted');
    
    // Reset after a moment
    setTimeout(() => {
      setVoiceInterrupted(false);
      setOrbState('idle');
    }, 1000);
  };

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    setTimeout(() => {
      if (scrollAreaRef.current) {
        const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
        if (scrollContainer) {
          scrollContainer.scrollTop = scrollContainer.scrollHeight;
        }
      }
    }, 100);
  };

  // Scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Format timestamp
  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Parse perspective tags
  const parseMessageContent = (content: string) => {
    const parts = content.split(/<perspective>(.*?)<\/perspective>/g);
    const parsed = [];
    
    for (let i = 0; i < parts.length; i += 2) {
      if (parts[i]) {
        parsed.push({ type: 'text', content: parts[i].trim() });
      }
      if (parts[i + 1] && parts[i + 2]) {
        parsed.push({
          type: 'perspective',
          religion: parts[i + 1],
          content: parts[i + 2].trim()
        });
      }
    }
    
    return parsed.length > 0 ? parsed : [{ type: 'text', content }];
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-2">
          <RefreshCw className="h-6 w-6 animate-spin mx-auto text-gray-400" />
          <p className="text-sm text-gray-500">Loading chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col h-full bg-white", className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-indigo-50 to-purple-50">
        <div className="flex items-center gap-2">
          <GrokStyleOrb state={orbState} size="sm" />
          <div>
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-indigo-600" />
              Universal Wisdom Explorer
            </h2>
            <p className="text-xs text-gray-600">Multi-faith spiritual guidance</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {context?.religion && (
            <Badge variant="secondary" className="text-xs">
              {context.religion}
            </Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-8 w-8 p-0"
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {isExpanded && (
        <>
          {/* Messages */}
          <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
            <div className="space-y-4">
              {messages.length === 0 ? (
                <div className="text-center py-8">
                  <Sparkles className="h-8 w-8 mx-auto text-indigo-400 mb-2" />
                  <p className="text-gray-600 mb-1">Welcome to the Universal Wisdom Explorer</p>
                  <p className="text-sm text-gray-500">Ask any spiritual question to explore wisdom across traditions</p>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "flex gap-3",
                      message.type === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    {message.type === 'ai' && (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                        <Bot className="h-4 w-4 text-white" />
                      </div>
                    )}
                    
                    <div className={cn(
                      "max-w-[80%] rounded-lg p-3 space-y-2",
                      message.type === 'user'
                        ? "bg-indigo-600 text-white"
                        : "bg-gray-100 text-gray-900"
                    )}>
                      {message.type === 'ai' ? (
                        <div className="space-y-3">
                          {parseMessageContent(message.content).map((part, index) => (
                            <div key={index}>
                              {part.type === 'perspective' ? (
                                <div className="border-l-4 border-indigo-200 pl-3 space-y-1">
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-xs">
                                      {part.religion}
                                    </Badge>
                                  </div>
                                  <p className="text-sm leading-relaxed">{part.content}</p>
                                </div>
                              ) : (
                                <p className="text-sm leading-relaxed">{part.content}</p>
                              )}
                            </div>
                          ))}
                          
                          <div className="flex items-center gap-2 pt-2">
                            <AudioPlaybackButton
                              text={message.content}
                              onPlayingChange={setIsVoicePlaying}
                              interrupted={voiceInterrupted}
                              onInterrupted={() => setVoiceInterrupted(false)}
                              size="sm"
                            />
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatTime(message.timestamp)}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-sm">{message.content}</p>
                          <div className="flex items-center justify-end">
                            <span className="text-xs text-indigo-200 flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {formatTime(message.timestamp)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {message.type === 'user' && (
                      <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0">
                        <User className="h-4 w-4 text-white" />
                      </div>
                    )}
                  </div>
                ))
              )}
              
              {/* Typing indicator */}
              {(sendMessageMutation.isPending || isTyping) && (
                <div className="flex gap-3 justify-start">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                  <div className="bg-gray-100 rounded-lg p-3">
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <Separator />

          {/* Voice Input Interface */}
          <div className="border-t border-gray-100 p-4 bg-gradient-to-t from-gray-50 to-white">
            <VoiceFirstInterface
              onSubmit={(message) => {
                setCurrentMessage(message);
                sendMessageMutation.mutate(message);
              }}
              isStreaming={sendMessageMutation.isPending || isTyping}
              isInterrupted={orbState === 'interrupted'}
              onInterrupt={handleVoiceInterruption}
              placeholder="Speak or type your spiritual question..."
              disabled={sendMessageMutation.isPending}
              isAIResponding={isVoicePlaying || orbState === 'responding'}
            />
          </div>
        </>
      )}
    </div>
  );
}
