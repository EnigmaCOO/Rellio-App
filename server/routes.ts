import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { generateScriptureResponse } from "./services/openai";
import { getReligionConfig, getAvailableReligions } from "./services/scripture";
import { fetchScriptureContent } from "./services/externalScripture";
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
      const religionData = religions.map(religion => ({
        id: religion,
        name: getReligionConfig(religion).name,
        books: getReligionConfig(religion).books.map(book => book.name)
      }));
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
      
      // Save user message
      const userMessage = await storage.createChatMessage({
        sessionId,
        type: 'user',
        content: message,
        context: context || null
      });

      // Generate AI response
      let scriptureContext;
      if (context) {
        const verses = await storage.getScriptures(context.religion, context.book, context.chapter);
        scriptureContext = {
          religion: context.religion,
          book: context.book,
          chapter: context.chapter,
          verses: verses.map(v => ({ number: v.verse, text: v.text }))
        };
      }

      const aiResponse = await generateScriptureResponse(message, scriptureContext);
      
      // Save AI response
      const aiMessage = await storage.createChatMessage({
        sessionId,
        type: 'ai',
        content: aiResponse,
        context: context || null
      });

      res.json({ userMessage, aiMessage });
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

  const httpServer = createServer(app);
  return httpServer;
}
