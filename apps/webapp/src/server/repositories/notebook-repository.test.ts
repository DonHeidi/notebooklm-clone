import { beforeAll, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import type { Database } from "../db";
import { createTestDatabase } from "../db/create-test-database";
import { sources } from "../db/schema";
import { NotFoundError } from "./errors";
import { createNotebookRepository } from "./notebook-repository";
import { createSourceRepository } from "./source-repository";

let database: Database;

beforeAll(async () => {
  database = await createTestDatabase();
});

const owner = () => crypto.randomUUID();

describe("notebook repository", () => {
  test("findByOwner returns only the caller's notebooks", async () => {
    const repo = createNotebookRepository(database);
    const alice = owner();
    const bob = owner();
    await repo.create(alice, "Alice's research");
    await repo.create(bob, "Bob's research");

    const notebooks = await repo.findByOwner(alice);
    expect(notebooks).toHaveLength(1);
    expect(notebooks[0].title).toBe("Alice's research");
  });

  test("findById does not return another owner's notebook", async () => {
    const repo = createNotebookRepository(database);
    const alice = owner();
    const notebook = await repo.create(alice, "Private");

    expect(await repo.findById(notebook.id, alice)).toBeDefined();
    expect(await repo.findById(notebook.id, owner())).toBeUndefined();
  });

  test("rename updates the title for the owner only", async () => {
    const repo = createNotebookRepository(database);
    const alice = owner();
    const notebook = await repo.create(alice, "Old title");

    const renamed = await repo.rename(notebook.id, alice, "New title");
    expect(renamed.title).toBe("New title");

    expect(repo.rename(notebook.id, owner(), "Hijacked")).rejects.toThrow(
      NotFoundError,
    );
  });

  test("delete is owner-scoped and cascades to sources", async () => {
    const notebookRepo = createNotebookRepository(database);
    const sourceRepo = createSourceRepository(database);
    const alice = owner();
    const notebook = await notebookRepo.create(alice, "Doomed");
    const source = await sourceRepo.create(alice, {
      notebookId: notebook.id,
      type: "text",
      title: "Pasted text",
      content: "hello",
    });

    expect(notebookRepo.delete(notebook.id, owner())).rejects.toThrow(
      NotFoundError,
    );

    await notebookRepo.delete(notebook.id, alice);
    expect(await notebookRepo.findById(notebook.id, alice)).toBeUndefined();
    const orphanedSources = await database
      .select()
      .from(sources)
      .where(eq(sources.id, source.id));
    expect(orphanedSources).toHaveLength(0);
  });
});
