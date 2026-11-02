import { Router } from "express";
import { storage } from "../../storage";
import { insertVerseNoteSchema } from "@shared/schema";
import { z } from "zod";

export function createNotesRouter() {
  const router = Router();

  router.get("/", async (req: any, res) => {
    try {
      if (!req.session?.userId) return res.status(401).json({ error: "Authentication required" });
      const notes = await storage.getUserNotes(req.session.userId);
      res.json(notes);
    } catch (err) {
      res.status(500).json({ error: "Failed to get notes" });
    }
  });

  router.get("/chapter", async (req: any, res) => {
    try {
      if (!req.session?.userId) return res.status(401).json({ error: "Authentication required" });
      const { religion, book, chapter } = req.query;
      if (!religion || !book || !chapter) return res.status(400).json({ error: "Missing params" });
      const notes = await storage.getChapterNotes(req.session.userId, religion as string, book as string, Number(chapter));
      res.json(notes);
    } catch (err) {
      res.status(500).json({ error: "Failed to get notes" });
    }
  });

  router.post("/", async (req: any, res) => {
    try {
      if (!req.session?.userId) return res.status(401).json({ error: "Authentication required" });
      const body = insertVerseNoteSchema.parse({ ...req.body, userId: req.session.userId });
      const existing = await storage.getNoteByVerse(req.session.userId, body.religion, body.book, body.chapter, body.verse);
      if (existing) {
        const updated = await storage.updateNote(existing.id, req.session.userId, body.text);
        return res.json(updated);
      }
      const note = await storage.createNote(body);
      res.status(201).json(note);
    } catch (err) {
      res.status(400).json({ error: "Failed to save note" });
    }
  });

  router.delete("/:id", async (req: any, res) => {
    try {
      if (!req.session?.userId) return res.status(401).json({ error: "Authentication required" });
      await storage.deleteNote(Number(req.params.id), req.session.userId);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete note" });
    }
  });

  return router;
}
