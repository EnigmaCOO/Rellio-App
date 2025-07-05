import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "" 
});

export interface ScriptureContext {
  religion: string;
  book: string;
  chapter: number;
  verses?: Array<{ number: number; text: string }>;
}

export async function generateScriptureResponse(
  userMessage: string,
  context?: ScriptureContext
): Promise<string> {
  try {
    let systemPrompt = `You are a knowledgeable and respectful scripture study assistant. You help users understand and explore religious texts from various traditions including Christianity, Islam, Judaism, Buddhism, and Hinduism. 

Your responses should be:
- Respectful and inclusive of all religious traditions
- Scholarly and informative
- Contextually relevant to the scripture being studied
- Educational without being preachy
- Acknowledging different interpretations when appropriate`;

    let userPrompt = userMessage;

    if (context) {
      systemPrompt += `\n\nCurrent context: The user is studying ${context.religion} - ${context.book}, Chapter ${context.chapter}.`;
      
      if (context.verses && context.verses.length > 0) {
        systemPrompt += `\n\nCurrent verses:\n${context.verses.map(v => `${v.number}. ${v.text}`).join('\n')}`;
      }
      
      userPrompt += `\n\n(This question is about ${context.religion} - ${context.book}, Chapter ${context.chapter})`;
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    return response.choices[0].message.content || "I apologize, but I couldn't generate a response at this time.";
  } catch (error) {
    console.error("OpenAI API error:", error);
    throw new Error("Failed to generate AI response. Please check your API key configuration.");
  }
}
