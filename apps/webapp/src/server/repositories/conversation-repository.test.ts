import { beforeAll, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import type { Database } from "../db";
import { createTestDatabase } from "../db/create-test-database";
import { EMBEDDING_DIMENSIONS, citations, messages } from "../db/schema";
import { createConversationRepository } from "./conversation-repository";
import { NotFoundError } from "./errors";
import { createNotebookRepository } from "./notebook-repository";
import { createSourceRepository } from "./source-repository";

let database: Database;

beforeAll(async () => {
  database = await createTestDatabase();
});

const owner = () => crypto.randomUUID();

async function setup(ownerId: string) {
  const notebook = await createNotebookRepository(database).create(
    ownerId,
    "Notebook",
  );
  const sourceRepo = createSourceRepository(database);
  const source = await sourceRepo.create(ownerId, {
    notebookId: notebook.id,
    type: "text",
    title: "Pasted",
    content: "Some source text",
  });
  const [chunk] = await sourceRepo.replaceChunks(source.id, ownerId, [
    {
      chunkIndex: 0,
      text: "Some source text",
      charStart: 0,
      charEnd: 16,
      embedding: Array.from({ length: EMBEDDING_DIMENSIONS }, () => 0),
    },
  ]);
  return { notebook, source, chunk };
}

describe("conversation repository", () => {
  test("create and listByNotebook are owner-scoped", async () => {
    const repo = createConversationRepository(database);
    const alice = owner();
    const { notebook } = await setup(alice);

    await repo.create(alice, notebook.id, "First chat");
    expect(await repo.listByNotebook(notebook.id, alice)).toHaveLength(1);

    expect(repo.create(owner(), notebook.id)).rejects.toThrow(NotFoundError);
    expect(repo.listByNotebook(notebook.id, owner())).rejects.toThrow(
      NotFoundError,
    );
  });

  test("appendMessage stores citations with ordinal and quote", async () => {
    const repo = createConversationRepository(database);
    const alice = owner();
    const { notebook, chunk } = await setup(alice);
    const conversation = await repo.create(alice, notebook.id);

    await repo.appendMessage(conversation.id, alice, {
      role: "user",
      content: "What does the source say?",
    });
    const answer = await repo.appendMessage(
      conversation.id,
      alice,
      { role: "assistant", content: "It says something [1]." },
      [{ chunkId: chunk.id, ordinal: 1, quote: "Some source text" }],
    );

    expect(answer.citations).toHaveLength(1);
    expect(answer.citations[0].ordinal).toBe(1);
    expect(answer.citations[0].quote).toBe("Some source text");
    expect(answer.citations[0].chunkId).toBe(chunk.id);

    expect(
      repo.appendMessage(conversation.id, owner(), {
        role: "user",
        content: "intruder",
      }),
    ).rejects.toThrow(NotFoundError);
  });

  test("listMessages returns messages in order with their citations", async () => {
    const repo = createConversationRepository(database);
    const alice = owner();
    const { notebook, chunk } = await setup(alice);
    const conversation = await repo.create(alice, notebook.id);

    await repo.appendMessage(conversation.id, alice, {
      role: "user",
      content: "Question?",
    });
    await repo.appendMessage(
      conversation.id,
      alice,
      { role: "assistant", content: "Answer [1]." },
      [{ chunkId: chunk.id, ordinal: 1, quote: "Some source text" }],
    );

    const history = await repo.listMessages(conversation.id, alice);
    expect(history).toHaveLength(2);
    expect(history[0].role).toBe("user");
    expect(history[0].citations).toHaveLength(0);
    expect(history[1].role).toBe("assistant");
    expect(history[1].citations).toHaveLength(1);

    expect(repo.listMessages(conversation.id, owner())).rejects.toThrow(
      NotFoundError,
    );
  });

  test("findMessageById is owner-scoped", async () => {
    const repo = createConversationRepository(database);
    const alice = owner();
    const { notebook } = await setup(alice);
    const conversation = await repo.create(alice, notebook.id);
    const message = await repo.appendMessage(conversation.id, alice, {
      role: "assistant",
      content: "Worth saving",
    });

    const found = await repo.findMessageById(message.id, alice);
    expect(found?.id).toBe(message.id);
    expect(found?.content).toBe("Worth saving");
    expect(found?.conversationId).toBe(conversation.id);

    expect(await repo.findMessageById(message.id, owner())).toBeUndefined();
    expect(await repo.findMessageById(crypto.randomUUID(), alice)).toBeUndefined();
  });

  test("listCitationsForMessage returns citation context, owner-scoped", async () => {
    const repo = createConversationRepository(database);
    const alice = owner();
    const { notebook, source, chunk } = await setup(alice);
    const conversation = await repo.create(alice, notebook.id);
    const message = await repo.appendMessage(
      conversation.id,
      alice,
      { role: "assistant", content: "Answer [1]." },
      [{ chunkId: chunk.id, ordinal: 1, quote: "Some source text" }],
    );

    const cited = await repo.listCitationsForMessage(message.id, alice);
    expect(cited).toHaveLength(1);
    expect(cited[0].ordinal).toBe(1);
    expect(cited[0].chunkId).toBe(chunk.id);
    expect(cited[0].sourceId).toBe(source.id);
    expect(cited[0].sourceTitle).toBe("Pasted");

    // A stranger sees nothing rather than an existence signal.
    expect(await repo.listCitationsForMessage(message.id, owner())).toHaveLength(0);
  });

  test("listCitationsForMessage drops citations whose source was deleted", async () => {
    const repo = createConversationRepository(database);
    const sourceRepo = createSourceRepository(database);
    const alice = owner();
    const { notebook, source, chunk } = await setup(alice);
    const conversation = await repo.create(alice, notebook.id);
    const message = await repo.appendMessage(
      conversation.id,
      alice,
      { role: "assistant", content: "Answer [1]." },
      [{ chunkId: chunk.id, ordinal: 1, quote: "Some source text" }],
    );

    await sourceRepo.delete(source.id, alice);
    expect(await repo.listCitationsForMessage(message.id, alice)).toHaveLength(0);
  });

  test("delete clears the conversation and cascades to messages and citations", async () => {
    const repo = createConversationRepository(database);
    const alice = owner();
    const { notebook, chunk } = await setup(alice);
    const conversation = await repo.create(alice, notebook.id);
    const message = await repo.appendMessage(
      conversation.id,
      alice,
      { role: "assistant", content: "Answer [1]." },
      [{ chunkId: chunk.id, ordinal: 1, quote: "Some source text" }],
    );

    expect(repo.delete(conversation.id, owner())).rejects.toThrow(NotFoundError);
    await repo.delete(conversation.id, alice);

    expect(await repo.findById(conversation.id, alice)).toBeUndefined();
    expect(
      await database
        .select()
        .from(messages)
        .where(eq(messages.conversationId, conversation.id)),
    ).toHaveLength(0);
    expect(
      await database
        .select()
        .from(citations)
        .where(eq(citations.messageId, message.id)),
    ).toHaveLength(0);
  });
});
