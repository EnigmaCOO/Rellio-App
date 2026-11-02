import { Router } from "express";
import { storage } from "../../storage";
import { insertHighlightSchema } from "@shared/schema";

export function createHighlightsRouter() {
  const router = Router();

  router.get("/", async (req: any, res) => {
    try {
      if (!req.session?.userId) return res.status(401).json({ error: "Authentication required" });
      const items = await storage.getUserHighlights(req.session.userId);
      res.json(items);
    } catch (err) {
      res.status(500).json({ error: "Failed to get highlights" });
    }
  });

  router.get("/chapter", async (req: any, res) => {
    try {
      if (!req.session?.userId) return res.status(401).json({ error: "Authentication required" });
      const { religion, book, chapter } = req.query;
      if (!religion || !book || !chapter) return res.status(400).json({ error: "Missing params" });
      const items = await storage.getChapterHighlights(req.session.userId, religion as string, book as string, Number(chapter));
      res.json(items);
    } catch (err) {
      res.status(500).json({ error: "Failed to get highlights" });
    }
  });

  router.post("/", async (req: any, res) => {
    try {
      if (!req.session?.userId) return res.status(401).json({ error: "Authentication required" });
      const body = insertHighlightSchema.parse({ ...req.body, userId: req.session.userId });
      const existing = await storage.getHighlightByVerse(req.session.userId, body.religion, body.book, body.chapter, body.verse);
      if (existing) {
        const updated = await storage.updateHighlight(existing.id, req.session.userId, { color: body.color });
        return res.json(updated);
      }
      const highlight = await storage.createHighlight(body);
      res.status(201).json(highlight);
    } catch (err) {
      res.status(400).json({ error: "Failed to create highlight" });
    }
  });

  router.delete("/:id", async (req: any, res) => {
    try {
      if (!req.session?.userId) return res.status(401).json({ error: "Authentication required" });
      await storage.deleteHighlight(Number(req.params.id), req.session.userId);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete highlight" });
    }
  });

  return router;
}
