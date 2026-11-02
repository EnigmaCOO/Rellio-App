// Sacred Map authoring — admin-only HTTP surface.
//
// Endpoints (mounted at /api/v1/sacred-map-authoring):
//   POST   /drafts            generate a draft for an event (grounded + verified)
//   GET    /drafts            list drafts for review
//   GET    /drafts/:id        fetch one draft
//   PATCH  /drafts/:id        move review_status forward (NEVER to "published")
//
// Drafts are always written as review_status:"draft_unreviewed". The PATCH
// endpoint only accepts review-workflow statuses; "published" is rejected, so
// nothing ever goes live without a human acting outside this pipeline.

import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { db } from "../../db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { generateDraft } from "./service";
import { getDraft, listDrafts, updateDraftStatus } from "./store";
import type { DraftReviewStatus } from "./types";

const REVIEW_STATUSES: DraftReviewStatus[] = [
  "draft_unreviewed",
  "in_review",
  "scholar_reviewed",
];

// Admin gate. In production an explicit allowlist (AUTHORING_ADMIN_EMAILS) is
// required; in development, when no allowlist is set, access is open so the
// pipeline is easy to run locally.
type AdminRequest = Request & {
  session?: { userId?: string; isGuest?: boolean } | null;
  userId?: string;
};

async function requireAuthoringAdmin(req: AdminRequest, res: Response): Promise<boolean> {
  const isProd = process.env.NODE_ENV === "production";
  const allow = (process.env.AUTHORING_ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  if (!isProd && allow.length === 0) return true;

  const userId = req.session?.userId ?? req.userId;
  if (!userId || req.session?.isGuest) {
    res.status(401).json({ error: "Authentication required" });
    return false;
  }
  if (allow.length === 0) {
    res.status(403).json({ error: "Authoring admin not configured (set AUTHORING_ADMIN_EMAILS)" });
    return false;
  }
  try {
    const rows = await db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    const email = (rows[0]?.email || "").toLowerCase();
    if (!email || !allow.includes(email)) {
      res.status(403).json({ error: "Forbidden" });
      return false;
    }
    return true;
  } catch {
    res.status(500).json({ error: "Admin check failed" });
    return false;
  }
}

const generateBodySchema = z.object({
  eventId: z.string().min(1),
  candidates: z
    .array(
      z.object({
        tradition: z.string().min(1),
        work: z.string().optional(),
        citation: z.string().min(1),
        locator: z.record(z.union([z.string(), z.number()])),
        source_system: z.string().min(1),
        role: z.string().optional(),
        note: z.string().optional(),
      }),
    )
    .optional(),
});

const statusBodySchema = z.object({
  review_status: z.enum(["draft_unreviewed", "in_review", "scholar_reviewed"]),
});

export function createSacredMapAuthoringRouter(): Router {
  const router = Router();

  router.post("/drafts", async (req, res) => {
    if (!(await requireAuthoringAdmin(req, res))) return;
    const parsed = generateBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
    }
    const result = await generateDraft(parsed.data.eventId, parsed.data.candidates);
    if (!result.ok) {
      const status =
        result.code === "not_found"
          ? 404
          : result.code === "no_api_key"
            ? 503
            : result.code === "no_candidates"
              ? 422
              : 502;
      return res.status(status).json({ error: result.message, code: result.code });
    }
    return res.status(201).json(result.draft);
  });

  router.get("/drafts", async (req, res) => {
    if (!(await requireAuthoringAdmin(req, res))) return;
    const drafts = await listDrafts();
    // Summary view for the admin list.
    return res.json(
      drafts.map((d) => ({
        id: d.id,
        event_id: d.event_id,
        event_title: d.event_title,
        religion_id: d.religion_id,
        review_status: d.review_status,
        generated_at: d.generated_at,
        section_count: d.story.sections.length,
        reference_count: d.references.length,
        flag_count: d.flags.length,
      })),
    );
  });

  router.get("/drafts/:id", async (req, res) => {
    if (!(await requireAuthoringAdmin(req, res))) return;
    const draft = await getDraft(req.params.id);
    if (!draft) return res.status(404).json({ error: "Draft not found" });
    return res.json(draft);
  });

  router.patch("/drafts/:id", async (req, res) => {
    if (!(await requireAuthoringAdmin(req, res))) return;
    // Guard against publishing through this API even if a client tries.
    if (req.body?.review_status === "published") {
      return res.status(400).json({
        error: "Cannot publish through the authoring API. Publishing is a separate human step.",
      });
    }
    const parsed = statusBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: `review_status must be one of: ${REVIEW_STATUSES.join(", ")}`,
      });
    }
    const updated = await updateDraftStatus(req.params.id, parsed.data.review_status);
    if (!updated) return res.status(404).json({ error: "Draft not found" });
    return res.json(updated);
  });

  return router;
}
