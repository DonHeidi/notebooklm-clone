import { and, desc, eq, exists, sql } from "drizzle-orm";
import type { Database } from "../db";
import { artifacts, notebooks, type AudioOverviewConfig } from "../db/schema";
import { NotFoundError } from "./errors";
import { assertNotebookOwnership } from "./notebook-access";

export type Artifact = typeof artifacts.$inferSelect;

export type NewArtifactInput = {
  notebookId: string;
  type: Artifact["type"];
  title: string;
  config: AudioOverviewConfig;
};

export type ArtifactPatch = Partial<
  Pick<
    Artifact,
    "title" | "status" | "errorMessage" | "storagePath" | "durationSeconds"
  >
>;

export function createArtifactRepository(database: Database) {
  // Correlated subquery tying an artifacts row to a notebook owned by
  // ownerId; lets single-statement UPDATE/DELETE stay owner-scoped.
  const ownedByCaller = (ownerId: string) =>
    exists(
      database
        .select({ one: sql`1` })
        .from(notebooks)
        .where(
          and(
            eq(notebooks.id, artifacts.notebookId),
            eq(notebooks.ownerId, ownerId),
          ),
        ),
    );

  return {
    async create(ownerId: string, input: NewArtifactInput): Promise<Artifact> {
      await assertNotebookOwnership(database, input.notebookId, ownerId);
      const [created] = await database.insert(artifacts).values(input).returning();
      return created;
    },

    async listByNotebook(notebookId: string, ownerId: string): Promise<Artifact[]> {
      await assertNotebookOwnership(database, notebookId, ownerId);
      return database
        .select()
        .from(artifacts)
        .where(eq(artifacts.notebookId, notebookId))
        .orderBy(desc(artifacts.createdAt), desc(artifacts.id));
    },

    async findById(id: string, ownerId: string): Promise<Artifact | undefined> {
      const [row] = await database
        .select({ artifact: artifacts })
        .from(artifacts)
        .innerJoin(notebooks, eq(notebooks.id, artifacts.notebookId))
        .where(and(eq(artifacts.id, id), eq(notebooks.ownerId, ownerId)))
        .limit(1);
      return row?.artifact;
    },

    async update(
      id: string,
      ownerId: string,
      patch: ArtifactPatch,
    ): Promise<Artifact> {
      const [updated] = await database
        .update(artifacts)
        .set({ ...patch, updatedAt: new Date() })
        .where(and(eq(artifacts.id, id), ownedByCaller(ownerId)))
        .returning();
      if (!updated) {
        throw new NotFoundError("artifact not found");
      }
      return updated;
    },

    async delete(id: string, ownerId: string): Promise<void> {
      const deleted = await database
        .delete(artifacts)
        .where(and(eq(artifacts.id, id), ownedByCaller(ownerId)))
        .returning({ id: artifacts.id });
      if (deleted.length === 0) {
        throw new NotFoundError("artifact not found");
      }
    },
  };
}

export type ArtifactRepository = ReturnType<typeof createArtifactRepository>;
