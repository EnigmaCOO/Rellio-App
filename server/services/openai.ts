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
    let systemPrompt = `You are an expert scripture guide with deep knowledge of religious texts. Your role is to:

1. Provide concise explanations (1-2 sentences) of scripture passages
2. Offer optional historical context when relevant
3. Invite follow-up questions to encourage deeper study
4. Maintain respectful, scholarly tone across all traditions
5. Acknowledge different interpretations when appropriate

Response format:
- Keep explanations brief and accessible
- Add historical context only when it enhances understanding
- Always end with an invitation for further questions
- Use authentic data from respective religious APIs
- Adapt your expertise to the selected religious text

Data sources for authenticity:
- Bible: https://scripture.api.bible/
- Quran: https://alquran.cloud/api
- Torah: https://www.sefaria.org/api
- Bhagavad Gita: https://api.bhagavadgita.io/v1/
- Tripitaka: Local authentic JSON data`;

    let userPrompt = userMessage;

    if (context) {
      const religionContext = {
        bible: "Use data from https://scripture.api.bible/ for authentic biblical content",
        quran: "Use data from https://alquran.cloud/api for authentic Quranic content",  
        torah: "Use data from https://www.sefaria.org/api for authentic Torah content",
        hindu: "Use data from https://api.bhagavadgita.io/v1/ for authentic Bhagavad Gita content",
        buddhist: "Use local JSON data for authentic Tripitaka content"
      };

      systemPrompt += `\n\nCurrent Context: ${context.religion} - ${context.book}, Chapter ${context.chapter}`;
      systemPrompt += `\nData Source: ${religionContext[context.religion as keyof typeof religionContext] || 'Authentic religious texts'}`;
      
      if (context.verses && context.verses.length > 0) {
        systemPrompt += `\nCurrent Verses: ${context.verses.map(v => `${v.number}. ${v.text}`).join('\n')}`;
      }
      
      userPrompt += `\n\n(This question is about ${context.religion} - ${context.book}, Chapter ${context.chapter})`;
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      max_tokens: 400,
      temperature: 0.7,
    });

    return response.choices[0].message.content || "I apologize, but I couldn't generate a response at this time.";
  } catch (error) {
    console.error("OpenAI API error:", error);
    throw new Error("Failed to generate AI response. Please check your API key configuration.");
  }
}
