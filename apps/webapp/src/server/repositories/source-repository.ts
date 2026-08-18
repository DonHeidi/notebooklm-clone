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

// One retrieval hit: everything the chat needs to quote a chunk in the prompt
// and turn a [n] marker back into a persisted citation (CF-06/07).
export type RetrievedChunk = {
  chunkId: string;
  sourceId: string;
  sourceTitle: string;
  text: string;
  charStart: number;
  charEnd: number;
  pageNumber: number | null;
  section: string | null;
  score: number;
};

export type HybridSearchParams = {
  notebookId: string;
  ownerId: string;
  /** Caller-selected source ids — intersected server-side with the notebook's
   * own ready sources, so foreign or stale ids are silently ignored. */
  sourceIds: string[];
  queryEmbedding: number[];
  queryText: string;
  limit?: number;
};

// Reciprocal-rank-fusion constants (Supabase's documented hybrid-search
// pattern): each modality contributes 1/(RRF_K + rank), equally weighted.
const RRF_K = 50;
// Candidates taken per modality before fusion.
const CANDIDATE_POOL = 30;
const DEFAULT_LIMIT = 10;

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

    // Hybrid retrieval (feasibility F-3): pgvector cosine over the HNSW index
    // fused with Postgres full-text on the generated fts column via
    // reciprocal rank fusion. Implemented as a Drizzle sql template (not a
    // database function) so PGlite tests exercise the exact production query
    // and the logic stays visible in the repository layer.
    async hybridSearchChunks(
      params: HybridSearchParams,
    ): Promise<RetrievedChunk[]> {
      await assertNotebookOwnership(database, params.notebookId, params.ownerId);
      if (params.sourceIds.length === 0) {
        return [];
      }
      const limit = params.limit ?? DEFAULT_LIMIT;
      // pgvector accepts its text representation; bound as a parameter and
      // cast server-side.
      const embeddingLiteral = `[${params.queryEmbedding.join(",")}]`;
      const selectedIds = sql.join(
        params.sourceIds.map((id) => sql`${id}::uuid`),
        sql`, `,
      );

      const query = sql`
        with allowed_sources as (
          select s.id, s.title
          from sources s
          join notebooks n on n.id = s.notebook_id
          where n.id = ${params.notebookId}
            and n.owner_id = ${params.ownerId}
            and s.status = 'ready'
            and s.id in (${selectedIds})
        ),
        vector_hits as (
          select c.id,
            row_number() over (
              order by c.embedding <=> ${embeddingLiteral}::vector
            ) as rank
          from chunks c
          join allowed_sources a on a.id = c.source_id
          order by c.embedding <=> ${embeddingLiteral}::vector
          limit ${CANDIDATE_POOL}
        ),
        fts_hits as (
          select c.id,
            row_number() over (
              order by ts_rank_cd(c.fts, websearch_to_tsquery('english', ${params.queryText})) desc
            ) as rank
          from chunks c
          join allowed_sources a on a.id = c.source_id
          where c.fts @@ websearch_to_tsquery('english', ${params.queryText})
          limit ${CANDIDATE_POOL}
        )
        select
          c.id as chunk_id,
          c.source_id,
          a.title as source_title,
          c.text,
          c.char_start,
          c.char_end,
          c.page_number,
          c.section,
          coalesce(1.0 / (${RRF_K} + v.rank), 0)
            + coalesce(1.0 / (${RRF_K} + f.rank), 0) as score
        from vector_hits v
        full outer join fts_hits f on f.id = v.id
        join chunks c on c.id = coalesce(v.id, f.id)
        join allowed_sources a on a.id = c.source_id
        order by score desc, c.source_id, c.chunk_index
        limit ${limit}
      `;

      // db.execute returns rows directly on postgres-js but { rows } on the
      // PGlite driver used in tests — normalize.
      const executed = (await database.execute(query)) as
        | Record<string, unknown>[]
        | { rows: Record<string, unknown>[] };
      const rows = Array.isArray(executed) ? executed : executed.rows;
      return rows.map((row) => ({
        chunkId: row.chunk_id as string,
        sourceId: row.source_id as string,
        sourceTitle: row.source_title as string,
        text: row.text as string,
        charStart: Number(row.char_start),
        charEnd: Number(row.char_end),
        pageNumber: row.page_number === null ? null : Number(row.page_number),
        section: (row.section as string | null) ?? null,
        score: Number(row.score),
      }));
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
