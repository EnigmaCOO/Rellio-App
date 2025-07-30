import OpenAI from "openai";

// Initialize XAI client using OpenAI SDK with XAI base URL
const xai = new OpenAI({ 
  baseURL: "https://api.x.ai/v1", 
  apiKey: process.env.XAI_API_KEY 
});

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

export async function generatePersonaResponse(
  message: string,
  context: ChatContext,
  personaContext?: ScholarPersonaContext
): Promise<string> {
  try {
    // Enhanced system prompt for scholar personas
    const baseSystemPrompt = `You are a distinguished religious scholar and spiritual guide. Your responses should be:
- Scholarly yet accessible, drawing from authentic religious texts and traditions
- Respectful of all faith traditions while providing deep insights
- Contextual to the specific scripture or religious text being discussed
- Encouraging of spiritual growth and understanding
- Rich with historical context and cross-references when appropriate

Current context: ${context.religion ? `${context.religion} - ${context.book} Chapter ${context.chapter}` : 'General spiritual inquiry'}`;

    const systemPrompt = personaContext 
      ? `${baseSystemPrompt}\n\nPersona: ${personaContext.systemPrompt}\n\nExpertise: ${personaContext.expertise.join(', ')}\n\nSpeaking style: ${personaContext.voiceTone}`
      : baseSystemPrompt;

    // Enhanced message with context
    const enhancedMessage = context.religion 
      ? `Context: Reading ${context.religion} - ${context.book} Chapter ${context.chapter}\n\nQuestion: ${message}`
      : message;

    const response = await xai.chat.completions.create({
      model: "grok-2-1212", // Use the latest Grok model for text-only processing
      messages: [
        { 
          role: "system", 
          content: systemPrompt 
        },
        { 
          role: "user", 
          content: enhancedMessage 
        }
      ],
      max_tokens: 1000,
      temperature: 0.7,
      presence_penalty: 0.1,
      frequency_penalty: 0.1
    });

    const content = response.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('No response generated from XAI');
    }

    return content;
  } catch (error: any) {
    console.error('XAI API Error:', error.message);
    
    // Fallback to a contextual error message
    if (error.message?.includes('API key')) {
      throw new Error('XAI API key authentication failed. Please check your XAI_API_KEY.');
    }
    
    if (error.message?.includes('quota') || error.message?.includes('limit')) {
      throw new Error('XAI API quota exceeded. Please check your account limits.');
    }
    
    throw new Error(`Failed to generate response: ${error.message}`);
  }
}

// Multi-religious perspective analysis for general questions
export async function generateMultiReligiousPerspective(message: string): Promise<string> {
  try {
    const systemPrompt = `You are an interfaith scholar with deep knowledge of multiple religious traditions. When asked general spiritual questions, provide perspectives from:

1. **Christianity** - Biblical insights and Christian theological perspectives
2. **Islam** - Quranic teachings and Islamic scholarly interpretations  
3. **Judaism** - Torah wisdom and Talmudic understanding
4. **Hinduism** - Vedic and Bhagavad Gita teachings
5. **Buddhism** - Buddhist philosophy and mindfulness practices

Format your response with clear sections for each tradition, highlighting both unique insights and common threads. Be respectful, accurate, and draw from authentic sources.`;

    const response = await xai.chat.completions.create({
      model: "grok-2-1212",
      messages: [
        { 
          role: "system", 
          content: systemPrompt 
        },
        { 
          role: "user", 
          content: `Please provide perspectives from multiple religious traditions on this question: ${message}` 
        }
      ],
      max_tokens: 1200,
      temperature: 0.8,
      presence_penalty: 0.2
    });

    return response.choices[0]?.message?.content || "Unable to generate multi-religious perspective.";
  } catch (error: any) {
    console.error('Multi-religious perspective error:', error.message);
    throw error;
  }
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