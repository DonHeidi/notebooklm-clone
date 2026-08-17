import { beforeAll, describe, expect, test } from "bun:test";
import type { Database } from "../db";
import { createTestDatabase } from "../db/create-test-database";
import { createConversationRepository } from "./conversation-repository";
import { NotFoundError } from "./errors";
import { createNotebookRepository } from "./notebook-repository";
import { createNoteRepository } from "./note-repository";

let database: Database;

beforeAll(async () => {
  database = await createTestDatabase();
});

const owner = () => crypto.randomUUID();

async function notebookFor(ownerId: string) {
  return createNotebookRepository(database).create(ownerId, "Notebook");
}

describe("note repository", () => {
  test("create and listByNotebook are owner-scoped", async () => {
    const repo = createNoteRepository(database);
    const alice = owner();
    const notebook = await notebookFor(alice);

    await repo.create(alice, {
      notebookId: notebook.id,
      title: "Idea",
      content: "Write this down",
    });
    expect(await repo.listByNotebook(notebook.id, alice)).toHaveLength(1);

    expect(
      repo.create(owner(), {
        notebookId: notebook.id,
        title: "Sneaky",
        content: "x",
      }),
    ).rejects.toThrow(NotFoundError);
    expect(repo.listByNotebook(notebook.id, owner())).rejects.toThrow(
      NotFoundError,
    );
  });

  test("update and delete are owner-scoped", async () => {
    const repo = createNoteRepository(database);
    const alice = owner();
    const notebook = await notebookFor(alice);
    const note = await repo.create(alice, {
      notebookId: notebook.id,
      title: "Draft",
      content: "v1",
    });

    expect(repo.update(note.id, owner(), { content: "v2" })).rejects.toThrow(
      NotFoundError,
    );
    const updated = await repo.update(note.id, alice, {
      title: "Final",
      content: "v2",
    });
    expect(updated.title).toBe("Final");
    expect(updated.content).toBe("v2");

    expect(repo.delete(note.id, owner())).rejects.toThrow(NotFoundError);
    await repo.delete(note.id, alice);
    expect(await repo.findById(note.id, alice)).toBeUndefined();
  });

  test("a note saved from a message survives message deletion", async () => {
    const noteRepo = createNoteRepository(database);
    const conversationRepo = createConversationRepository(database);
    const alice = owner();
    const notebook = await notebookFor(alice);
    const conversation = await conversationRepo.create(alice, notebook.id);
    const message = await conversationRepo.appendMessage(
      conversation.id,
      alice,
      { role: "assistant", content: "Worth keeping" },
    );

    const note = await noteRepo.create(alice, {
      notebookId: notebook.id,
      title: "Saved response",
      content: "Worth keeping",
      sourceMessageId: message.id,
    });
    expect(note.sourceMessageId).toBe(message.id);

    // Clearing the chat severs the link but keeps the note (CF-10).
    await conversationRepo.delete(conversation.id, alice);
    const survivor = await noteRepo.findById(note.id, alice);
    expect(survivor).toBeDefined();
    expect(survivor?.sourceMessageId).toBeNull();
  });
});
