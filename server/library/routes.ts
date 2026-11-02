import { Router } from "express";
import * as fs from "fs";
import { loadCatalog, getBook, bookFilePath } from "./catalog";
import { libraryStorage } from "./storage";
import {
  insertBookProgressSchema,
  insertBookBookmarkSchema,
  insertBookAnnotationSchema,
} from "@shared/schema";

function requireAuth(req: any, res: any): string | null {
  const userId = req.session?.userId;
  if (!userId) {
    res.status(401).json({ error: "Authentication required" });
    return null;
  }
  return userId;
}

export function createLibraryRouter() {
  const router = Router();

  // Public: catalog
  router.get("/", (_req, res) => {
    res.json(loadCatalog());
  });

  // Public: stream EPUB binary (with byte-range support)
  router.get("/:id/file", (req, res) => {
    const filePath = bookFilePath(req.params.id);
    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).json({ error: "Book not found" });
    }
    const stat = fs.statSync(filePath);
    const range = req.headers.range;
    res.setHeader("Content-Type", "application/epub+zip");
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Cache-Control", "public, max-age=86400");

    if (range) {
      // RFC 7233: only single byte-range, e.g. "bytes=0-1023" or "bytes=0-"
      const m = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
      if (!m || (m[1] === "" && m[2] === "")) {
        res.setHeader("Content-Range", `bytes */${stat.size}`);
        return res.status(416).end();
      }
      let start: number;
      let end: number;
      if (m[1] === "") {
        // suffix range "bytes=-N"
        const suffix = parseInt(m[2], 10);
        if (!Number.isFinite(suffix) || suffix <= 0) {
          res.setHeader("Content-Range", `bytes */${stat.size}`);
          return res.status(416).end();
        }
        start = Math.max(0, stat.size - suffix);
        end = stat.size - 1;
      } else {
        start = parseInt(m[1], 10);
        end = m[2] === "" ? stat.size - 1 : parseInt(m[2], 10);
      }
      if (
        !Number.isFinite(start) || !Number.isFinite(end) ||
        start < 0 || end < start || start >= stat.size
      ) {
        res.setHeader("Content-Range", `bytes */${stat.size}`);
        return res.status(416).end();
      }
      end = Math.min(end, stat.size - 1);
      const chunkSize = end - start + 1;
      res.status(206);
      res.setHeader("Content-Range", `bytes ${start}-${end}/${stat.size}`);
      res.setHeader("Content-Length", chunkSize);
      const stream = fs.createReadStream(filePath, { start, end });
      stream.on("error", () => { try { res.destroy(); } catch {} });
      stream.pipe(res);
    } else {
      res.setHeader("Content-Length", stat.size);
      const stream = fs.createReadStream(filePath);
      stream.on("error", () => { try { res.destroy(); } catch {} });
      stream.pipe(res);
    }
  });

  router.get("/:id", (req, res) => {
    const book = getBook(req.params.id);
    if (!book) return res.status(404).json({ error: "Book not found" });
    res.json(book);
  });

  // ── Reading progress ───────────────────────────────────────────────────────
  router.get("/progress/all", async (req: any, res) => {
    const userId = requireAuth(req, res); if (!userId) return;
    res.json(await libraryStorage.getAllProgress(userId));
  });

  router.get("/:id/progress", async (req: any, res) => {
    const userId = requireAuth(req, res); if (!userId) return;
    const p = await libraryStorage.getProgress(userId, req.params.id);
    res.json(p ?? null);
  });

  router.put("/:id/progress", async (req: any, res) => {
    const userId = requireAuth(req, res); if (!userId) return;
    try {
      const body = insertBookProgressSchema.parse({ ...req.body, userId, bookId: req.params.id });
      res.json(await libraryStorage.upsertProgress(body));
    } catch (e) {
      res.status(400).json({ error: "Invalid progress payload" });
    }
  });

  // ── Bookmarks ──────────────────────────────────────────────────────────────
  router.get("/:id/bookmarks", async (req: any, res) => {
    const userId = requireAuth(req, res); if (!userId) return;
    res.json(await libraryStorage.listBookmarks(userId, req.params.id));
  });

  router.post("/:id/bookmarks", async (req: any, res) => {
    const userId = requireAuth(req, res); if (!userId) return;
    try {
      const body = insertBookBookmarkSchema.parse({ ...req.body, userId, bookId: req.params.id });
      res.status(201).json(await libraryStorage.createBookmark(body));
    } catch (e) {
      res.status(400).json({ error: "Invalid bookmark payload" });
    }
  });

  router.delete("/:id/bookmarks/:bookmarkId", async (req: any, res) => {
    const userId = requireAuth(req, res); if (!userId) return;
    const bookmarkId = parseInt(req.params.bookmarkId, 10);
    if (isNaN(bookmarkId)) return res.status(400).json({ error: "Invalid id" });
    await libraryStorage.deleteBookmark(bookmarkId, userId);
    res.json({ success: true });
  });

  // ── Annotations (highlights + notes) ───────────────────────────────────────
  router.get("/:id/annotations", async (req: any, res) => {
    const userId = requireAuth(req, res); if (!userId) return;
    res.json(await libraryStorage.listAnnotations(userId, req.params.id));
  });

  router.post("/:id/annotations", async (req: any, res) => {
    const userId = requireAuth(req, res); if (!userId) return;
    try {
      const body = insertBookAnnotationSchema.parse({ ...req.body, userId, bookId: req.params.id });
      res.status(201).json(await libraryStorage.createAnnotation(body));
    } catch (e) {
      res.status(400).json({ error: "Invalid annotation payload" });
    }
  });

  router.patch("/:id/annotations/:annotationId", async (req: any, res) => {
    const userId = requireAuth(req, res); if (!userId) return;
    const annotationId = parseInt(req.params.annotationId, 10);
    if (isNaN(annotationId)) return res.status(400).json({ error: "Invalid id" });
    const updated = await libraryStorage.updateAnnotation(annotationId, userId, {
      color: req.body.color,
      note: req.body.note,
    });
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json(updated);
  });

  router.delete("/:id/annotations/:annotationId", async (req: any, res) => {
    const userId = requireAuth(req, res); if (!userId) return;
    const annotationId = parseInt(req.params.annotationId, 10);
    if (isNaN(annotationId)) return res.status(400).json({ error: "Invalid id" });
    await libraryStorage.deleteAnnotation(annotationId, userId);
    res.json({ success: true });
  });

  return router;
}
