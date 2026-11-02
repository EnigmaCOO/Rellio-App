import { Router } from "express";
import { storage } from "../../storage";
import { insertBookmarkSchema } from "@shared/schema";

export function createBookmarksRouter() {
  const router = Router();

  router.get("/", async (req: any, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: "Authentication required" });
      }
      const bks = await storage.getUserBookmarks(req.session.userId);
      res.json(bks);
    } catch (err) {
      console.error("Get bookmarks error:", err);
      res.status(500).json({ error: "Failed to get bookmarks" });
    }
  });

  router.post("/", async (req: any, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: "Authentication required" });
      }
      const userId = req.session.userId;
      const body = insertBookmarkSchema.parse({ ...req.body, userId });

      const existing = await storage.getBookmarkByVerse(
        userId,
        body.religion,
        body.book,
        body.chapter,
        body.verse,
      );
      if (existing) {
        return res.json(existing);
      }

      const bookmark = await storage.createBookmark(body);
      res.status(201).json(bookmark);
    } catch (err) {
      console.error("Create bookmark error:", err);
      res.status(400).json({ error: "Failed to create bookmark" });
    }
  });

  router.delete("/:id", async (req: any, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: "Authentication required" });
      }
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
      await storage.deleteBookmark(id, req.session.userId);
      res.json({ success: true });
    } catch (err) {
      console.error("Delete bookmark error:", err);
      res.status(500).json({ error: "Failed to delete bookmark" });
    }
  });

  return router;
}
