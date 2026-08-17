import { and, asc, eq, exists, sql } from "drizzle-orm";
import type { Database } from "../db";
import { notebooks, notes } from "../db/schema";
import { NotFoundError } from "./errors";
import { assertNotebookOwnership } from "./notebook-access";

export type Note = typeof notes.$inferSelect;

export type NewNoteInput = {
  notebookId: string;
  title: string;
  content: string;
  // Present when saving an assistant response as a note (CF-10).
  sourceMessageId?: string;
};

export type NotePatch = Partial<Pick<Note, "title" | "content">>;

export function createNoteRepository(database: Database) {
  const ownedByCaller = (ownerId: string) =>
    exists(
      database
        .select({ one: sql`1` })
        .from(notebooks)
        .where(
          and(eq(notebooks.id, notes.notebookId), eq(notebooks.ownerId, ownerId)),
        ),
    );

  return {
    async create(ownerId: string, input: NewNoteInput): Promise<Note> {
      await assertNotebookOwnership(database, input.notebookId, ownerId);
      const [created] = await database.insert(notes).values(input).returning();
      return created;
    },

    async listByNotebook(notebookId: string, ownerId: string): Promise<Note[]> {
      await assertNotebookOwnership(database, notebookId, ownerId);
      return database
        .select()
        .from(notes)
        .where(eq(notes.notebookId, notebookId))
        .orderBy(asc(notes.createdAt));
    },

    async findById(id: string, ownerId: string): Promise<Note | undefined> {
      const [row] = await database
        .select({ note: notes })
        .from(notes)
        .innerJoin(notebooks, eq(notebooks.id, notes.notebookId))
        .where(and(eq(notes.id, id), eq(notebooks.ownerId, ownerId)))
        .limit(1);
      return row?.note;
    },

    async update(id: string, ownerId: string, patch: NotePatch): Promise<Note> {
      const [updated] = await database
        .update(notes)
        .set({ ...patch, updatedAt: new Date() })
        .where(and(eq(notes.id, id), ownedByCaller(ownerId)))
        .returning();
      if (!updated) {
        throw new NotFoundError("note not found");
      }
      return updated;
    },

    async delete(id: string, ownerId: string): Promise<void> {
      const deleted = await database
        .delete(notes)
        .where(and(eq(notes.id, id), ownedByCaller(ownerId)))
        .returning({ id: notes.id });
      if (deleted.length === 0) {
        throw new NotFoundError("note not found");
      }
    },
  };
}

export type NoteRepository = ReturnType<typeof createNoteRepository>;
