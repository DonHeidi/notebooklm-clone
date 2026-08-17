import { and, desc, eq } from "drizzle-orm";
import type { Database } from "../db";
import { notebooks } from "../db/schema";
import { NotFoundError } from "./errors";

// Repository pattern: all data access goes through a repository. Route
// handlers and server components never touch the db directly — they call a
// repository (optionally via a business-layer service).
//
// Authorization is enforced here: every method takes the owner id and scopes
// its queries by it (RLS is defense-in-depth only, see supabase/migrations).

export type Notebook = typeof notebooks.$inferSelect;

export function createNotebookRepository(database: Database) {
  return {
    async findByOwner(ownerId: string): Promise<Notebook[]> {
      return database
        .select()
        .from(notebooks)
        .where(eq(notebooks.ownerId, ownerId))
        .orderBy(desc(notebooks.updatedAt));
    },

    async findById(id: string, ownerId: string): Promise<Notebook | undefined> {
      const [notebook] = await database
        .select()
        .from(notebooks)
        .where(and(eq(notebooks.id, id), eq(notebooks.ownerId, ownerId)))
        .limit(1);
      return notebook;
    },

    async create(ownerId: string, title: string): Promise<Notebook> {
      const [created] = await database
        .insert(notebooks)
        .values({ ownerId, title })
        .returning();
      return created;
    },

    async rename(id: string, ownerId: string, title: string): Promise<Notebook> {
      const [updated] = await database
        .update(notebooks)
        .set({ title, updatedAt: new Date() })
        .where(and(eq(notebooks.id, id), eq(notebooks.ownerId, ownerId)))
        .returning();
      if (!updated) {
        throw new NotFoundError("notebook not found");
      }
      return updated;
    },

    async delete(id: string, ownerId: string): Promise<void> {
      const deleted = await database
        .delete(notebooks)
        .where(and(eq(notebooks.id, id), eq(notebooks.ownerId, ownerId)))
        .returning({ id: notebooks.id });
      if (deleted.length === 0) {
        throw new NotFoundError("notebook not found");
      }
    },
  };
}

export type NotebookRepository = ReturnType<typeof createNotebookRepository>;
