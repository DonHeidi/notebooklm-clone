import { eq } from "drizzle-orm";
import { db, type Database } from "../db";
import { notebooks } from "../db/schema";

// Repository pattern: all data access goes through a repository. Route
// handlers and server components never touch `db` directly — they call a
// repository (optionally via a business-layer service).

export type Notebook = typeof notebooks.$inferSelect;
export type NewNotebook = typeof notebooks.$inferInsert;

export function createNotebookRepository(database: Database = db) {
  return {
    async findByOwner(ownerId: string): Promise<Notebook[]> {
      return database
        .select()
        .from(notebooks)
        .where(eq(notebooks.ownerId, ownerId));
    },

    async create(input: NewNotebook): Promise<Notebook> {
      const [created] = await database.insert(notebooks).values(input).returning();
      return created;
    },
  };
}

export type NotebookRepository = ReturnType<typeof createNotebookRepository>;
