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

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export async function generateScriptureResponse(
  userMessage: string,
  context?: ScriptureContext,
  conversationHistory: ConversationMessage[] = []
): Promise<string> {
  try {
    console.log("generateScriptureResponse called with:", { userMessage, context });
    // Handle multi-religious perspective requests FIRST
    if (context && context.multiReligiousPerspective === true) {
      console.log("Multi-religious perspective triggered:", { question: userMessage, context });
      
      // Build conversation context for better multi-turn dialogue
      const contextualPrompt = conversationHistory.length > 0 
        ? `Previous conversation context:\n${conversationHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n')}\n\nCurrent question: "${userMessage}"`
        : `User's question: "${userMessage}"`;

      const multiReligiousPrompt = `You are an interfaith scholar with deep knowledge of multiple religious traditions. You engage in natural, flowing conversations, building on previous exchanges when appropriate.

When providing perspectives from multiple religious traditions, use exactly these five traditions in this order:
<perspective>Christianity</perspective>
<perspective>Islam</perspective>
<perspective>Judaism</perspective>
<perspective>Hinduism</perspective>
<perspective>Buddhism</perspective>

Enhanced Conversation Guidelines:
- Build on previous exchanges naturally when conversation history exists
- Provide 2-3 sentences for each perspective
- Include authentic scriptural references when possible
- After your response, add a proactive follow-up question to encourage deeper dialogue
- Examples of proactive questions:
  * "How does this resonate with your own spiritual journey?"
  * "Would you like to explore any of these perspectives further?"
  * "Building on [specific verse/teaching], what questions arise for you?"
  * "Which of these traditions speaks most deeply to you right now?"`;

      const messages = [
        { role: "system" as const, content: multiReligiousPrompt }
      ];

      // Add conversation history if present
      if (conversationHistory.length > 0) {
        conversationHistory.forEach(msg => {
          messages.push({ role: msg.role, content: msg.content });
        });
      }

      // Add current user message with context
      const contextualMessage = conversationHistory.length > 0 
        ? `Building on our conversation: ${userMessage}`
        : userMessage;
      
      messages.push({ role: "user" as const, content: contextualMessage });

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini", // Use faster model for quick responses
        messages,
        max_tokens: 500, // Increased for proactive questions
        temperature: 0.7,
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
        'ethics', 'good', 'evil', 'virtue', 'blessing', 'miracle', 'angel', 'prophet',
        // Additional spiritual/religious terms
        'judgment', 'judgement', 'day', 'resurrection', 'apocalypse', 'end times', 'rapture',
        'messiah', 'christ', 'allah', 'buddha', 'krishna', 'brahman', 'karma', 'dharma',
        'nirvana', 'moksha', 'temple', 'church', 'mosque', 'synagogue', 'bible', 'quran',
        'torah', 'scripture', 'revelation', 'commandment', 'covenant', 'trinity', 'incarnation',
        'transfiguration', 'ascension', 'resurrection', 'reincarnation', 'rebirth', 'awakening',
        'consciousness', 'transcendence', 'mystical', 'spiritual', 'religious', 'belief',
        'doctrine', 'theology', 'philosophy', 'metaphysics', 'supernatural', 'miracle',
        'pilgrimage', 'ritual', 'ceremony', 'sacrament', 'baptism', 'communion', 'confession',
        'penance', 'repentance', 'sanctification', 'purification', 'deliverance', 'healing',
        'blessing', 'cursing', 'prophecy', 'vision', 'dream', 'sign', 'wonder', 'mystery',
        'parable', 'allegory', 'symbol', 'metaphor', 'what', 'why', 'how', 'when', 'where',
        'who', 'which', 'explain', 'tell me', 'help me understand'
      ];
      
      const input = userMessage.toLowerCase();
      const matchedSpiritualKeywords = spiritualKeywords.filter(keyword => input.includes(keyword));
      
      // Enhanced spiritual content detection - also check for question patterns
      const questionPatterns = [
        /what is|what does|what are|what was|what will/i,
        /why is|why does|why are|why do|why did/i,
        /how is|how does|how can|how do|how did/i,
        /when is|when does|when did|when will/i,
        /where is|where does|where did|where will/i,
        /who is|who was|who are|who were/i,
        /tell me about|explain|help me understand/i,
        /meaning of|purpose of|significance of/i
      ];
      
      const hasQuestionPattern = questionPatterns.some(pattern => pattern.test(input));
      
      // More lenient spiritual content detection - religious questions should be handled by the AI scholar
      const hasSpiritualContent = matchedSpiritualKeywords.length > 0 || 
                                  hasQuestionPattern || 
                                  input.length > 5; // Handle most questions unless very short
      
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
- Provide 1-2 sentences for each perspective (keep it brief for voice)
- Include authentic scriptural references when possible
- Focus on core insights rather than detailed explanations
- Keep responses concise for better voice experience

User's question: "${userMessage}"`;

        try {
          const response = await openai.chat.completions.create({
            model: "gpt-4o-mini", // Use faster model for quick responses
            messages: [
              { role: "system", content: multiReligiousPrompt },
              { role: "user", content: userMessage }
            ],
            max_tokens: 400, // Very short responses for smooth conversation flow and voice
            temperature: 0.7,
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
      
      // Default: Act as expert AI religious scholar for all questions
      console.log("Acting as expert AI religious scholar for general question");
      
      const expertScholarPrompt = `You are an expert AI religious scholar with deep knowledge across multiple religious traditions including Christianity, Islam, Judaism, Hinduism, Buddhism, and other spiritual paths. You approach all questions with wisdom, compassion, and scholarly expertise.

For any question, provide thoughtful, informative responses drawing from your extensive knowledge of religious texts, spiritual practices, theological concepts, and interfaith understanding. Always be respectful of different beliefs while sharing authentic religious insights.

User's question: "${userMessage}"`;

      try {
        const response = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            { role: "system", content: expertScholarPrompt },
            { role: "user", content: userMessage }
          ],
          max_tokens: 800,
          temperature: 0.7,
        });

        const scholarResponse = response.choices[0].message.content || "I apologize, but I couldn't generate a response at this time.";
        console.log("Expert AI religious scholar response generated");
        return scholarResponse;
      } catch (error) {
        console.error("Error calling OpenAI for expert scholar response:", error);
        return "I'm an expert AI religious scholar here to help with spiritual, religious, and philosophical questions. While I'm having some technical difficulties right now, I'm designed to provide thoughtful insights across multiple religious traditions. Please feel free to ask about any spiritual or religious topic.";
      }
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
