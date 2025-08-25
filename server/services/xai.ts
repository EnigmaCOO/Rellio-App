import OpenAI from "openai";

// Initialize XAI client using OpenAI SDK with XAI base URL
const xai = new OpenAI({ 
  baseURL: "https://api.x.ai/v1", 
  apiKey: process.env.XAI_API_KEY 
});

// Quota management cache
let xaiQuotaStatus: { hasCredits: boolean; lastChecked: number; } = { 
  hasCredits: true, 
  lastChecked: 0 
};

// Enhanced retry mechanism with exponential backoff
async function withRetryAndFallback<T>(
  operation: () => Promise<T>,
  fallbackOperation: () => Promise<T>,
  operationName: string,
  maxRetries: number = 3
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 ${operationName}: Attempt ${attempt}/${maxRetries}`);
      return await operation();
    } catch (error: any) {
      console.error(`❌ ${operationName} attempt ${attempt} failed:`, error.message);
      
      // Check for quota/credit issues
      if (error.message?.includes('quota') || error.message?.includes('credit') || 
          error.message?.includes('403') || error.message?.includes('No credits')) {
        console.warn(`💳 XAI quota/credit issue detected, marking as depleted`);
        xaiQuotaStatus = { hasCredits: false, lastChecked: Date.now() };
        
        // Immediate fallback to OpenAI for quota issues
        console.log(`🔄 Falling back to OpenAI due to XAI quota depletion`);
        return await fallbackOperation();
      }
      
      // If this is the last attempt, try fallback
      if (attempt === maxRetries) {
        console.warn(`🚨 ${operationName} failed after ${maxRetries} attempts, falling back to OpenAI`);
        return await fallbackOperation();
      }
      
      // Exponential backoff: wait 2^attempt seconds
      const delay = Math.pow(2, attempt) * 1000;
      console.log(`⏳ Waiting ${delay}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // This should never be reached, but TypeScript needs it
  throw new Error(`Failed after ${maxRetries} attempts`);
}

// Check XAI quota status (with caching to avoid excessive API calls)
async function checkXAIQuota(): Promise<boolean> {
  const now = Date.now();
  const cacheAge = now - xaiQuotaStatus.lastChecked;
  
  // Cache quota status for 5 minutes to avoid excessive checks
  if (cacheAge < 5 * 60 * 1000) {
    console.log(`📊 Using cached XAI quota status: ${xaiQuotaStatus.hasCredits ? 'Available' : 'Depleted'}`);
    return xaiQuotaStatus.hasCredits;
  }
  
  try {
    console.log('📊 Checking XAI quota status...');
    
    // Simple test call to check if we have credits
    const response = await xai.chat.completions.create({
      model: "grok-2-1212",
      messages: [{ role: "user", content: "Test" }],
      max_tokens: 1
    });
    
    xaiQuotaStatus = { hasCredits: true, lastChecked: now };
    console.log('✅ XAI quota check passed');
    return true;
  } catch (error: any) {
    console.log('❌ XAI quota check failed:', error.message);
    
    if (error.message?.includes('quota') || error.message?.includes('credit') || 
        error.message?.includes('403') || error.message?.includes('No credits')) {
      xaiQuotaStatus = { hasCredits: false, lastChecked: now };
      return false;
    }
    
    // For other errors, assume credits are available but there's a temporary issue
    console.log('⚠️ XAI quota check inconclusive, assuming credits available');
    return true;
  }
}

interface ScholarPersonaContext {
  name: string;
  systemPrompt: string;
  expertise: string[];
  voiceTone: string;
}

interface ChatContext {
  religion: string | null;
  book: string;
  chapter: number;
  persona: string | null;
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// Import OpenAI service for fallback
import { generateScriptureResponse } from "./openai";

export async function generatePersonaResponse(
  message: string,
  context: ChatContext,
  personaContext?: ScholarPersonaContext,
  conversationHistory: ConversationMessage[] = []
): Promise<string> {
  // Enhanced system prompt for scholar personas with conversation awareness
  const baseSystemPrompt = `You are a distinguished religious scholar and spiritual guide who engages in natural, flowing conversations. Your responses should be:
- Scholarly yet accessible, drawing from authentic religious texts and traditions
- Respectful of all faith traditions while providing deep insights
- Contextual to the specific scripture or religious text being discussed
- Encouraging of spiritual growth and understanding
- Rich with historical context and cross-references when appropriate
- Building naturally on previous conversation when history exists
- Include a thoughtful follow-up question to encourage deeper dialogue

After providing your main response, add a proactive follow-up question such as:
- "How does this resonate with your own spiritual journey?"
- "Would you like to explore any specific aspect of this teaching further?"
- "Building on [specific verse/concept], what questions arise for you?"
- "Which part of this wisdom speaks most deeply to you?"

Current context: ${context.religion ? `${context.religion} - ${context.book} Chapter ${context.chapter}` : 'General spiritual inquiry'}`;

  const systemPrompt = personaContext 
    ? `${baseSystemPrompt}\n\nPersona: ${personaContext.systemPrompt}\n\nExpertise: ${personaContext.expertise.join(', ')}\n\nSpeaking style: ${personaContext.voiceTone}`
    : baseSystemPrompt;

  // Build message array with conversation history
  const messages = [{ role: "system" as const, content: systemPrompt }];
  
  // Add conversation history if present (limit to last 10 for performance)
  const recentHistory = conversationHistory.slice(-10);
  if (recentHistory.length > 0) {
    recentHistory.forEach(msg => {
      messages.push({ role: msg.role, content: msg.content });
    });
  }
  
  // Enhanced current message with context
  const enhancedMessage = context.religion 
    ? `Context: Reading ${context.religion} - ${context.book} Chapter ${context.chapter}\n\nCurrent question: ${message}`
    : `Current question: ${message}`;
  
  // Add current user message
  messages.push({ role: "user" as const, content: enhancedMessage });

  console.log("XAI Persona Request:", { 
    persona: personaContext?.name || 'Universal Guide', 
    contextualMessage: enhancedMessage, 
    historyLength: recentHistory.length 
  });

  // Check quota before making XAI call
  const hasXAICredits = await checkXAIQuota();
  
  if (!hasXAICredits) {
    console.warn("XAI quota exceeded, falling back to OpenAI immediately");
    return await generateScriptureResponse(message, {
      religion: context.religion || "",
      book: context.book,
      chapter: context.chapter
    }, conversationHistory);
  }

  // XAI operation with retry and fallback
  const xaiOperation = async () => {
    const response = await xai.chat.completions.create({
      model: "grok-2-1212",
      messages,
      max_tokens: 1200,
      temperature: 0.7,
      presence_penalty: 0.1,
      frequency_penalty: 0.1
    });

    const content = response.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('No response generated from XAI');
    }

    return content;
  };

  // Fallback operation using OpenAI
  const fallbackOperation = async () => {
    console.log("🔄 Executing OpenAI fallback for persona response");
    return await generateScriptureResponse(message, {
      religion: context.religion || "",
      book: context.book,
      chapter: context.chapter
    }, conversationHistory);
  };

  // Execute with retry and fallback
  return await withRetryAndFallback(
    xaiOperation,
    fallbackOperation,
    "XAI Persona Response",
    3
  );
}

// Multi-religious perspective analysis for general questions
export async function generateMultiReligiousPerspective(
  message: string,
  conversationHistory: ConversationMessage[] = []
): Promise<string> {
  const systemPrompt = `You are an interfaith scholar with deep knowledge of multiple religious traditions who engages in natural, flowing conversations. When providing perspectives from multiple religious traditions, use exactly these five traditions in this order:

<perspective>Christianity</perspective>
<perspective>Islam</perspective>
<perspective>Judaism</perspective>
<perspective>Hinduism</perspective>
<perspective>Buddhism</perspective>

Enhanced Conversation Guidelines:
- Build on previous exchanges naturally when conversation history exists
- Provide 2-3 sentences for each perspective
- Include authentic scriptural references when possible
- Ensure each perspective offers unique insights while highlighting common spiritual themes
- Keep responses balanced in length across all five traditions
- After your multi-religious response, add a proactive follow-up question to encourage deeper dialogue:
  * "How does this resonate with your own spiritual journey?"
  * "Would you like to explore any of these perspectives further?"
  * "Building on these teachings, what questions arise for you?"
  * "Which of these traditions speaks most deeply to you right now?"`;

  // Build message array with conversation history
  const messages = [{ role: "system" as const, content: systemPrompt }];
  
  // Add conversation history if present (limit to last 8 for performance)
  const recentHistory = conversationHistory.slice(-8);
  if (recentHistory.length > 0) {
    recentHistory.forEach(msg => {
      messages.push({ role: msg.role, content: msg.content });
    });
  }
  
  // Enhanced current message with context
  const enhancedMessage = recentHistory.length > 0 
    ? `Building on our conversation, please provide multi-religious perspectives on: ${message}`
    : `Please provide perspectives from multiple religious traditions on this question: ${message}`;
  
  // Add current user message
  messages.push({ role: "user" as const, content: enhancedMessage });

  console.log("XAI Multi-Religious Request:", { 
    question: message, 
    historyLength: recentHistory.length 
  });

  // Check quota before making XAI call
  const hasXAICredits = await checkXAIQuota();
  
  if (!hasXAICredits) {
    console.warn("XAI quota exceeded, falling back to OpenAI for multi-religious response");
    return await generateScriptureResponse(message, {
      religion: "",
      book: "",
      chapter: 0,
      multiReligiousPerspective: true
    }, conversationHistory);
  }

  // XAI operation
  const xaiOperation = async () => {
    const response = await xai.chat.completions.create({
      model: "grok-2-1212",
      messages,
      max_tokens: 1400,
      temperature: 0.8,
      presence_penalty: 0.2
    });

    return response.choices[0]?.message?.content || "Unable to generate multi-religious perspective.";
  };

  // Fallback operation using OpenAI
  const fallbackOperation = async () => {
    console.log("🔄 Executing OpenAI fallback for multi-religious perspective");
    return await generateScriptureResponse(message, {
      religion: "",
      book: "",
      chapter: 0,
      multiReligiousPerspective: true
    }, conversationHistory);
  };

  // Execute with retry and fallback
  return await withRetryAndFallback(
    xaiOperation,
    fallbackOperation,
    "XAI Multi-Religious Perspective",
    3
  );
}

// Verse-specific explanation with XAI
export async function explainVerse(
  verseText: string, 
  context: { religion: string; book: string; chapter: number; verse: number }
): Promise<string> {
  try {
    const systemPrompt = `You are a religious scholar specializing in ${context.religion} studies. Provide a clear, insightful explanation of the given verse, including:
- Historical and cultural context
- Key theological concepts
- Practical spiritual applications
- Connection to broader themes in ${context.book}

Keep your explanation scholarly yet accessible, around 150-200 words.`;

    const response = await xai.chat.completions.create({
      model: "grok-2-1212",
      messages: [
        { 
          role: "system", 
          content: systemPrompt 
        },
        { 
          role: "user", 
          content: `Please explain this verse from ${context.religion} - ${context.book} ${context.chapter}:${context.verse}:\n\n"${verseText}"` 
        }
      ],
      max_tokens: 300,
      temperature: 0.6
    });

    return response.choices[0]?.message?.content || "Unable to generate verse explanation.";
  } catch (error: any) {
    console.error('Verse explanation error:', error.message);
    throw error;
  }
}