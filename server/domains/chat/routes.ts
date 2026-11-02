/**
 * Chat domain routes — /api/v1/chat
 *
 * Establishes the /api/v1 namespace for chat. Heavy logic lives in the
 * legacy /api/chat routes. This module will absorb the logic incrementally.
 */

import { Router, type Request, type Response } from "express";

export function createChatRouter(): Router {
  const router = Router();

  // v1 chat — proxies to legacy /api/chat
  router.post("/", (req: Request, res: Response) => {
    res.redirect(307, "/api/chat");
  });

  // v1 session history — mirrors GET /api/chat/:sessionId
  router.get("/:sessionId", (req: Request, res: Response) => {
    res.redirect(`/api/chat/${req.params.sessionId}`);
  });

  return router;
}
