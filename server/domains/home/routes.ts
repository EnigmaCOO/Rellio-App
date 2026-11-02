import { Router } from "express";
import { storage } from "../../storage";

export function createHomeRouter() {
  const router = Router();

  router.get("/dashboard", async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      const isGuest = !userId;

      if (isGuest) {
        return res.json({
          activeSession: null,
          journey: null,
          bookmarks: [],
          isGuest: true,
        });
      }

      const [activeSession, journey, bookmarks] = await Promise.all([
        storage.getActiveReadingSession(userId),
        storage.getSpiritualJourney(userId),
        storage.getUserBookmarks(userId),
      ]);

      res.json({
        activeSession: activeSession
          ? {
              id: activeSession.id,
              religion: activeSession.religion,
              book: activeSession.book,
              chapter: activeSession.chapter,
              startTime: activeSession.startTime,
            }
          : null,
        journey: journey
          ? {
              totalReadingSessions: journey.totalReadingSessions,
              totalTimeMinutes: journey.totalTimeMinutes,
              currentStreak: journey.currentStreak,
              longestStreak: journey.longestStreak,
              lastActiveDate: journey.lastActiveDate,
            }
          : null,
        bookmarks: bookmarks.slice(0, 5),
        isGuest: false,
      });
    } catch (err) {
      console.error("Home dashboard error:", err);
      res.status(500).json({ error: "Failed to load home dashboard" });
    }
  });

  return router;
}
