import { and, asc, eq, exists, sql } from "drizzle-orm";
import type { Database } from "../db";
import { chunks, notebooks, sources } from "../db/schema";
import { NotFoundError } from "./errors";
import { assertNotebookOwnership } from "./notebook-access";

export type Source = typeof sources.$inferSelect;
export type Chunk = typeof chunks.$inferSelect;

export type NewSourceInput = {
  notebookId: string;
  type: Source["type"];
  title: string;
  storagePath?: string;
  url?: string;
  content?: string;
};

export type SourcePatch = Partial<
  Pick<Source, "title" | "status" | "content" | "errorMessage">
>;

export type NewChunkInput = {
  chunkIndex: number;
  text: string;
  charStart: number;
  charEnd: number;
  pageNumber?: number;
  section?: string;
  embedding: number[];
};

export function createSourceRepository(database: Database) {
  // Correlated subquery tying a sources row to a notebook owned by ownerId;
  // lets single-statement UPDATE/DELETE stay owner-scoped.
  const ownedByCaller = (ownerId: string) =>
    exists(
      database
        .select({ one: sql`1` })
        .from(notebooks)
        .where(
          and(eq(notebooks.id, sources.notebookId), eq(notebooks.ownerId, ownerId)),
        ),
    );

  return {
    async create(ownerId: string, input: NewSourceInput): Promise<Source> {
      await assertNotebookOwnership(database, input.notebookId, ownerId);
      const [created] = await database.insert(sources).values(input).returning();
      return created;
    },

    async listByNotebook(notebookId: string, ownerId: string): Promise<Source[]> {
      await assertNotebookOwnership(database, notebookId, ownerId);
      return database
        .select()
        .from(sources)
        .where(eq(sources.notebookId, notebookId))
        .orderBy(asc(sources.createdAt));
    },

    async findById(id: string, ownerId: string): Promise<Source | undefined> {
      const [row] = await database
        .select({ source: sources })
        .from(sources)
        .innerJoin(notebooks, eq(notebooks.id, sources.notebookId))
        .where(and(eq(sources.id, id), eq(notebooks.ownerId, ownerId)))
        .limit(1);
      return row?.source;
    },

    async update(id: string, ownerId: string, patch: SourcePatch): Promise<Source> {
      const [updated] = await database
        .update(sources)
        .set({ ...patch, updatedAt: new Date() })
        .where(and(eq(sources.id, id), ownedByCaller(ownerId)))
        .returning();
      if (!updated) {
        throw new NotFoundError("source not found");
      }
      return updated;
    },

    async delete(id: string, ownerId: string): Promise<void> {
      const deleted = await database
        .delete(sources)
        .where(and(eq(sources.id, id), ownedByCaller(ownerId)))
        .returning({ id: sources.id });
      if (deleted.length === 0) {
        throw new NotFoundError("source not found");
      }
    },

    // Ingestion writes a source's chunks atomically; reprocessing (CF-03)
    // replaces the previous set.
    async replaceChunks(
      sourceId: string,
      ownerId: string,
      inputs: NewChunkInput[],
    ): Promise<Chunk[]> {
      const source = await this.findById(sourceId, ownerId);
      if (!source) {
        throw new NotFoundError("source not found");
      }
      return database.transaction(async (tx) => {
        await tx.delete(chunks).where(eq(chunks.sourceId, sourceId));
        if (inputs.length === 0) {
          return [];
        }
        return tx
          .insert(chunks)
          .values(inputs.map((input) => ({ ...input, sourceId })))
          .returning();
      });
    },
  };
}

export type SourceRepository = ReturnType<typeof createSourceRepository>;
