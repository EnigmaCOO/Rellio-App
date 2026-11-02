import { db } from "../db";
import { bookProgress, bookBookmarks, bookAnnotations } from "@shared/schema";
import type {
  BookProgress,
  InsertBookProgress,
  BookBookmark,
  InsertBookBookmark,
  BookAnnotation,
  InsertBookAnnotation,
} from "@shared/schema";
import { and, eq, desc } from "drizzle-orm";

export const libraryStorage = {
  async getProgress(userId: string, bookId: string): Promise<BookProgress | undefined> {
    const rows = await db
      .select()
      .from(bookProgress)
      .where(and(eq(bookProgress.userId, userId), eq(bookProgress.bookId, bookId)))
      .limit(1);
    return rows[0];
  },

  async getAllProgress(userId: string): Promise<BookProgress[]> {
    return db
      .select()
      .from(bookProgress)
      .where(eq(bookProgress.userId, userId))
      .orderBy(desc(bookProgress.updatedAt));
  },

  async upsertProgress(data: InsertBookProgress): Promise<BookProgress> {
    const existing = await this.getProgress(data.userId, data.bookId);
    if (existing) {
      const [updated] = await db
        .update(bookProgress)
        .set({ cfi: data.cfi ?? null, percentage: data.percentage ?? 0, updatedAt: new Date() })
        .where(eq(bookProgress.id, existing.id))
        .returning();
      return updated;
    }
    const [created] = await db.insert(bookProgress).values(data).returning();
    return created;
  },

  async listBookmarks(userId: string, bookId: string): Promise<BookBookmark[]> {
    return db
      .select()
      .from(bookBookmarks)
      .where(and(eq(bookBookmarks.userId, userId), eq(bookBookmarks.bookId, bookId)))
      .orderBy(desc(bookBookmarks.createdAt));
  },

  async createBookmark(data: InsertBookBookmark): Promise<BookBookmark> {
    const [row] = await db.insert(bookBookmarks).values(data).returning();
    return row;
  },

  async deleteBookmark(id: number, userId: string): Promise<void> {
    await db
      .delete(bookBookmarks)
      .where(and(eq(bookBookmarks.id, id), eq(bookBookmarks.userId, userId)));
  },

  async listAnnotations(userId: string, bookId: string): Promise<BookAnnotation[]> {
    return db
      .select()
      .from(bookAnnotations)
      .where(and(eq(bookAnnotations.userId, userId), eq(bookAnnotations.bookId, bookId)))
      .orderBy(desc(bookAnnotations.createdAt));
  },

  async createAnnotation(data: InsertBookAnnotation): Promise<BookAnnotation> {
    const [row] = await db.insert(bookAnnotations).values(data).returning();
    return row;
  },

  async updateAnnotation(
    id: number,
    userId: string,
    updates: Partial<Pick<BookAnnotation, "color" | "note">>,
  ): Promise<BookAnnotation | undefined> {
    const [row] = await db
      .update(bookAnnotations)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(bookAnnotations.id, id), eq(bookAnnotations.userId, userId)))
      .returning();
    return row;
  },

  async deleteAnnotation(id: number, userId: string): Promise<void> {
    await db
      .delete(bookAnnotations)
      .where(and(eq(bookAnnotations.id, id), eq(bookAnnotations.userId, userId)));
  },
};
