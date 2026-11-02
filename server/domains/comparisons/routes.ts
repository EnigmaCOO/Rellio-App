import { Router } from "express";
import { z } from "zod";
import { storage } from "../../storage";
import { runStructuredComparison } from "../../services/compareScripture";

const runSchema = z.object({
  theme: z.string().min(1).max(100),
  faiths: z.array(z.string().min(1)).min(2).max(5),
  verseContext: z.object({
    faith: z.string(),
    book: z.string(),
    chapter: z.number(),
    verse: z.number(),
    text: z.string(),
  }).optional(),
});

const saveSchema = z.object({
  theme: z.string().min(1).max(100),
  faiths: z.array(z.string().min(1)).min(2).max(5),
  result: z.record(z.unknown()),
});

export function createComparisonsRouter() {
  const router = Router();

  // POST /api/v1/comparisons/run  — no auth required
  router.post("/run", async (req, res) => {
    try {
      const body = runSchema.parse(req.body);
      const result = await runStructuredComparison(body);
      res.json(result);
    } catch (err: any) {
      if (err?.name === "ZodError") return res.status(400).json({ error: "Invalid request", details: err.errors });
      console.error("Comparison run error:", err);
      res.status(500).json({ error: "Failed to run comparison" });
    }
  });

  // GET /api/v1/comparisons  — auth required
  router.get("/", async (req: any, res) => {
    try {
      if (!req.session?.userId) return res.status(401).json({ error: "Authentication required" });
      const list = await storage.getUserComparisons(req.session.userId);
      res.json(list);
    } catch (err) {
      res.status(500).json({ error: "Failed to get comparisons" });
    }
  });

  // POST /api/v1/comparisons  — auth required
  router.post("/", async (req: any, res) => {
    try {
      if (!req.session?.userId) return res.status(401).json({ error: "Authentication required" });
      const body = saveSchema.parse(req.body);
      const saved = await storage.saveComparison({
        userId: req.session.userId,
        theme: body.theme,
        faiths: body.faiths,
        result: body.result,
      });
      res.status(201).json(saved);
    } catch (err: any) {
      if (err?.name === "ZodError") return res.status(400).json({ error: "Invalid request", details: err.errors });
      res.status(500).json({ error: "Failed to save comparison" });
    }
  });

  // DELETE /api/v1/comparisons/:id  — auth required
  router.delete("/:id", async (req: any, res) => {
    try {
      if (!req.session?.userId) return res.status(401).json({ error: "Authentication required" });
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
      await storage.deleteComparison(id, req.session.userId);
      res.status(204).end();
    } catch (err) {
      res.status(500).json({ error: "Failed to delete comparison" });
    }
  });

  return router;
}
