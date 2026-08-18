import { beforeAll, describe, expect, test } from "bun:test";
import type { Database } from "../db";
import { createTestDatabase } from "../db/create-test-database";
import { EMBEDDING_DIMENSIONS } from "../db/schema";
import { createNotebookRepository } from "../repositories/notebook-repository";
import { createSourceRepository } from "../repositories/source-repository";
import { resolveCitation } from "./source-service";

let database: Database;

beforeAll(async () => {
  database = await createTestDatabase();
});

const owner = () => crypto.randomUUID();

describe("resolveCitation", () => {
  test("resolves a chunk to its passage location, null when dangling", async () => {
    const alice = owner();
    const notebook = await createNotebookRepository(database).create(
      alice,
      "Notebook",
    );
    const sourceRepo = createSourceRepository(database);
    const source = await sourceRepo.create(alice, {
      notebookId: notebook.id,
      type: "text",
      title: "Pasted",
      content: "The cited passage lives here.",
    });
    const [chunk] = await sourceRepo.replaceChunks(source.id, alice, [
      {
        chunkIndex: 0,
        text: "cited passage",
        charStart: 4,
        charEnd: 17,
        embedding: Array.from({ length: EMBEDDING_DIMENSIONS }, () => 0),
      },
    ]);

    const resolved = await resolveCitation(chunk.id, alice, database);
    expect(resolved).toEqual({
      chunkId: chunk.id,
      sourceId: source.id,
      sourceTitle: "Pasted",
      charStart: 4,
      charEnd: 17,
      pageNumber: null,
      section: null,
    });

    // Authz: a stranger resolves nothing.
    expect(await resolveCitation(chunk.id, owner(), database)).toBeNull();
    // Dangling: deleting the source cascades the chunk away.
    await sourceRepo.delete(source.id, alice);
    expect(await resolveCitation(chunk.id, alice, database)).toBeNull();
  });
});
