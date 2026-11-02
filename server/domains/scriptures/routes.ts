/**
 * Scriptures domain routes — /api/v1/scriptures
 *
 * Thin wrappers over the existing scripture service layer, establishing the
 * /api/v1 namespace. Heavy logic remains in server/services/scripture.ts and
 * server/services/externalScripture.ts.
 */

import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { religionSchema } from "@shared/schema";

const fetchSchema = z.object({
  religion: religionSchema,
  book: z.string(),
  chapter: z.coerce.number().int().positive(),
});

export function createScripturesRouter(): Router {
  const router = Router();

  // v1 scripture fetch — mirrors GET /api/scriptures
  router.get("/", async (req: Request, res: Response) => {
    const result = fetchSchema.safeParse(req.query);
    if (!result.success) {
      return res.status(400).json({ error: "Invalid query params", details: result.error.errors });
    }
    // Forward to legacy handler by redirecting internally
    const { religion, book, chapter } = result.data;
    res.redirect(
      `/api/scriptures?religion=${encodeURIComponent(religion)}&book=${encodeURIComponent(book)}&chapter=${chapter}`,
    );
  });

  return router;
}
