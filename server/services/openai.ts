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
  multiReligiousPerspective?: boolean;
}

export async function generateScriptureResponse(
  userMessage: string,
  context?: ScriptureContext
): Promise<string> {
  try {
    console.log("generateScriptureResponse called with:", { userMessage, context });
    // Handle multi-religious perspective requests FIRST
    if (context && context.multiReligiousPerspective === true) {
      console.log("Multi-religious perspective triggered:", { question: userMessage, context });
      
      const multiReligiousPrompt = `You are an interfaith scholar with deep knowledge of multiple religious traditions. When asked general spiritual questions, provide perspectives from exactly these five traditions in this order:

<perspective>Christianity</perspective>
<perspective>Islam</perspective>
<perspective>Judaism</perspective>
<perspective>Hinduism</perspective>
<perspective>Buddhism</perspective>

Format Guidelines:
- Use ONLY the exact format shown above with <perspective>Tradition Name</perspective> tags
- Never use asterisks (****) or other formatting for section headers
- Provide 2-3 sentences for each perspective
- Include authentic scriptural references when possible
- Ensure each perspective offers unique insights while highlighting common spiritual themes
- Keep responses balanced in length across all five traditions

User's question: "${userMessage}"`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: multiReligiousPrompt },
          { role: "user", content: userMessage }
        ],
        max_tokens: 1200,
        temperature: 0.8,
      });

      const multiResponse = response.choices[0].message.content || "I apologize, but I couldn't generate a multi-religious response at this time.";
      console.log("Multi-religious OpenAI response generated:", { question: userMessage, response: multiResponse });
      return multiResponse;
    }

    // Check if no book context is provided AND not a multi-religious request
    if (!context || (!context.book && !context.multiReligiousPerspective) || (!context.religion && !context.multiReligiousPerspective)) {
      console.log("No specific context provided, analyzing question for spiritual content:", userMessage);
      
      // Define spiritual keywords that should trigger multi-religious responses
      const spiritualKeywords = [
        'purpose', 'meaning', 'god', 'divine', 'life', 'love', 'truth', 'soul', 'spirit',
        'prayer', 'faith', 'peace', 'wisdom', 'salvation', 'heaven', 'hell', 'afterlife',
        'sin', 'forgiveness', 'compassion', 'mercy', 'justice', 'righteousness', 'holy',
        'sacred', 'worship', 'meditation', 'enlightenment', 'suffering', 'death', 'born',
        'creation', 'creator', 'universe', 'existence', 'eternal', 'immortal', 'moral',
        'ethics', 'good', 'evil', 'virtue', 'blessing', 'miracle', 'angel', 'prophet'
      ];
      
      const input = userMessage.toLowerCase();
      const matchedSpiritualKeywords = spiritualKeywords.filter(keyword => input.includes(keyword));
      const hasSpiritualContent = matchedSpiritualKeywords.length > 0;
      
      console.log("Spiritual analysis:", { 
        input, 
        hasSpiritualContent,
        matchedKeywords: matchedSpiritualKeywords
      });
      
      // For spiritual/religious questions, provide multi-religious perspective using OpenAI
      if (hasSpiritualContent) {
        console.log("SPIRITUAL QUESTION DETECTED - Calling OpenAI for multi-religious response");
        
        const multiReligiousPrompt = `You are an interfaith scholar with deep knowledge of multiple religious traditions. When asked general spiritual questions, provide perspectives from exactly these five traditions in this order:

<perspective>Christianity</perspective>
<perspective>Islam</perspective>
<perspective>Judaism</perspective>
<perspective>Hinduism</perspective>
<perspective>Buddhism</perspective>

Format Guidelines:
- Use ONLY the exact format shown above with <perspective>Tradition Name</perspective> tags
- Never use asterisks (****) or other formatting for section headers
- Provide 2-3 sentences for each perspective
- Include authentic scriptural references when possible
- Ensure each perspective offers unique insights while highlighting common spiritual themes
- Keep responses balanced in length across all five traditions

User's question: "${userMessage}"`;

        try {
          const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
              { role: "system", content: multiReligiousPrompt },
              { role: "user", content: userMessage }
            ],
            max_tokens: 1200,
            temperature: 0.8,
          });

          const multiResponse = response.choices[0].message.content || "I apologize, but I couldn't generate a response at this time.";
          console.log("SUCCESS: Multi-religious OpenAI response generated");
          return multiResponse;
        } catch (error) {
          console.error("Error calling OpenAI for spiritual question:", error);
          return "I apologize, but I'm having trouble accessing detailed religious perspectives right now. Please try selecting a specific religious text from the navigation panel for more targeted guidance.";
        }
      }
      
      // Handle platform-specific questions
      if (input.includes('platform') || input.includes('many religions') || input.includes('how many')) {
        return "This platform provides access to 5 major religious traditions: Christianity (Bible), Islam (Quran), Judaism (Torah), Hinduism (Bhagavad Gita), and Buddhism (Tripitaka). Each offers unique spiritual insights and wisdom. Select any tradition from the navigation panel to explore its sacred texts and teachings.";
      }
      
      if (input.includes('quran') && (input.includes('wrote') || input.includes('written') || input.includes('author'))) {
        return "According to Islamic belief, the Quran was revealed by Allah (God) to the Prophet Muhammad through the angel Gabriel (Jibril) over approximately 23 years. Muslims believe it is the direct word of God, not authored by Muhammad but transmitted through him. Select 'Quran' from the navigation to explore its verses and teachings.";
      }
      
      if (input.includes('bible') && (input.includes('wrote') || input.includes('written') || input.includes('author'))) {
        return "The Bible was written by multiple authors over many centuries. The Old Testament includes prophets, kings, and scribes, while the New Testament was written by apostles and early Christian leaders like Paul, Matthew, Mark, Luke, and John. Select 'Bible' from the navigation to explore its books and verses.";
      }
      
      if (input.includes('torah') && (input.includes('wrote') || input.includes('written') || input.includes('author'))) {
        return "According to Jewish tradition, the Torah (Five Books of Moses) was given by God to Moses on Mount Sinai. It includes Genesis, Exodus, Leviticus, Numbers, and Deuteronomy. Select 'Torah' from the navigation to explore its sacred texts and teachings.";
      }
      
      // Default response for non-spiritual general questions
      return "I'm designed to help with questions about religious scriptures and spiritual topics. For the most relevant answers, please select a religious text from the navigation panel, or ask about spiritual, religious, or ethical topics.";
    }

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
