import { useState, useCallback, useRef, useEffect } from 'react';
import type { ChatMessage } from '@shared/schema';

// Enhanced conversation history with relevance scoring
interface RelevantMessage extends ChatMessage {
  relevanceScore: number;
  timeWeight: number;
  topicWeight: number;
}

interface ConversationHistoryHook {
  getRelevantHistory: (currentQuery: string, limit?: number) => RelevantMessage[];
  addMessage: (message: ChatMessage) => void;
  clearHistory: () => void;
  getFullHistory: () => ChatMessage[];
  getHistoryStats: () => {
    totalMessages: number;
    recentMessages: number;
    oldestMessageAge: number;
  };
}

// Simple text similarity calculation (cosine similarity approximation)
function calculateTextSimilarity(text1: string, text2: string): number {
  const words1 = text1.toLowerCase().split(/\W+/).filter(word => word.length > 2);
  const words2 = text2.toLowerCase().split(/\W+/).filter(word => word.length > 2);
  
  const allWords = [...new Set([...words1, ...words2])];
  
  if (allWords.length === 0) return 0;
  
  const vector1 = allWords.map(word => words1.filter(w => w === word).length);
  const vector2 = allWords.map(word => words2.filter(w => w === word).length);
  
  const dotProduct = vector1.reduce((sum, val, i) => sum + val * vector2[i], 0);
  const magnitude1 = Math.sqrt(vector1.reduce((sum, val) => sum + val * val, 0));
  const magnitude2 = Math.sqrt(vector2.reduce((sum, val) => sum + val * val, 0));
  
  if (magnitude1 === 0 || magnitude2 === 0) return 0;
  
  return dotProduct / (magnitude1 * magnitude2);
}

// Calculate time-based weight (more recent = higher weight)
function calculateTimeWeight(messageTime: Date, currentTime: Date): number {
  const ageInMinutes = (currentTime.getTime() - messageTime.getTime()) / (1000 * 60);
  
  // Messages from last 5 minutes get full weight
  if (ageInMinutes <= 5) return 1.0;
  
  // Gradual decay over 30 minutes
  if (ageInMinutes <= 30) return 0.8 - (ageInMinutes - 5) * 0.02;
  
  // Older messages get minimum weight
  return Math.max(0.2, 0.5 - ageInMinutes * 0.01);
}

// Extract spiritual/religious keywords for topic relevance
function extractTopicalKeywords(text: string): string[] {
  const spiritualKeywords = [
    'god', 'divine', 'faith', 'prayer', 'love', 'peace', 'wisdom', 'truth',
    'soul', 'spirit', 'salvation', 'forgiveness', 'mercy', 'justice', 'holy',
    'sacred', 'worship', 'meditation', 'enlightenment', 'suffering', 'compassion',
    'bible', 'quran', 'torah', 'scripture', 'verse', 'chapter', 'book',
    'christian', 'islam', 'jewish', 'hindu', 'buddhist', 'religion', 'spiritual'
  ];
  
  const words = text.toLowerCase().split(/\W+/);
  return words.filter(word => spiritualKeywords.includes(word));
}

export const useConversationHistory = (maxMessages: number = 50): ConversationHistoryHook => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const lastCleanupRef = useRef<number>(0);

  // Clean up old messages periodically
  const cleanupOldMessages = useCallback(() => {
    const now = Date.now();
    if (now - lastCleanupRef.current < 5 * 60 * 1000) return; // Cleanup every 5 minutes
    
    setMessages(prevMessages => {
      const cutoff = new Date(Date.now() - 2 * 60 * 60 * 1000); // Keep 2 hours
      const recentMessages = prevMessages.filter(msg => {
        const msgTime = new Date(msg.createdAt || msg.timestamp || Date.now());
        return msgTime > cutoff;
      });
      
      // Keep at least last 10 messages regardless of age
      const minKeep = Math.max(10, recentMessages.length);
      return prevMessages.slice(-minKeep);
    });
    
    lastCleanupRef.current = now;
  }, []);

  // Add new message to history
  const addMessage = useCallback((message: ChatMessage) => {
    setMessages(prev => {
      const updated = [...prev, message];
      
      // Keep within max limit
      if (updated.length > maxMessages) {
        return updated.slice(-maxMessages);
      }
      
      return updated;
    });
    
    cleanupOldMessages();
  }, [maxMessages, cleanupOldMessages]);

  // Get relevant history based on current query with sophisticated scoring
  const getRelevantHistory = useCallback((currentQuery: string, limit: number = 10): RelevantMessage[] => {
    const currentTime = new Date();
    const currentKeywords = extractTopicalKeywords(currentQuery);
    
    // Score each message for relevance
    const scoredMessages: RelevantMessage[] = messages.map(message => {
      const messageTime = new Date(message.createdAt || message.timestamp || Date.now());
      const messageKeywords = extractTopicalKeywords(message.content);
      
      // Time weight (50% contribution)
      const timeWeight = calculateTimeWeight(messageTime, currentTime);
      
      // Topic similarity weight (30% contribution)
      const textSimilarity = calculateTextSimilarity(currentQuery, message.content);
      const keywordOverlap = currentKeywords.length > 0 
        ? messageKeywords.filter(k => currentKeywords.includes(k)).length / Math.max(currentKeywords.length, messageKeywords.length)
        : 0;
      const topicWeight = Math.max(textSimilarity, keywordOverlap);
      
      // Context continuity (20% contribution) - messages from same conversation thread
      const contextWeight = 0.2; // Base context weight
      
      // Combined relevance score
      const relevanceScore = (timeWeight * 0.5) + (topicWeight * 0.3) + (contextWeight * 0.2);
      
      return {
        ...message,
        relevanceScore,
        timeWeight,
        topicWeight
      };
    });
    
    // Sort by relevance score and take top results
    return scoredMessages
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, limit);
  }, [messages]);

  // Clear all history
  const clearHistory = useCallback(() => {
    setMessages([]);
  }, []);

  // Get full history
  const getFullHistory = useCallback(() => {
    return [...messages];
  }, [messages]);

  // Get history statistics
  const getHistoryStats = useCallback(() => {
    const currentTime = new Date();
    const fiveMinutesAgo = new Date(currentTime.getTime() - 5 * 60 * 1000);
    
    const recentMessages = messages.filter(msg => {
      const msgTime = new Date(msg.createdAt || msg.timestamp || Date.now());
      return msgTime > fiveMinutesAgo;
    }).length;
    
    const oldestMessage = messages[0];
    const oldestMessageAge = oldestMessage 
      ? (currentTime.getTime() - new Date(oldestMessage.createdAt || oldestMessage.timestamp || Date.now()).getTime()) / (1000 * 60)
      : 0;
    
    return {
      totalMessages: messages.length,
      recentMessages,
      oldestMessageAge
    };
  }, [messages]);

  // Periodic cleanup
  useEffect(() => {
    const interval = setInterval(cleanupOldMessages, 5 * 60 * 1000); // Every 5 minutes
    return () => clearInterval(interval);
  }, [cleanupOldMessages]);

  return {
    getRelevantHistory,
    addMessage,
    clearHistory,
    getFullHistory,
    getHistoryStats
  };
};