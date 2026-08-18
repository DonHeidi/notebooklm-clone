import { beforeAll, describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Embedder } from "../ai/embeddings";
import type { Database } from "../db";
import { createTestDatabase } from "../db/create-test-database";
import { EMBEDDING_DIMENSIONS } from "../db/schema";
import { createNotebookRepository } from "../repositories/notebook-repository";
import { createSourceRepository } from "../repositories/source-repository";
import { ingestSource } from "./ingestion-service";
import {
  createFileSource,
  createTextSource,
  createUrlSource,
  SourceInputError,
} from "./source-service";

const OWNER = "11111111-1111-4111-8111-111111111111";
const STRANGER = "22222222-2222-4222-8222-222222222222";

const fakeEmbedder: Embedder = {
  async embed(texts) {
    return texts.map((_, i) =>
      Array.from({ length: EMBEDDING_DIMENSIONS }, (_, d) => (d === 0 ? i + 1 : 0)),
    );
  },
};

const failingEmbedder: Embedder = {
  async embed() {
    throw new Error(
      "embedding provider exploded with a very long diagnostic. ".repeat(20),
    );
  },
};

const fixture = (name: string) =>
  join(import.meta.dir, "../ingestion/fixtures", name);

let db: Database;
let notebookId: string;

beforeAll(async () => {
  db = await createTestDatabase();
  const notebook = await createNotebookRepository(db).create(OWNER, "Test");
  notebookId = notebook.id;
});

const sourceRepo = () => createSourceRepository(db);

const PASTED = Array.from(
  { length: 60 },
  (_, i) => `Paragraph ${i + 1}. The first civilisations arose in river valleys.`,
).join("\n\n");

describe("ingestSource — text", () => {
  test("pending → ready with offset-correct, embedded chunks", async () => {
    const source = await createTextSource(
      OWNER,
      { notebookId, title: "My notes", content: PASTED },
      db,
    );
    expect(source.status).toBe("pending");

    await ingestSource(source.id, OWNER, { db, embedder: fakeEmbedder });

    const after = await sourceRepo().findById(source.id, OWNER);
    expect(after?.status).toBe("ready");
    expect(after?.errorMessage).toBeNull();
    expect(after?.content).toBe(PASTED);

    const chunks = await db.query.chunks.findMany();
    const own = chunks.filter((c) => c.sourceId === source.id);
    expect(own.length).toBeGreaterThan(0);
    for (const chunk of own) {
      expect(after!.content!.slice(chunk.charStart, chunk.charEnd)).toBe(chunk.text);
      expect(chunk.embedding).toHaveLength(EMBEDDING_DIMENSIONS);
    }
  });

  test("re-ingesting replaces chunks instead of appending", async () => {
    const source = await createTextSource(
      OWNER,
      { notebookId, title: "Twice", content: PASTED },
      db,
    );
    await ingestSource(source.id, OWNER, { db, embedder: fakeEmbedder });
    const first = (await db.query.chunks.findMany()).filter(
      (c) => c.sourceId === source.id,
    );
    await ingestSource(source.id, OWNER, { db, embedder: fakeEmbedder });
    const second = (await db.query.chunks.findMany()).filter(
      (c) => c.sourceId === source.id,
    );
    expect(second.length).toBe(first.length);
    expect(new Set(second.map((c) => c.id)).intersection(new Set(first.map((c) => c.id))).size).toBe(0);
  });
});

describe("ingestSource — file", () => {
  test("PDF: per-page chunks with page numbers, joined content stored", async () => {
    const source = await createFileSource(
      OWNER,
      {
        notebookId,
        fileName: "two-pages.pdf",
        storagePath: `${OWNER}/abc/two-pages.pdf`,
        fileSize: 893,
      },
      db,
    );
    const bytes = new Uint8Array(readFileSync(fixture("two-pages.pdf")));
    await ingestSource(source.id, OWNER, {
      db,
      embedder: fakeEmbedder,
      loadFileBytes: async (path) => {
        expect(path).toBe(`${OWNER}/abc/two-pages.pdf`);
        return bytes;
      },
    });

    const after = await sourceRepo().findById(source.id, OWNER);
    expect(after?.status).toBe("ready");
    expect(after?.content).toContain("Alpha page one");
    const own = (await db.query.chunks.findMany()).filter(
      (c) => c.sourceId === source.id,
    );
    expect(new Set(own.map((c) => c.pageNumber))).toEqual(new Set([1, 2]));
    for (const chunk of own) {
      expect(after!.content!.slice(chunk.charStart, chunk.charEnd)).toBe(chunk.text);
    }
  });

  test("binary non-PDF file fails with a user-presentable message", async () => {
    const source = await createFileSource(
      OWNER,
      {
        notebookId,
        fileName: "photo.png",
        storagePath: `${OWNER}/abc/photo.png`,
        fileSize: 4,
      },
      db,
    );
    await ingestSource(source.id, OWNER, {
      db,
      embedder: fakeEmbedder,
      loadFileBytes: async () => new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0xff, 0xfe]),
    });
    const after = await sourceRepo().findById(source.id, OWNER);
    expect(after?.status).toBe("failed");
    expect(after?.errorMessage).toContain("only PDF, TXT and Markdown");
  });
});

describe("ingestSource — url", () => {
  test("extracts the article, adopts the page title", async () => {
    const source = await createUrlSource(
      OWNER,
      { notebookId, url: "https://example.com/civilisations" },
      db,
    );
    expect(source.title).toBe("example.com/civilisations");
    const html = readFileSync(fixture("article.html"), "utf8");
    await ingestSource(source.id, OWNER, {
      db,
      embedder: fakeEmbedder,
      fetchHtml: async () => html,
    });
    const after = await sourceRepo().findById(source.id, OWNER);
    expect(after?.status).toBe("ready");
    expect(after?.title).toBe("Early Civilisations — Field Notes");
    expect(after?.content).toContain("cuneiform writing");
  });

  test("fetch failure marks the source failed with the fetch error", async () => {
    const source = await createUrlSource(
      OWNER,
      { notebookId, url: "https://example.com/404" },
      db,
    );
    await ingestSource(source.id, OWNER, {
      db,
      embedder: fakeEmbedder,
      fetchHtml: async () => {
        throw new Error("the page could not be fetched (HTTP 404)");
      },
    });
    const after = await sourceRepo().findById(source.id, OWNER);
    expect(after?.status).toBe("failed");
    expect(after?.errorMessage).toBe("the page could not be fetched (HTTP 404)");
  });
});

describe("ingestSource — failure handling", () => {
  test("embedder failure → failed, error message truncated", async () => {
    const source = await createTextSource(
      OWNER,
      { notebookId, title: "Boom", content: PASTED },
      db,
    );
    await ingestSource(source.id, OWNER, { db, embedder: failingEmbedder });
    const after = await sourceRepo().findById(source.id, OWNER);
    expect(after?.status).toBe("failed");
    expect(after!.errorMessage!.length).toBeLessThanOrEqual(300);
  });

  test("wrong embedding dimensionality never reaches ready", async () => {
    const source = await createTextSource(
      OWNER,
      { notebookId, title: "Wrong dims", content: PASTED },
      db,
    );
    await ingestSource(source.id, OWNER, {
      db,
      embedder: { embed: async (texts) => texts.map(() => [1, 2, 3]) },
    });
    const after = await sourceRepo().findById(source.id, OWNER);
    expect(after?.status).toBe("failed");
  });

  test("a stranger's ingest call is a no-op", async () => {
    const source = await createTextSource(
      OWNER,
      { notebookId, title: "Not yours", content: PASTED },
      db,
    );
    await ingestSource(source.id, STRANGER, { db, embedder: fakeEmbedder });
    const after = await sourceRepo().findById(source.id, OWNER);
    expect(after?.status).toBe("pending");
  });
});

describe("creation guards", () => {
  test("empty pasted text is rejected", async () => {
    expect(
      createTextSource(OWNER, { notebookId, title: "", content: "   " }, db),
    ).rejects.toBeInstanceOf(SourceInputError);
  });

  test("pasted text over the word limit is rejected", async () => {
    const words = Array.from({ length: 200_001 }, () => "w").join(" ");
    expect(
      createTextSource(OWNER, { notebookId, title: "big", content: words }, db),
    ).rejects.toBeInstanceOf(SourceInputError);
  });

  test("invalid and non-http URLs are rejected", async () => {
    expect(
      createUrlSource(OWNER, { notebookId, url: "not a url" }, db),
    ).rejects.toBeInstanceOf(SourceInputError);
    expect(
      createUrlSource(OWNER, { notebookId, url: "ftp://example.com/x" }, db),
    ).rejects.toBeInstanceOf(SourceInputError);
  });

  test("files over the byte cap and foreign storage paths are rejected", async () => {
    expect(
      createFileSource(
        OWNER,
        {
          notebookId,
          fileName: "big.pdf",
          storagePath: `${OWNER}/x/big.pdf`,
          fileSize: 21 * 1024 * 1024,
        },
        db,
      ),
    ).rejects.toBeInstanceOf(SourceInputError);
    expect(
      createFileSource(
        OWNER,
        {
          notebookId,
          fileName: "sneaky.pdf",
          storagePath: `${STRANGER}/x/sneaky.pdf`,
          fileSize: 10,
        },
        db,
      ),
    ).rejects.toBeInstanceOf(SourceInputError);
  });

  test("the 50-sources-per-notebook cap is enforced", async () => {
    const notebook = await createNotebookRepository(db).create(OWNER, "Full");
    for (let i = 0; i < 50; i++) {
      await createTextSource(
        OWNER,
        { notebookId: notebook.id, title: `s${i}`, content: "some words here" },
        db,
      );
    }
    expect(
      createTextSource(
        OWNER,
        { notebookId: notebook.id, title: "overflow", content: "one more" },
        db,
      ),
    ).rejects.toBeInstanceOf(SourceInputError);
  });
});
