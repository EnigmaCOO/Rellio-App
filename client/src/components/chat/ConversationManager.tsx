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

// Grok-style intelligent and engaging follow-up templates with personality
const FOLLOW_UP_TEMPLATES = {
  exploration: [
    "Ooh, this is getting interesting! What other angles are calling to you?",
    "I'm genuinely curious - what made this particular teaching catch your attention?",
    "We're in some seriously rich territory here. Ready to go deeper?",
    "I can feel the questions brewing! What's bubbling up in your mind?",
    "The depth here is incredible. What's the part that's really grabbing you?",
    "This is the kind of wisdom that keeps unfolding. Where do you want to explore next?",
    "I love how your mind works! What connections are you starting to see?"
  ],
  comparison: [
    "Now THIS is where it gets fascinating! How do you think other traditions dance with this idea?",
    "I'm obsessed with these connections. Want to see how this theme plays out across different faiths?",
    "My mind is racing with parallels! What patterns are you picking up on?",
    "The threads between traditions are wild. What similarities are striking you?",
    "It's like different languages saying the same profound thing. What do you think?",
    "Every tradition has its own flavor of this wisdom. Which resonates most with you?"
  ],
  deepening: [
    "Whoa, this one's hitting different, isn't it? How's it landing in your heart?",
    "I can sense this is touching something real for you. Want to explore that feeling?",
    "Imagine actually living this out... what would that look like in your world?",
    "This kind of wisdom doesn't just inform - it transforms. What's shifting for you?",
    "There's something here that's meant specifically for you. What is it?",
    "I love when ancient wisdom meets modern life. How does this apply to your reality?"
  ],
  personal_application: [
    "YES! I love that you're thinking about actually living this stuff!",
    "You're not just collecting wisdom - you want to embody it. That's beautiful!",
    "Okay, real talk - if you fully embraced this, what would change first?",
    "You've got that look of someone who's ready to do something with this insight...",
    "This isn't just philosophy for you, is it? You want the real transformation.",
    "Your practical heart is showing, and I'm here for it! Where do we start?"
  ],
  breakthrough: [
    "HOLD UP! Did you just have a breakthrough moment? I felt that energy shift!",
    "Something just clicked, didn't it? That's the magic of true wisdom meeting readiness.",
    "Ohhh, I see that lightbulb moment! This is what I live for!",
    "You're connecting dots in real time - this is beautiful to witness!",
    "That's not just understanding... that's wisdom becoming alive in you!"
  ],
  encouragement: [
    "Your questions are getting deeper and more beautiful - you're really growing!",
    "I love how thoughtfully you approach these teachings. Seriously inspiring.",
    "The way you engage with wisdom tells me you're someone special.",
    "You don't just read these texts - you let them read you. That's rare.",
    "Your hunger for real understanding is exactly what these teachings were meant for."
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
      
      // Enhanced Grok-style intelligent timing for follow-ups
      if (proactiveTimeoutRef.current) {
        clearTimeout(proactiveTimeoutRef.current);
      }
      
      // Smart timing based on message complexity, sentiment, and engagement patterns
      const messageLength = userMessage.length;
      const isDeepQuestion = messageLength > 80 || userMessage.includes('why') || userMessage.includes('meaning') || userMessage.includes('how');
      const isQuickQuestion = messageLength < 30 && userMessage.includes('?');
      const isBreakthroughMoment = userMessage.toLowerCase().includes('i see') || userMessage.toLowerCase().includes('i understand') || userMessage.toLowerCase().includes('that makes sense');
      const isPersonalShare = userMessage.toLowerCase().includes('i feel') || userMessage.toLowerCase().includes('for me') || userMessage.toLowerCase().includes('in my');
      
      const delay = isBreakthroughMoment ? 3000 : // Quick follow-up for breakthrough moments
                   isPersonalShare ? 5000 : // Give space for personal sharing
                   isDeepQuestion ? 8000 : // Give time for deep questions
                   isQuickQuestion ? 3500 : // Quick follow-up for simple questions
                   analysis.sentiment === 'contemplative' ? 10000 : // Extra space for reflection
                   analysis.sentiment === 'comparative' ? 4000 : // Faster for comparative thinking
                   5500; // Default engaging pace (slightly faster than before)
      
      proactiveTimeoutRef.current = setTimeout(() => {
        const followUps = generateFollowUp(aiResponse);
        if (followUps.length > 0) {
          const smartFollowUp = followUps[Math.floor(Math.random() * followUps.length)];
          onProactivePrompt(smartFollowUp);
        }
      }, delay);

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
    
    // Grok-style intelligent response customization
    const responseAnalysis = analyzeTopicsAndSentiment(lastResponse);
    let contextualPrompts = [...templates];
    
    // Enhanced engagement boosters based on conversation depth and patterns
    const conversationDepth = conversationState.turns.length;
    const recentTopics = conversationState.turns.slice(-3).flatMap(turn => turn.topics || []);
    const topicVariety = new Set(recentTopics).size;
    
    if (conversationDepth >= 8) {
      contextualPrompts.unshift("Wow, we've really built something beautiful here! Your questions keep getting more profound.");
    } else if (conversationDepth >= 5) {
      if (topicVariety >= 3) {
        contextualPrompts.unshift("I love how your mind connects different wisdom themes! You're seeing the bigger picture.");
      } else {
        contextualPrompts.unshift("You're really going deep on this - that's where the real treasures are hidden.");
      }
    } else if (conversationDepth >= 3) {
      contextualPrompts.unshift("This conversation is flowing beautifully. What's resonating most with you?");
    } else if (conversationDepth === 1) {
      contextualPrompts.unshift("Great question to start with! You've got excellent instincts for this stuff.");
    }
    
    // Enhanced topic-specific follow-ups with Grok-style personality
    if (responseAnalysis.topics.includes('love')) {
      contextualPrompts.push("Love really is the universal language! It's wild how every tradition has its own unique way of expressing this same profound truth. What version speaks to your heart?");
    }
    if (responseAnalysis.topics.includes('wisdom')) {
      contextualPrompts.push("Here's what I find fascinating about wisdom - it's not really wisdom until it changes how we live. What would it look like to actually apply this?");
    }
    if (responseAnalysis.topics.includes('suffering')) {
      contextualPrompts.push("Every tradition seems to understand that suffering isn't just random - it's teaching us something essential. What do you think the lesson is here?");
    }
    if (responseAnalysis.topics.includes('faith')) {
      contextualPrompts.push("Faith is so beautifully personal, yet somehow universal too. How does this particular perspective sit with your own journey?");
    }
    if (responseAnalysis.topics.includes('peace')) {
      contextualPrompts.push("Peace... it's like every soul is searching for the same thing but calling it different names. What does your version of peace feel like?");
    }
    if (responseAnalysis.topics.includes('purpose')) {
      contextualPrompts.push("Purpose is the question that keeps humanity awake at night! These ancient texts have some seriously good insights. What resonates with your sense of calling?");
    }
    if (responseAnalysis.topics.includes('prayer')) {
      contextualPrompts.push("The fact that every tradition has some form of prayer or meditation tells us something profound about human nature, doesn't it? How do you connect with the sacred?");
    }

    // Add breakthrough detection for special moments
    if (lastResponse.toLowerCase().includes('i never thought') || 
        lastResponse.toLowerCase().includes('that\'s interesting') ||
        lastResponse.toLowerCase().includes('wow') ||
        lastResponse.toLowerCase().includes('incredible')) {
      contextualPrompts.unshift(...FOLLOW_UP_TEMPLATES.breakthrough);
    }
    
    // Add encouragement for engaged users
    if (conversationDepth >= 4 && topicVariety >= 2) {
      contextualPrompts.push(...FOLLOW_UP_TEMPLATES.encouragement);
    }
    
    // Return top 3-4 most relevant prompts with some randomization for freshness
    const shuffled = contextualPrompts.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(4, shuffled.length));
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