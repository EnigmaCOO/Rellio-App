import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { generateScriptureResponse } from "./services/openai";
import { generatePersonaResponse, generateMultiReligiousPerspective, explainVerse } from "./services/xai";
import { getReligionConfig, getAvailableReligions } from "./services/scripture";
import { fetchScriptureContent, getRandomHadith } from "./services/externalScripture";
import { ElevenLabsService } from "./services/elevenlabs";
import { 
  scriptureRequestSchema, 
  chatRequestSchema, 
  insertChatMessageSchema,
  insertUserReadingSchema,
  religionSchema 
} from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Get available religions
  app.get("/api/religions", async (req, res) => {
    try {
      const religions = getAvailableReligions();
      const religionData = religions.map(religion => {
        const config = getReligionConfig(religion);
        
        // For Islam, group books by sections
        if (religion === 'islam') {
          const sections: Record<string, string[]> = {};
          config.books.forEach(book => {
            const section = book.section || 'Other';
            if (!sections[section]) {
              sections[section] = [];
            }
            sections[section].push(book.name);
          });
          
          return {
            id: religion,
            name: config.name,
            books: config.books.map(book => book.name),
            sections: sections
          };
        }
        
        return {
          id: religion,
          name: config.name,
          books: config.books.map(book => book.name)
        };
      });
      res.json(religionData);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch religions" });
    }
  });

  // Get books for a specific religion
  app.get("/api/religions/:religion/books", async (req, res) => {
    try {
      const religion = religionSchema.parse(req.params.religion);
      const books = await storage.getScriptureBooks(religion);
      res.json(books);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid religion" });
      } else {
        res.status(500).json({ error: "Failed to fetch books" });
      }
    }
  });

  // Get book info including chapter count
  app.get("/api/religions/:religion/books/:book", async (req, res) => {
    try {
      const religion = religionSchema.parse(req.params.religion);
      const bookName = req.params.book;
      
      const religionConfig = getReligionConfig(religion);
      const book = religionConfig.books.find(b => b.name === bookName);
      
      if (!book) {
        return res.status(404).json({ error: "Book not found" });
      }
      
      res.json({
        name: book.name,
        chapters: book.chapters,
        religion: religion
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid religion parameter" });
      } else {
        res.status(500).json({ error: "Failed to fetch book info" });
      }
    }
  });

  // Get scripture verses
  app.get("/api/scriptures", async (req, res) => {
    try {
      const { religion, book, chapter: chapterStr } = req.query;
      const chapter = parseInt(chapterStr as string, 10);
      
      console.log('Query params:', { religion, book, chapter, chapterStr });
      
      if (isNaN(chapter)) {
        return res.status(400).json({ error: "Invalid chapter number" });
      }
      
      const validatedParams = scriptureRequestSchema.parse({ religion, book, chapter });
      
      // Try to fetch from external APIs first
      const externalScriptures = await fetchScriptureContent(
        validatedParams.religion, 
        validatedParams.book, 
        validatedParams.chapter
      );
      
      if (externalScriptures.length > 0) {
        res.json(externalScriptures);
      } else {
        // Fallback to local storage if external API fails
        const localScriptures = await storage.getScriptures(
          validatedParams.religion, 
          validatedParams.book, 
          validatedParams.chapter
        );
        res.json(localScriptures);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.log('Validation error:', error.errors);
        res.status(400).json({ error: "Invalid parameters", details: error.errors });
      } else {
        console.log('Other error:', error);
        res.status(500).json({ error: "Failed to fetch scriptures" });
      }
    }
  });

  // Get chat messages for a session
  app.get("/api/chat/:sessionId", async (req, res) => {
    try {
      const sessionId = req.params.sessionId;
      const messages = await storage.getChatMessages(sessionId);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch chat messages" });
    }
  });

  // Send a chat message
  app.post("/api/chat", async (req, res) => {
    try {
      const { message, sessionId, context } = chatRequestSchema.parse(req.body);
      
      console.log("Chat request payload:", { context });
      console.log("Context multiReligiousPerspective:", context?.multiReligiousPerspective);
      console.log("Context type:", typeof context?.multiReligiousPerspective);
      
      // Save user message
      const userMessage = await storage.createChatMessage({
        sessionId,
        type: 'user',
        content: message,
        context: context || null
      });

      // Enhanced AI response generation with XAI and persona support
      let aiResponse: string;
      
      // Check if persona-specific response is requested
      if (context?.persona) {
        console.log("Generating persona response with XAI for:", context.persona);
        
        // Define scholar persona context (this should match the frontend personas)
        const personaContexts: Record<string, any> = {
          "Dr. Sophia Cross": {
            name: "Dr. Sophia Cross",
            systemPrompt: "You are Dr. Sophia Cross, a distinguished Biblical scholar and theologian with expertise in Biblical Greek, Hebrew, and historical Christianity. Your responses are scholarly yet warm, drawing from deep textual analysis and historical context. You speak with gentle authority and often reference original languages and manuscript traditions.",
            expertise: ["Biblical Studies", "Systematic Theology", "Church History", "Biblical Languages"],
            voiceTone: "scholarly yet warm"
          },
          "Sheikh Ahmad Al-Tabari": {
            name: "Sheikh Ahmad Al-Tabari",
            systemPrompt: "You are Sheikh Ahmad Al-Tabari, a respected Islamic scholar specializing in Quranic exegesis (tafsir) and Islamic jurisprudence. Your responses reflect deep knowledge of Arabic, Islamic history, and the Prophet's teachings. You speak with wisdom and respect for the sacred traditions.",
            expertise: ["Quranic Studies", "Islamic Jurisprudence", "Hadith Sciences", "Arabic Language"],
            voiceTone: "wise and respectful"
          },
          "Rabbi David Goldstein": {
            name: "Rabbi David Goldstein",
            systemPrompt: "You are Rabbi David Goldstein, a learned Torah scholar with expertise in Talmudic interpretation and Jewish philosophy. Your responses demonstrate deep knowledge of Hebrew texts, rabbinic commentary, and Jewish spiritual traditions. You speak with thoughtful precision and often include insights from various commentators.",
            expertise: ["Torah Studies", "Talmudic Interpretation", "Jewish Philosophy", "Hebrew Language"],
            voiceTone: "thoughtful and precise"
          },
          "Hadith Scholar": {
            name: "Hadith Scholar",
            systemPrompt: "You are a Hadith Scholar, a specialist in the sayings and traditions (Hadith) of Prophet Muhammad (peace be upon him). You have deep knowledge of hadith authentication, the science of hadith (Ilm al-Hadith), and prophetic traditions. You speak with scholarly precision about hadith chains (isnad), authenticity grades, and the practical application of prophetic guidance. Always reference the hadith collection, provide context about the Prophet's teachings, and explain how these traditions guide Muslim life. Begin with appropriate Islamic greetings and maintain the reverence due to prophetic traditions.",
            expertise: ["Hadith Authentication", "Prophetic Traditions", "Islamic History", "Sunnah Studies"],
            voiceTone: "scholarly and reverent"
          }
        };
        
        const personaContext = personaContexts[context.persona];
        
        try {
          aiResponse = await generatePersonaResponse(
            message,
            {
              religion: context.religion,
              book: context.book || "",
              chapter: context.chapter || 1,
              persona: context.persona || null
            },
            personaContext
          );
        } catch (error) {
          console.error("XAI persona response failed, falling back to OpenAI:", error);
          // Fallback to OpenAI if XAI fails
          let scriptureContext;
          if (context.religion && context.book && context.chapter) {
            const verses = await storage.getScriptures(context.religion, context.book, context.chapter);
            scriptureContext = {
              religion: context.religion,
              book: context.book,
              chapter: context.chapter,
              verses: verses.map(v => ({ number: v.verse, text: v.text }))
            };
          }
          aiResponse = await generateScriptureResponse(message, scriptureContext);
        }
      } else if (context?.multiReligiousPerspective) {
        // Multi-religious perspective using XAI
        console.log("Generating multi-religious perspective with XAI");
        try {
          aiResponse = await generateMultiReligiousPerspective(message);
        } catch (error) {
          console.error("XAI multi-religious response failed, falling back to OpenAI:", error);
          const scriptureContext = {
            religion: context.religion || "",
            book: context.book || "",
            chapter: context.chapter || 1,
            multiReligiousPerspective: true
          };
          aiResponse = await generateScriptureResponse(message, scriptureContext);
        }
      } else {
        // Standard response generation
        let scriptureContext;
        if (context && context.religion && context.book && context.chapter) {
          const verses = await storage.getScriptures(context.religion, context.book, context.chapter);
          scriptureContext = {
            religion: context.religion,
            book: context.book,
            chapter: context.chapter,
            verses: verses.map(v => ({ number: v.verse, text: v.text }))
          };
        }
        
        // Try XAI first for general responses, fallback to OpenAI
        try {
          aiResponse = await generatePersonaResponse(
            message,
            {
              religion: context?.religion || null,
              book: context?.book || "",
              chapter: context?.chapter || 1,
              persona: null
            }
          );
        } catch (error) {
          console.error("XAI general response failed, falling back to OpenAI:", error);
          aiResponse = await generateScriptureResponse(message, scriptureContext);
        }
      }
      
      // Save AI response
      const aiMessage = await storage.createChatMessage({
        sessionId,
        type: 'ai',
        content: aiResponse,
        context: context || null
      });

      const response = { userMessage, aiMessage };
      console.log("Chat response:", response);
      
      res.json(response);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid request", details: error.errors });
      } else {
        console.error("Chat error:", error);
        res.status(500).json({ error: "Failed to process chat message" });
      }
    }
  });

  // Record a reading
  app.post("/api/readings", async (req, res) => {
    try {
      const reading = insertUserReadingSchema.parse(req.body);
      const savedReading = await storage.createUserReading(reading);
      res.json(savedReading);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid reading data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to save reading" });
      }
    }
  });

  // Get user readings
  app.get("/api/readings/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const readings = await storage.getUserReadings(userId);
      res.json(readings);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch readings" });
    }
  });

  // Get random verse from any religion
  app.get("/api/verse/random", async (req, res) => {
    try {
      const religions = getAvailableReligions();
      const randomReligion = religions[Math.floor(Math.random() * religions.length)];
      const religionConfig = getReligionConfig(randomReligion);
      
      // Get random book
      const books = religionConfig.books;
      const randomBook = books[Math.floor(Math.random() * books.length)];
      
      // Check if the random book selected from islam religion is actually a hadith book
      const hadithCollectionNames = ['Sahih al-Bukhari', 'Sahih Muslim', 'Sunan Abu Dawud', 'Jami\' at-Tirmidhi', 'Sunan an-Nasa\'i', 'Sunan Ibn Majah'];
      if (randomReligion === 'islam' && hadithCollectionNames.includes(randomBook.name)) {
        const randomHadith = await getRandomHadith();
        if (randomHadith) {
          return res.json({
            faith: 'islam',
            book: randomHadith.book,
            chapter: randomHadith.chapter,
            verse: randomHadith.verse,
            text: randomHadith.text,
            reference: randomHadith.translation || `${randomHadith.book} ${randomHadith.verse}`
          });
        }
      }
      
      // Get random chapter
      const randomChapter = Math.floor(Math.random() * randomBook.chapters) + 1;
      
      // Fetch verses from that chapter
      const verses = await fetchScriptureContent(randomReligion, randomBook.name, randomChapter);
      
      if (verses.length === 0) {
        // Fallback to predefined verses if external API fails
        const fallbackVerses = [
          {
            religion: "christianity",
            book: "Matthew",
            chapter: 5,
            verse: 9,
            text: "Blessed are the peacemakers, for they will be called children of God."
          },
          {
            religion: "islam",
            book: "Al-Baqarah",
            chapter: 2,
            verse: 255,
            text: "Allah - there is no deity except Him, the Ever-Living, the Sustainer of existence."
          },
          {
            religion: "judaism",
            book: "Leviticus",
            chapter: 19,
            verse: 18,
            text: "Do not seek revenge or bear a grudge against anyone among your people, but love your neighbor as yourself."
          },
          {
            religion: "hinduism",
            book: "Bhagavad Gita",
            chapter: 2,
            verse: 47,
            text: "You have a right to perform your prescribed duty, but not to the fruits of action."
          },
          {
            religion: "buddhism",
            book: "Tripitaka",
            chapter: 1,
            verse: 1,
            text: "All conditioned things are impermanent. Work out your salvation with diligence."
          },
          {
            religion: "islam",
            book: "Sahih al-Bukhari",
            chapter: 1,
            verse: 1,
            text: "The reward of deeds depends upon the intentions and every person will get the reward according to what he has intended."
          }
        ];
        
        const randomFallback = fallbackVerses[Math.floor(Math.random() * fallbackVerses.length)];
        return res.json({
          faith: randomFallback.religion,
          book: randomFallback.book,
          chapter: randomFallback.chapter,
          verse: randomFallback.verse,
          text: randomFallback.text,
          reference: `${randomFallback.book} ${randomFallback.chapter}:${randomFallback.verse}`
        });
      }
      
      // Get random verse from the fetched verses
      const randomVerse = verses[Math.floor(Math.random() * verses.length)];
      
      res.json({
        faith: randomVerse.religion,
        book: randomVerse.book,
        chapter: randomVerse.chapter,
        verse: randomVerse.verse,
        text: randomVerse.text,
        reference: `${randomVerse.book} ${randomVerse.chapter}:${randomVerse.verse}`
      });
    } catch (error) {
      console.error("Random verse error:", error);
      res.status(500).json({ error: "Failed to fetch random verse" });
    }
  });

  // Generate AI insight for a verse
  app.post("/api/scholar/explain", async (req, res) => {
    try {
      const { reference, text, faith } = req.body;
      
      if (!reference || !text) {
        return res.status(400).json({ error: "Reference and text are required" });
      }
      
      const prompt = `You are a scholarly expert in religious texts. Provide a concise, insightful explanation (1-2 sentences) of the following verse, emphasizing its key theme and practical application. Keep it respectful and accessible.

Verse: "${text}"
Reference: ${reference}
Faith tradition: ${faith || 'Unknown'}

Focus on the universal wisdom and practical guidance this verse offers.`;

      const response = await generateScriptureResponse(prompt);
      
      res.json({
        insight: response
      });
    } catch (error) {
      console.error("AI insight error:", error);
      res.status(500).json({ error: "Failed to generate insight" });
    }
  });

  // ElevenLabs voice routes
  let elevenLabsService: ElevenLabsService | null = null;
  
  try {
    elevenLabsService = new ElevenLabsService();
  } catch (error) {
    console.warn("ElevenLabs service not available:", error);
  }

  // Get available ElevenLabs voices
  app.get("/api/elevenlabs/voices", async (req, res) => {
    try {
      if (!elevenLabsService) {
        return res.status(503).json({ error: "ElevenLabs service not available" });
      }

      const voices = await elevenLabsService.getVoices();
      console.log('Raw voices data:', voices.slice(0, 3)); // Log first 3 voices for debugging
      const maleVoices = elevenLabsService.getRecommendedMaleVoices(voices);
      console.log('Filtered male voices:', maleVoices.length);
      
      res.json({
        allVoices: voices,
        recommendedMaleVoices: maleVoices
      });
    } catch (error) {
      console.error("Error fetching ElevenLabs voices:", error);
      res.status(500).json({ error: "Failed to fetch voices" });
    }
  });

  // Generate speech using ElevenLabs
  app.post("/api/elevenlabs/speak", async (req, res) => {
    try {
      if (!elevenLabsService) {
        return res.status(503).json({ error: "ElevenLabs service not available" });
      }

      const { text, voiceId, settings } = req.body;
      
      if (!text || !voiceId) {
        return res.status(400).json({ error: "Text and voiceId are required" });
      }

      const audioBuffer = await elevenLabsService.generateSpeech(text, voiceId, settings);
      
      res.set({
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.length,
        'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
      });
      
      res.send(audioBuffer);
    } catch (error) {
      console.error("Error generating speech:", error);
      res.status(500).json({ error: "Failed to generate speech" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
