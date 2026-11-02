/**
 * Progress domain routes — /api/v1/progress
 *
 * Establishes the /api/v1 namespace for progress tracking. Heavy logic lives
 * in the legacy /api/progress routes. Absorb incrementally.
 */

import { Router, type Request, type Response } from "express";

export function createProgressRouter(): Router {
  const router = Router();

  // v1 journey stats — mirrors GET /api/progress/journey
  router.get("/journey", (req: Request, res: Response) => {
    res.redirect("/api/progress/journey");
  });

  // v1 start reading session
  router.post("/session/start", (req: Request, res: Response) => {
    res.redirect(307, "/api/progress/session/start");
  });

  // v1 end reading session
  router.patch("/session/:sessionId/end", (req: Request, res: Response) => {
    res.redirect(307, `/api/progress/session/${req.params.sessionId}/end`);
  });

  return router;
}
