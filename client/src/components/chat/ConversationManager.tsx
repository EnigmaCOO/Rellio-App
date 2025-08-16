import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ChatMessage } from '@shared/schema';

export interface ConversationTurn {
  id: string;
  userMessage: string;
  aiResponse: string;
  timestamp: number;
  context: {
    religion?: string | null;
    book?: string;
    chapter?: number;
  };
  interrupted?: boolean;
  sentiment?: 'curious' | 'contemplative' | 'seeking' | 'comparative' | 'analytical';
  topics?: string[];
}

export interface ConversationState {
  turns: ConversationTurn[];
  currentContext: ConversationTurn | null;
  isInterrupted: boolean;
  lastInterruptionPoint: string | null;
  proactivePrompts: string[];
  conversationFlow: 'exploration' | 'comparison' | 'deepening' | 'personal_application';
}

interface ConversationManagerProps {
  sessionId: string;
  onProactivePrompt: (prompt: string) => void;
  onContextUpdate: (context: ConversationState) => void;
  maxTurns?: number; // Sliding window size (default 8)
}

export interface ConversationManagerReturn {
  conversationState: ConversationState;
  addTurn: (userMessage: string, aiResponse: string, context: any) => void;
  handleInterruption: (interruptedResponse: string, newQuery: string) => void;
  getContextualPrompt: () => string | null;
  generateFollowUp: (lastResponse: string) => string[];
  analyzeTopicsAndSentiment: (text: string) => { topics: string[]; sentiment: string };
  clearConversation: () => void;
  getRecentContext: () => string;
}

// Proactive follow-up templates based on conversation flow
const FOLLOW_UP_TEMPLATES = {
  exploration: [
    "What else can I illuminate for you about this topic?",
    "Would you like to explore the historical context behind this?",
    "Shall we delve deeper into the spiritual meaning here?",
    "What questions arise for you from this teaching?"
  ],
  comparison: [
    "Shall we compare this with another religious perspective?",
    "How does this teaching relate to other faith traditions?",
    "Would you like to explore similarities across different scriptures?",
    "What parallels do you see with other spiritual teachings?"
  ],
  deepening: [
    "How might you apply this wisdom in your daily life?",
    "What personal insights does this bring up for you?",
    "Would you like to explore the practical implications?",
    "How does this teaching resonate with your experience?"
  ],
  personal_application: [
    "What other life situations could benefit from this wisdom?",
    "Would you like guidance on implementing this teaching?",
    "How might this perspective transform your approach?",
    "What steps could help you embody this wisdom?"
  ]
};

// Keywords for topic extraction
const SPIRITUAL_TOPICS = {
  'love': ['love', 'compassion', 'mercy', 'kindness', 'heart'],
  'faith': ['faith', 'belief', 'trust', 'devotion', 'surrender'],
  'wisdom': ['wisdom', 'knowledge', 'understanding', 'insight', 'truth'],
  'peace': ['peace', 'tranquility', 'calm', 'serenity', 'stillness'],
  'suffering': ['suffering', 'pain', 'trials', 'hardship', 'struggle'],
  'purpose': ['purpose', 'meaning', 'calling', 'destiny', 'mission'],
  'prayer': ['prayer', 'meditation', 'worship', 'contemplation', 'reflection'],
  'forgiveness': ['forgiveness', 'mercy', 'pardon', 'reconciliation', 'grace'],
  'community': ['community', 'brotherhood', 'unity', 'fellowship', 'togetherness'],
  'service': ['service', 'charity', 'helping', 'giving', 'sacrifice']
};

export function useConversationManager({
  sessionId,
  onProactivePrompt,
  onContextUpdate,
  maxTurns = 8
}: ConversationManagerProps): ConversationManagerReturn {
  
  const [conversationState, setConversationState] = useState<ConversationState>({
    turns: [],
    currentContext: null,
    isInterrupted: false,
    lastInterruptionPoint: null,
    proactivePrompts: [],
    conversationFlow: 'exploration'
  });

  const queryClient = useQueryClient();
  const proactiveTimeoutRef = useRef<NodeJS.Timeout>();

  // Load conversation history from localStorage
  useEffect(() => {
    const savedState = localStorage.getItem(`conversation-${sessionId}`);
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        setConversationState(prev => ({
          ...prev,
          turns: parsed.turns || [],
          conversationFlow: parsed.conversationFlow || 'exploration'
        }));
      } catch (error) {
        console.warn('Failed to load conversation state:', error);
      }
    }
  }, [sessionId]);

  // Save conversation state to localStorage
  const saveConversationState = useCallback((state: ConversationState) => {
    try {
      localStorage.setItem(`conversation-${sessionId}`, JSON.stringify({
        turns: state.turns,
        conversationFlow: state.conversationFlow,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.warn('Failed to save conversation state:', error);
    }
  }, [sessionId]);

  // Analyze topics and sentiment from text
  const analyzeTopicsAndSentiment = useCallback((text: string) => {
    const lowercaseText = text.toLowerCase();
    const detectedTopics: string[] = [];
    
    // Extract topics based on keywords
    Object.entries(SPIRITUAL_TOPICS).forEach(([topic, keywords]) => {
      if (keywords.some(keyword => lowercaseText.includes(keyword))) {
        detectedTopics.push(topic);
      }
    });

    // Simple sentiment analysis based on question patterns and keywords
    let sentiment: string = 'curious';
    
    if (lowercaseText.includes('compare') || lowercaseText.includes('different') || lowercaseText.includes('versus')) {
      sentiment = 'comparative';
    } else if (lowercaseText.includes('why') || lowercaseText.includes('meaning') || lowercaseText.includes('understand')) {
      sentiment = 'analytical';
    } else if (lowercaseText.includes('help') || lowercaseText.includes('guide') || lowercaseText.includes('apply')) {
      sentiment = 'seeking';
    } else if (lowercaseText.includes('feel') || lowercaseText.includes('think') || lowercaseText.includes('reflect')) {
      sentiment = 'contemplative';
    }

    return { topics: detectedTopics, sentiment };
  }, []);

  // Determine conversation flow based on recent turns
  const updateConversationFlow = useCallback((turns: ConversationTurn[]) => {
    if (turns.length === 0) return 'exploration';
    
    const recentTurns = turns.slice(-3);
    const topicCounts = new Map<string, number>();
    
    recentTurns.forEach(turn => {
      turn.topics?.forEach(topic => {
        topicCounts.set(topic, (topicCounts.get(topic) || 0) + 1);
      });
    });

    // Check for comparative questions
    const hasComparative = recentTurns.some(turn => 
      turn.sentiment === 'comparative' || 
      turn.userMessage.toLowerCase().includes('compare')
    );
    
    if (hasComparative) return 'comparison';

    // Check for personal application
    const hasPersonal = recentTurns.some(turn => 
      turn.sentiment === 'seeking' || 
      turn.userMessage.toLowerCase().includes('how') ||
      turn.userMessage.toLowerCase().includes('apply')
    );
    
    if (hasPersonal) return 'personal_application';

    // Check for deepening (repeated topics)
    const repeatedTopics = Array.from(topicCounts.entries()).filter(([_, count]) => count > 1);
    if (repeatedTopics.length > 0) return 'deepening';

    return 'exploration';
  }, []);

  // Add a new conversation turn
  const addTurn = useCallback((userMessage: string, aiResponse: string, context: any) => {
    const analysis = analyzeTopicsAndSentiment(userMessage);
    
    const newTurn: ConversationTurn = {
      id: `turn-${Date.now()}`,
      userMessage,
      aiResponse,
      timestamp: Date.now(),
      context,
      sentiment: analysis.sentiment as any,
      topics: analysis.topics
    };

    setConversationState(prev => {
      // Keep only the last maxTurns (sliding window)
      const updatedTurns = [...prev.turns, newTurn].slice(-maxTurns);
      const newFlow = updateConversationFlow(updatedTurns);
      
      const newState: ConversationState = {
        ...prev,
        turns: updatedTurns,
        currentContext: newTurn,
        conversationFlow: newFlow as 'exploration' | 'comparison' | 'deepening' | 'personal_application',
        isInterrupted: false
      };

      saveConversationState(newState);
      onContextUpdate(newState);
      
      // Schedule proactive follow-up after 3 seconds
      if (proactiveTimeoutRef.current) {
        clearTimeout(proactiveTimeoutRef.current);
      }
      
      proactiveTimeoutRef.current = setTimeout(() => {
        const followUps = generateFollowUp(aiResponse);
        if (followUps.length > 0) {
          const randomFollowUp = followUps[Math.floor(Math.random() * followUps.length)];
          onProactivePrompt(randomFollowUp);
        }
      }, 3000);

      return newState;
    });
  }, [maxTurns, analyzeTopicsAndSentiment, updateConversationFlow, saveConversationState, onContextUpdate, onProactivePrompt]);

  // Handle interruption with context continuity
  const handleInterruption = useCallback((interruptedResponse: string, newQuery: string) => {
    setConversationState(prev => {
      const updatedState = {
        ...prev,
        isInterrupted: true,
        lastInterruptionPoint: interruptedResponse
      };

      // Add the interrupted turn to history with special marking
      if (prev.currentContext) {
        const interruptedTurn: ConversationTurn = {
          ...prev.currentContext,
          aiResponse: `[Interrupted] ${interruptedResponse}`,
          interrupted: true
        };
        
        updatedState.turns = [...prev.turns.slice(0, -1), interruptedTurn];
      }

      onContextUpdate(updatedState);
      return updatedState;
    });
  }, [onContextUpdate]);

  // Generate contextual follow-up questions
  const generateFollowUp = useCallback((lastResponse: string) => {
    const flow = conversationState.conversationFlow;
    const templates = FOLLOW_UP_TEMPLATES[flow] || FOLLOW_UP_TEMPLATES.exploration;
    
    // Customize based on response content
    const responseAnalysis = analyzeTopicsAndSentiment(lastResponse);
    let contextualPrompts = [...templates];
    
    // Add topic-specific follow-ups
    if (responseAnalysis.topics.includes('love')) {
      contextualPrompts.push("How do different traditions express divine love?");
    }
    if (responseAnalysis.topics.includes('wisdom')) {
      contextualPrompts.push("What practical wisdom can we draw from this?");
    }
    if (responseAnalysis.topics.includes('suffering')) {
      contextualPrompts.push("How do spiritual teachings help us understand suffering?");
    }

    return contextualPrompts.slice(0, 3); // Return top 3 relevant prompts
  }, [conversationState.conversationFlow, analyzeTopicsAndSentiment]);

  // Get contextual prompt based on conversation history
  const getContextualPrompt = useCallback(() => {
    if (conversationState.turns.length === 0) return null;
    
    const recentTurns = conversationState.turns.slice(-2);
    const topics = new Set<string>();
    
    recentTurns.forEach(turn => {
      turn.topics?.forEach(topic => topics.add(topic));
    });

    if (topics.size > 0) {
      const topicList = Array.from(topics).slice(0, 2).join(' and ');
      return `As we've been exploring ${topicList}...`;
    }

    return null;
  }, [conversationState.turns]);

  // Get recent context for AI prompting
  const getRecentContext = useCallback(() => {
    const recentTurns = conversationState.turns.slice(-3);
    if (recentTurns.length === 0) return '';

    const contextParts = recentTurns.map(turn => 
      `User asked: "${turn.userMessage}" (about ${turn.topics?.join(', ') || 'spiritual matters'})`
    );

    let contextString = contextParts.join('\n');
    
    if (conversationState.isInterrupted && conversationState.lastInterruptionPoint) {
      contextString += `\nNote: Previous response was interrupted at: "${conversationState.lastInterruptionPoint}"`;
    }

    return contextString;
  }, [conversationState]);

  // Clear conversation
  const clearConversation = useCallback(() => {
    setConversationState({
      turns: [],
      currentContext: null,
      isInterrupted: false,
      lastInterruptionPoint: null,
      proactivePrompts: [],
      conversationFlow: 'exploration'
    });
    
    localStorage.removeItem(`conversation-${sessionId}`);
    
    if (proactiveTimeoutRef.current) {
      clearTimeout(proactiveTimeoutRef.current);
    }
  }, [sessionId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (proactiveTimeoutRef.current) {
        clearTimeout(proactiveTimeoutRef.current);
      }
    };
  }, []);

  return {
    conversationState,
    addTurn,
    handleInterruption,
    getContextualPrompt,
    generateFollowUp,
    analyzeTopicsAndSentiment,
    clearConversation,
    getRecentContext
  };
}