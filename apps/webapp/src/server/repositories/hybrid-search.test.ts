import { beforeAll, describe, expect, test } from "bun:test";
import type { Database } from "../db";
import { createTestDatabase } from "../db/create-test-database";
import { EMBEDDING_DIMENSIONS } from "../db/schema";
import { NotFoundError } from "./errors";
import { createNotebookRepository } from "./notebook-repository";
import {
  createSourceRepository,
  type SourceRepository,
} from "./source-repository";

// Deterministic embeddings for retrieval tests: unit basis vectors, so cosine
// distance is 0 between identical vectors and 1 between different ones.
function basisVector(index: number): number[] {
  const vector = new Array<number>(EMBEDDING_DIMENSIONS).fill(0);
  vector[index] = 1;
  return vector;
}

const OWNER = "11111111-1111-4111-8111-111111111111";
const STRANGER = "22222222-2222-4222-8222-222222222222";

describe("hybridSearchChunks", () => {
  let db: Database;
  let repository: SourceRepository;
  let notebookId: string;
  let alphaSourceId: string; // ready, two chunks
  let betaSourceId: string; // ready, one chunk
  let pendingSourceId: string; // not ready, must never surface
  let strangerNotebookId: string;
  let strangerSourceId: string;

  async function addReadySource(
    ownerId: string,
    notebook: string,
    title: string,
    chunks: { text: string; embedding: number[] }[],
  ): Promise<string> {
    const source = await repository.create(ownerId, {
      notebookId: notebook,
      type: "text",
      title,
      content: chunks.map((chunk) => chunk.text).join("\n"),
    });
    let offset = 0;
    await repository.replaceChunks(
      source.id,
      ownerId,
      chunks.map((chunk, index) => {
        const charStart = offset;
        offset += chunk.text.length + 1;
        return {
          chunkIndex: index,
          text: chunk.text,
          charStart,
          charEnd: charStart + chunk.text.length,
          embedding: chunk.embedding,
        };
      }),
    );
    await repository.update(source.id, ownerId, { status: "ready" });
    return source.id;
  }

  beforeAll(async () => {
    db = await createTestDatabase();
    repository = createSourceRepository(db);
    const notebookRepository = createNotebookRepository(db);
    notebookId = (await notebookRepository.create(OWNER, "Research")).id;
    strangerNotebookId = (await notebookRepository.create(STRANGER, "Foreign")).id;

    alphaSourceId = await addReadySource(OWNER, notebookId, "Alpha paper", [
      // Matches the query by BOTH vector (basis 0) and full-text ("zymurgy").
      { text: "Zymurgy is the study of fermentation in brewing.", embedding: basisVector(0) },
      // Matches by vector similarity only (close index → still distance 1,
      // but ranked by fts absence).
      { text: "Completely unrelated botany notes about ferns.", embedding: basisVector(1) },
    ]);
    betaSourceId = await addReadySource(OWNER, notebookId, "Beta article", [
      // Matches by full-text only ("zymurgy"), vector far away.
      { text: "A glossary entry: zymurgy appears in dictionaries.", embedding: basisVector(50) },
    ]);
    pendingSourceId = (
      await repository.create(OWNER, {
        notebookId,
        type: "text",
        title: "Still processing",
        content: "zymurgy zymurgy zymurgy",
      })
    ).id;
    await repository.replaceChunks(pendingSourceId, OWNER, [
      {
        chunkIndex: 0,
        text: "zymurgy zymurgy zymurgy",
        charStart: 0,
        charEnd: 23,
        embedding: basisVector(0),
      },
    ]);
    // status stays "pending" — chunks exist but the source is not ready.

    strangerSourceId = await addReadySource(STRANGER, strangerNotebookId, "Foreign source", [
      { text: "zymurgy secrets of another user", embedding: basisVector(0) },
    ]);
  });

  test("fuses vector and full-text rank: both-modality chunk wins", async () => {
    const results = await repository.hybridSearchChunks({
      notebookId,
      ownerId: OWNER,
      sourceIds: [alphaSourceId, betaSourceId],
      queryEmbedding: basisVector(0),
      queryText: "zymurgy",
    });
    expect(results.length).toBeGreaterThanOrEqual(2);
    expect(results[0].text).toContain("Zymurgy is the study");
    expect(results[0].sourceTitle).toBe("Alpha paper");
    // Every hit carries the citation raw material.
    for (const hit of results) {
      expect(hit.chunkId).toBeString();
      expect(hit.sourceId).toBeString();
      expect(hit.charEnd).toBeGreaterThan(hit.charStart);
    }
  });

  test("full-text-only match is found even with a distant embedding", async () => {
    const results = await repository.hybridSearchChunks({
      notebookId,
      ownerId: OWNER,
      sourceIds: [betaSourceId],
      queryEmbedding: basisVector(0),
      queryText: "zymurgy",
    });
    expect(results.map((hit) => hit.sourceId)).toEqual([betaSourceId]);
  });

  test("restricts results to the selected sources", async () => {
    const results = await repository.hybridSearchChunks({
      notebookId,
      ownerId: OWNER,
      sourceIds: [alphaSourceId],
      queryEmbedding: basisVector(0),
      queryText: "zymurgy",
    });
    expect(results.length).toBeGreaterThan(0);
    for (const hit of results) {
      expect(hit.sourceId).toBe(alphaSourceId);
    }
  });

  test("never surfaces sources that are not ready", async () => {
    const results = await repository.hybridSearchChunks({
      notebookId,
      ownerId: OWNER,
      sourceIds: [alphaSourceId, betaSourceId, pendingSourceId],
      queryEmbedding: basisVector(0),
      queryText: "zymurgy",
    });
    for (const hit of results) {
      expect(hit.sourceId).not.toBe(pendingSourceId);
    }
  });

  test("ignores selected ids that belong to another user's notebook", async () => {
    const results = await repository.hybridSearchChunks({
      notebookId,
      ownerId: OWNER,
      sourceIds: [alphaSourceId, strangerSourceId],
      queryEmbedding: basisVector(0),
      queryText: "zymurgy",
    });
    for (const hit of results) {
      expect(hit.sourceId).not.toBe(strangerSourceId);
    }
  });

  test("throws NotFoundError for a notebook the caller does not own", async () => {
    await expect(
      repository.hybridSearchChunks({
        notebookId: strangerNotebookId,
        ownerId: OWNER,
        sourceIds: [strangerSourceId],
        queryEmbedding: basisVector(0),
        queryText: "zymurgy",
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  test("returns [] for an empty selection", async () => {
    const results = await repository.hybridSearchChunks({
      notebookId,
      ownerId: OWNER,
      sourceIds: [],
      queryEmbedding: basisVector(0),
      queryText: "zymurgy",
    });
    expect(results).toEqual([]);
  });

  test("caps results at the requested limit", async () => {
    const results = await repository.hybridSearchChunks({
      notebookId,
      ownerId: OWNER,
      sourceIds: [alphaSourceId, betaSourceId],
      queryEmbedding: basisVector(0),
      queryText: "zymurgy fermentation botany",
      limit: 1,
    });
    expect(results.length).toBe(1);
  });
});
