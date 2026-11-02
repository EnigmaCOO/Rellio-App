import { Router } from "express";
import { db } from "../../db";
import {
  communityCircles, circleMembers, communityPosts, communityReplies,
  communityReactions, communityReports, users,
  createPostBodySchema, createReplyBodySchema, reportBodySchema,
} from "@shared/schema";
import { eq, desc, and, sql } from "drizzle-orm";

// ─── Auth helper ──────────────────────────────────────────────────────────────

function requireAuth(req: any, res: any): string | null {
  const userId = req.session?.userId ?? req.userId;
  if (!userId || req.session?.isGuest) {
    res.status(401).json({ error: "Authentication required" });
    return null;
  }
  return userId;
}

// ─── Post enrichment: attach author display name ──────────────────────────────

async function enrichPost(post: any, currentUserId?: string) {
  const author = await db.select({
    username: users.username,
    firstName: users.firstName,
    lastName: users.lastName,
    profileImageUrl: users.profileImageUrl,
  }).from(users).where(eq(users.id, post.userId)).limit(1);

  const a = author[0];
  const displayName = a?.firstName
    ? `${a.firstName}${a.lastName ? " " + a.lastName : ""}`
    : a?.username ?? "Seeker";

  let hasReacted = false;
  if (currentUserId) {
    const r = await db.select().from(communityReactions)
      .where(and(eq(communityReactions.postId, post.id), eq(communityReactions.userId, currentUserId)))
      .limit(1);
    hasReacted = r.length > 0;
  }

  return { ...post, authorName: displayName, authorUsername: a?.username, authorAvatar: a?.profileImageUrl, hasReacted };
}

// ─── Router ───────────────────────────────────────────────────────────────────

export function createCommunityRouter() {
  const router = Router();

  // ── GET /circles — list all circles with join status ─────────────────────
  router.get("/circles", async (req: any, res) => {
    try {
      const circles = await db.select().from(communityCircles)
        .where(eq(communityCircles.isPublic, 1))
        .orderBy(desc(communityCircles.memberCount));

      const userId = req.session?.userId;
      if (!userId || req.session?.isGuest) {
        return res.json(circles.map(c => ({ ...c, isJoined: false })));
      }

      const memberships = await db.select({ circleId: circleMembers.circleId })
        .from(circleMembers).where(eq(circleMembers.userId, userId));
      const joinedIds = new Set(memberships.map(m => m.circleId));

      res.json(circles.map(c => ({ ...c, isJoined: joinedIds.has(c.id) })));
    } catch (err) {
      console.error("Get circles error:", err);
      res.status(500).json({ error: "Failed to get circles" });
    }
  });

  // ── POST /circles/:id/join — join or leave a circle ───────────────────────
  router.post("/circles/:id/join", async (req: any, res) => {
    const userId = requireAuth(req, res);
    if (!userId) return;
    try {
      const circleId = parseInt(req.params.id);
      if (isNaN(circleId)) return res.status(400).json({ error: "Invalid id" });

      const existing = await db.select().from(circleMembers)
        .where(and(eq(circleMembers.circleId, circleId), eq(circleMembers.userId, userId)))
        .limit(1);

      if (existing.length > 0) {
        // Leave
        await db.delete(circleMembers)
          .where(and(eq(circleMembers.circleId, circleId), eq(circleMembers.userId, userId)));
        await db.update(communityCircles)
          .set({ memberCount: sql`GREATEST(member_count - 1, 0)` })
          .where(eq(communityCircles.id, circleId));
        return res.json({ joined: false });
      }

      // Join
      await db.insert(circleMembers).values({ circleId, userId });
      await db.update(communityCircles)
        .set({ memberCount: sql`member_count + 1` })
        .where(eq(communityCircles.id, circleId));
      res.json({ joined: true });
    } catch (err) {
      console.error("Join circle error:", err);
      res.status(500).json({ error: "Failed to join circle" });
    }
  });

  // ── GET /posts — community feed (general + circle-specific) ──────────────
  router.get("/posts", async (req: any, res) => {
    try {
      const circleId = req.query.circleId ? parseInt(req.query.circleId as string) : null;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
      const userId = req.session?.isGuest ? undefined : req.session?.userId;

      let query = db.select().from(communityPosts)
        .where(eq(communityPosts.isHidden, 0))
        .orderBy(desc(communityPosts.createdAt))
        .limit(limit);

      if (circleId) {
        query = db.select().from(communityPosts)
          .where(and(eq(communityPosts.circleId, circleId), eq(communityPosts.isHidden, 0)))
          .orderBy(desc(communityPosts.createdAt))
          .limit(limit);
      }

      const posts = await query;
      const enriched = await Promise.all(posts.map(p => enrichPost(p, userId)));
      res.json(enriched);
    } catch (err) {
      console.error("Get posts error:", err);
      res.status(500).json({ error: "Failed to get posts" });
    }
  });

  // ── POST /posts — create a post ───────────────────────────────────────────
  router.post("/posts", async (req: any, res) => {
    const userId = requireAuth(req, res);
    if (!userId) return;
    try {
      const body = createPostBodySchema.parse(req.body);
      const [post] = await db.insert(communityPosts).values({ ...body, userId }).returning();
      const enriched = await enrichPost(post, userId);
      res.status(201).json(enriched);
    } catch (err) {
      console.error("Create post error:", err);
      res.status(400).json({ error: "Failed to create post" });
    }
  });

  // ── DELETE /posts/:id — delete own post ───────────────────────────────────
  router.delete("/posts/:id", async (req: any, res) => {
    const userId = requireAuth(req, res);
    if (!userId) return;
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
      await db.delete(communityPosts)
        .where(and(eq(communityPosts.id, id), eq(communityPosts.userId, userId)));
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete post" });
    }
  });

  // ── GET /posts/:id/replies ─────────────────────────────────────────────────
  router.get("/posts/:id/replies", async (req: any, res) => {
    try {
      const postId = parseInt(req.params.id);
      if (isNaN(postId)) return res.status(400).json({ error: "Invalid id" });

      const replies = await db.select().from(communityReplies)
        .where(and(eq(communityReplies.postId, postId), eq(communityReplies.isHidden, 0)))
        .orderBy(communityReplies.createdAt);

      const enriched = await Promise.all(replies.map(async (reply) => {
        const author = await db.select({
          username: users.username, firstName: users.firstName, lastName: users.lastName,
        }).from(users).where(eq(users.id, reply.userId)).limit(1);
        const a = author[0];
        const authorName = a?.firstName ? `${a.firstName}${a.lastName ? " " + a.lastName : ""}` : a?.username ?? "Seeker";
        return { ...reply, authorName, authorUsername: a?.username };
      }));

      res.json(enriched);
    } catch (err) {
      res.status(500).json({ error: "Failed to get replies" });
    }
  });

  // ── POST /posts/:id/replies — add a reply ─────────────────────────────────
  router.post("/posts/:id/replies", async (req: any, res) => {
    const userId = requireAuth(req, res);
    if (!userId) return;
    try {
      const postId = parseInt(req.params.id);
      if (isNaN(postId)) return res.status(400).json({ error: "Invalid id" });

      const { content } = createReplyBodySchema.parse(req.body);
      const [reply] = await db.insert(communityReplies).values({ postId, userId, content }).returning();

      // Increment replyCount on post
      await db.update(communityPosts)
        .set({ replyCount: sql`reply_count + 1` })
        .where(eq(communityPosts.id, postId));

      const author = await db.select({ username: users.username, firstName: users.firstName, lastName: users.lastName })
        .from(users).where(eq(users.id, userId)).limit(1);
      const a = author[0];
      const authorName = a?.firstName ? `${a.firstName}${a.lastName ? " " + a.lastName : ""}` : a?.username ?? "Seeker";

      res.status(201).json({ ...reply, authorName, authorUsername: a?.username });
    } catch (err) {
      console.error("Create reply error:", err);
      res.status(400).json({ error: "Failed to add reply" });
    }
  });

  // ── POST /posts/:id/react — toggle appreciation ───────────────────────────
  router.post("/posts/:id/react", async (req: any, res) => {
    const userId = requireAuth(req, res);
    if (!userId) return;
    try {
      const postId = parseInt(req.params.id);
      if (isNaN(postId)) return res.status(400).json({ error: "Invalid id" });

      const existing = await db.select().from(communityReactions)
        .where(and(eq(communityReactions.postId, postId), eq(communityReactions.userId, userId)))
        .limit(1);

      if (existing.length > 0) {
        await db.delete(communityReactions)
          .where(and(eq(communityReactions.postId, postId), eq(communityReactions.userId, userId)));
        await db.update(communityPosts)
          .set({ reactionCount: sql`GREATEST(reaction_count - 1, 0)` })
          .where(eq(communityPosts.id, postId));
        return res.json({ reacted: false });
      }

      await db.insert(communityReactions).values({ postId, userId });
      await db.update(communityPosts)
        .set({ reactionCount: sql`reaction_count + 1` })
        .where(eq(communityPosts.id, postId));
      res.json({ reacted: true });
    } catch (err) {
      console.error("React error:", err);
      res.status(500).json({ error: "Failed to toggle reaction" });
    }
  });

  // ── POST /posts/:id/report — report a post ────────────────────────────────
  router.post("/posts/:id/report", async (req: any, res) => {
    const userId = requireAuth(req, res);
    if (!userId) return;
    try {
      const postId = parseInt(req.params.id);
      if (isNaN(postId)) return res.status(400).json({ error: "Invalid id" });

      const { reason, replyId } = reportBodySchema.parse(req.body);
      await db.insert(communityReports).values({ postId, replyId, userId, reason });
      await db.update(communityPosts)
        .set({ reportCount: sql`report_count + 1` })
        .where(eq(communityPosts.id, postId));

      // Auto-hide if 3+ reports
      const [post] = await db.select({ reportCount: communityPosts.reportCount })
        .from(communityPosts).where(eq(communityPosts.id, postId)).limit(1);
      if ((post?.reportCount ?? 0) >= 3) {
        await db.update(communityPosts).set({ isHidden: 1 }).where(eq(communityPosts.id, postId));
      }

      res.json({ success: true });
    } catch (err) {
      console.error("Report error:", err);
      res.status(500).json({ error: "Failed to submit report" });
    }
  });

  return router;
}
