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
    // Handle multi-religious perspective requests FIRST
    if (context && context.multiReligiousPerspective === true) {
      console.log("Multi-religious perspective triggered:", { question: userMessage, context });
      
      const multiReligiousPrompt = `You are an expert comparative religion scholar. The user has asked a general question about spirituality/religion without selecting a specific religious text. Provide a comprehensive response that includes perspectives from all 5 major religious traditions available on this platform.

Structure your response as follows:
1. Start with a brief general statement about the topic
2. Then provide specific perspectives from each tradition:
   - **From the Bible perspective:** [Answer based on Christian/Biblical teachings with specific verse reference (e.g., John 3:16)]
   - **From the Quran perspective:** [Answer based on Islamic teachings with specific verse reference (e.g., Quran 2:255)]
   - **From the Torah perspective:** [Answer based on Jewish teachings with specific verse reference (e.g., Leviticus 19:18)]
   - **From the Bhagavad Gita perspective:** [Answer based on Hindu teachings with specific verse reference (e.g., Bhagavad Gita 2.47)]
   - **From the Tripitaka perspective:** [Answer based on Buddhist teachings with specific text reference (e.g., Dhammapada 1.1)]
3. End with a brief conclusion highlighting common themes or key differences

Keep each perspective concise (1-2 sentences) but meaningful. Always include specific verse or text references for each religious tradition to provide authentic sourcing. Focus on authentic religious teachings and avoid generalizations.

User's question: "${userMessage}"`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: multiReligiousPrompt },
          { role: "user", content: userMessage }
        ],
        max_tokens: 600,
        temperature: 0.7,
      });

      const multiResponse = response.choices[0].message.content || "I apologize, but I couldn't generate a multi-religious response at this time.";
      console.log("Multi-religious response generated:", { question: userMessage, response: multiResponse });
      return multiResponse;
    }

    // Check if no book context is provided AND not a multi-religious request
    if (!context || (!context.book && !context.multiReligiousPerspective) || (!context.religion && !context.multiReligiousPerspective)) {
      // Handle general questions with meaningful responses
      const generalKeywords = [
        'purpose', 'history', 'religion', 'scripture', 'faith', 'spiritual', 'moral', 'meaning',
        'life', 'guidance', 'wisdom', 'beliefs', 'culture', 'tradition', 'sacred', 'holy',
        'divine', 'god', 'prayer', 'meditation', 'peace', 'love', 'compassion', 'forgiveness',
        'truth', 'enlightenment', 'salvation', 'afterlife', 'soul', 'spirit', 'worship',
        'ethics', 'values', 'philosophy', 'teaching', 'doctrine', 'theology', 'mysticism',
        'pilgrimage', 'ritual', 'ceremony', 'community', 'fellowship', 'devotion', 'platform',
        'religions', 'texts', 'bible', 'quran', 'torah', 'buddhist', 'hindu', 'christian',
        'islam', 'judaism', 'buddhism', 'hinduism', 'wrote', 'written', 'author', 'many'
      ];
      
      const input = userMessage.toLowerCase();
      const hasGeneralKeywords = generalKeywords.some(keyword => input.includes(keyword));
      
      let response;
      if (hasGeneralKeywords) {
        // Generate contextual response based on detected keywords
        if (input.includes('platform') || input.includes('many religions') || input.includes('how many')) {
          response = "This platform provides access to 5 major religious traditions: Christianity (Bible), Islam (Quran), Judaism (Torah), Hinduism (Bhagavad Gita), and Buddhism (Tripitaka). Each offers unique spiritual insights and wisdom. Select any tradition from the navigation panel to explore its sacred texts and teachings.";
        } else if (input.includes('quran') && (input.includes('wrote') || input.includes('written') || input.includes('author'))) {
          response = "According to Islamic belief, the Quran was revealed by Allah (God) to the Prophet Muhammad through the angel Gabriel (Jibril) over approximately 23 years. Muslims believe it is the direct word of God, not authored by Muhammad but transmitted through him. Select 'Quran' from the navigation to explore its verses and teachings.";
        } else if (input.includes('bible') && (input.includes('wrote') || input.includes('written') || input.includes('author'))) {
          response = "The Bible was written by multiple authors over many centuries. The Old Testament includes prophets, kings, and scribes, while the New Testament was written by apostles and early Christian leaders like Paul, Matthew, Mark, Luke, and John. Select 'Bible' from the navigation to explore its books and verses.";
        } else if (input.includes('torah') && (input.includes('wrote') || input.includes('written') || input.includes('author'))) {
          response = "According to Jewish tradition, the Torah (Five Books of Moses) was given by God to Moses on Mount Sinai. It includes Genesis, Exodus, Leviticus, Numbers, and Deuteronomy. Select 'Torah' from the navigation to explore its sacred texts and teachings.";
        } else if (input.includes('purpose') || input.includes('meaning')) {
          response = "Scripture serves as a guide for moral and spiritual life across cultures, offering wisdom, ethical principles, and answers to life's fundamental questions. Different religious traditions provide unique perspectives on purpose and meaning. Would you like to explore a specific religious text?";
        } else if (input.includes('history') || input.includes('tradition')) {
          response = "Religious scriptures have shaped human civilization for millennia, preserving ancient wisdom and cultural values. Each tradition has its own rich history of interpretation and practice. Select a religious text to learn about its historical development and significance.";
        } else if (input.includes('faith') || input.includes('belief')) {
          response = "Faith and belief systems provide frameworks for understanding existence, morality, and our relationship with the divine. Different scriptures offer various approaches to cultivating and expressing faith. Choose a religious tradition to explore its specific teachings on faith.";
        } else if (input.includes('god') || input.includes('divine')) {
          response = "Concepts of the divine vary across religious traditions - from monotheistic to polytheistic to non-theistic approaches. Each scripture offers unique insights into the nature of divinity and humanity's relationship with it. Select a text to explore specific theological perspectives.";
        } else if (input.includes('prayer') || input.includes('worship') || input.includes('meditation')) {
          response = "Spiritual practices like prayer, worship, and meditation are central to most religious traditions, each offering different methods for connecting with the divine and finding inner peace. Choose a religious text to learn about its specific spiritual practices and guidance.";
        } else if (input.includes('love') || input.includes('compassion') || input.includes('forgiveness')) {
          response = "Love, compassion, and forgiveness are universal themes found across religious scriptures, though expressed in different ways. These virtues are often seen as paths to spiritual growth and harmony. Select a religious tradition to explore its specific teachings on these values.";
        } else {
          response = "Religious scriptures offer profound insights into spirituality, ethics, and the human condition. Each tradition provides unique wisdom and guidance for life's journey. Select a specific religious text to dive deeper into its teachings and explore context-specific guidance.";
        }
      } else {
        response = "I'm designed to help with questions about religious scriptures and spiritual topics. For the most relevant answers, please select a religious text from the navigation panel, or ask about general spiritual, religious, or ethical topics.";
      }
      
      console.log("Chat input and response:", { input: userMessage, response });
      return response;
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
