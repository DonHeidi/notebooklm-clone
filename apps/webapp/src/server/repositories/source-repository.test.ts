import { beforeAll, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import type { Database } from "../db";
import { createTestDatabase } from "../db/create-test-database";
import { EMBEDDING_DIMENSIONS, chunks } from "../db/schema";
import { NotFoundError } from "./errors";
import { createNotebookRepository } from "./notebook-repository";
import { createSourceRepository, type NewChunkInput } from "./source-repository";

let database: Database;

beforeAll(async () => {
  database = await createTestDatabase();
});

const owner = () => crypto.randomUUID();

const embedding = (seed: number) =>
  Array.from({ length: EMBEDDING_DIMENSIONS }, (_, i) => (i === 0 ? seed : 0));

const chunkInput = (index: number, text: string): NewChunkInput => ({
  chunkIndex: index,
  text,
  charStart: index * 100,
  charEnd: index * 100 + text.length,
  pageNumber: index + 1,
  section: `Section ${index + 1}`,
  embedding: embedding(index + 1),
});

async function notebookFor(ownerId: string) {
  return createNotebookRepository(database).create(ownerId, "Notebook");
}

describe("source repository", () => {
  test("create defaults status to pending and rejects foreign notebooks", async () => {
    const repo = createSourceRepository(database);
    const alice = owner();
    const notebook = await notebookFor(alice);

    const source = await repo.create(alice, {
      notebookId: notebook.id,
      type: "url",
      title: "Example",
      url: "https://example.com",
    });
    expect(source.status).toBe("pending");

    expect(
      repo.create(owner(), {
        notebookId: notebook.id,
        type: "text",
        title: "Sneaky",
        content: "x",
      }),
    ).rejects.toThrow(NotFoundError);
  });

  test("listByNotebook requires ownership of the notebook", async () => {
    const repo = createSourceRepository(database);
    const alice = owner();
    const notebook = await notebookFor(alice);
    await repo.create(alice, {
      notebookId: notebook.id,
      type: "text",
      title: "A",
      content: "a",
    });

    expect(await repo.listByNotebook(notebook.id, alice)).toHaveLength(1);
    expect(repo.listByNotebook(notebook.id, owner())).rejects.toThrow(
      NotFoundError,
    );
  });

  test("update is owner-scoped and records ingestion status transitions", async () => {
    const repo = createSourceRepository(database);
    const alice = owner();
    const notebook = await notebookFor(alice);
    const source = await repo.create(alice, {
      notebookId: notebook.id,
      type: "file",
      title: "paper.pdf",
      storagePath: "uploads/paper.pdf",
    });

    expect(
      repo.update(source.id, owner(), { status: "failed" }),
    ).rejects.toThrow(NotFoundError);

    const failed = await repo.update(source.id, alice, {
      status: "failed",
      errorMessage: "parse error",
    });
    expect(failed.status).toBe("failed");
    expect(failed.errorMessage).toBe("parse error");

    const ready = await repo.update(source.id, alice, {
      status: "ready",
      content: "Extracted text",
      errorMessage: null,
    });
    expect(ready.status).toBe("ready");
    expect(ready.content).toBe("Extracted text");
    expect(ready.errorMessage).toBeNull();
  });

  test("replaceChunks stores citation location metadata and replaces prior chunks", async () => {
    const repo = createSourceRepository(database);
    const alice = owner();
    const notebook = await notebookFor(alice);
    const source = await repo.create(alice, {
      notebookId: notebook.id,
      type: "file",
      title: "paper.pdf",
      storagePath: "uploads/paper.pdf",
    });

    const first = await repo.replaceChunks(source.id, alice, [
      chunkInput(0, "First chunk"),
      chunkInput(1, "Second chunk"),
    ]);
    expect(first).toHaveLength(2);
    expect(first[0].charStart).toBe(0);
    expect(first[0].charEnd).toBe("First chunk".length);
    expect(first[0].pageNumber).toBe(1);
    expect(first[0].section).toBe("Section 1");
    expect(first[0].embedding).toHaveLength(EMBEDDING_DIMENSIONS);

    // Reprocessing replaces, never appends.
    const second = await repo.replaceChunks(source.id, alice, [
      chunkInput(0, "Reprocessed chunk"),
    ]);
    expect(second).toHaveLength(1);
    const stored = await database
      .select()
      .from(chunks)
      .where(eq(chunks.sourceId, source.id));
    expect(stored).toHaveLength(1);
    expect(stored[0].text).toBe("Reprocessed chunk");

    expect(
      repo.replaceChunks(source.id, owner(), [chunkInput(0, "nope")]),
    ).rejects.toThrow(NotFoundError);
  });

  test("the tsvector column is generated from chunk text", async () => {
    const repo = createSourceRepository(database);
    const alice = owner();
    const notebook = await notebookFor(alice);
    const source = await repo.create(alice, {
      notebookId: notebook.id,
      type: "text",
      title: "Pasted",
      content: "…",
    });
    await repo.replaceChunks(source.id, alice, [
      chunkInput(0, "Postgres full text searching"),
    ]);

    const [stored] = await database
      .select({ fts: chunks.fts })
      .from(chunks)
      .where(eq(chunks.sourceId, source.id));
    // 'english' config stems "searching" → "search".
    expect(stored.fts).toContain("search");
  });

  test("delete cascades to chunks", async () => {
    const repo = createSourceRepository(database);
    const alice = owner();
    const notebook = await notebookFor(alice);
    const source = await repo.create(alice, {
      notebookId: notebook.id,
      type: "text",
      title: "Pasted",
      content: "x",
    });
    await repo.replaceChunks(source.id, alice, [chunkInput(0, "chunk")]);

    expect(repo.delete(source.id, owner())).rejects.toThrow(NotFoundError);
    await repo.delete(source.id, alice);

    expect(await repo.findById(source.id, alice)).toBeUndefined();
    expect(
      await database.select().from(chunks).where(eq(chunks.sourceId, source.id)),
    ).toHaveLength(0);
  });
});
