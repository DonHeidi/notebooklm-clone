import { beforeAll, describe, expect, test } from "bun:test";
import type { Database } from "../db";
import { createTestDatabase } from "../db/create-test-database";
import { createArtifactRepository } from "../repositories/artifact-repository";
import { createConversationRepository } from "../repositories/conversation-repository";
import { createNotebookRepository } from "../repositories/notebook-repository";
import { createSourceRepository } from "../repositories/source-repository";
import {
  createAudioOverview,
  ArtifactInputError,
  MAX_AUDIO_OVERVIEWS_PER_USER_PER_DAY,
} from "./audio-overview-service";
import {
  assertChatMessageQuota,
  ChatQuotaError,
  MAX_CHAT_MESSAGES_PER_NOTEBOOK_PER_DAY,
} from "./chat-service";
import {
  createNotebook,
  MAX_NOTEBOOKS_PER_USER,
  NotebookQuotaError,
} from "./notebook-service";
import { startOfUtcDay } from "./quota";

// Per-user quotas (SF-11 / NF-15 minimum, A6): notebooks per user, chat
// messages per notebook per day, audio overviews per user per day — all
// enforced in the service layer through repository count queries.

let database: Database;

beforeAll(async () => {
  database = await createTestDatabase();
});

const owner = () => crypto.randomUUID();

describe("startOfUtcDay", () => {
  test("floors to UTC midnight", () => {
    const since = startOfUtcDay(new Date("2026-08-18T21:37:11.500Z"));
    expect(since.toISOString()).toBe("2026-08-18T00:00:00.000Z");
  });
});

describe("notebooks per user", () => {
  test("allows creation up to the cap, rejects the next with a message naming the limit", async () => {
    const ownerId = owner();
    for (let i = 0; i < MAX_NOTEBOOKS_PER_USER; i++) {
      await createNotebook(ownerId, database);
    }
    expect(createNotebook(ownerId, database)).rejects.toThrow(
      NotebookQuotaError,
    );
    expect(createNotebook(ownerId, database)).rejects.toThrow(
      `limit of ${MAX_NOTEBOOKS_PER_USER} notebooks`,
    );
  });

  test("the cap is per user — another user still creates freely", async () => {
    const capped = owner();
    for (let i = 0; i < MAX_NOTEBOOKS_PER_USER; i++) {
      await createNotebook(capped, database);
    }
    const other = owner();
    const notebook = await createNotebook(other, database);
    expect(notebook.ownerId).toBe(other);
  });

  test("deleting a notebook frees a slot", async () => {
    const ownerId = owner();
    const first = await createNotebook(ownerId, database);
    for (let i = 1; i < MAX_NOTEBOOKS_PER_USER; i++) {
      await createNotebook(ownerId, database);
    }
    expect(createNotebook(ownerId, database)).rejects.toThrow(
      NotebookQuotaError,
    );
    await createNotebookRepository(database).delete(first.id, ownerId);
    const replacement = await createNotebook(ownerId, database);
    expect(replacement.ownerId).toBe(ownerId);
  });
});

describe("chat messages per notebook per day", () => {
  async function conversationWithMessages(
    ownerId: string,
    userMessages: number,
    assistantMessages = 0,
  ) {
    const notebook = await createNotebookRepository(database).create(
      ownerId,
      "Chatty",
    );
    const conversations = createConversationRepository(database);
    const conversation = await conversations.create(ownerId, notebook.id);
    for (let i = 0; i < userMessages; i++) {
      await conversations.appendMessage(conversation.id, ownerId, {
        role: "user",
        content: `question ${i}`,
      });
    }
    for (let i = 0; i < assistantMessages; i++) {
      await conversations.appendMessage(conversation.id, ownerId, {
        role: "assistant",
        content: `answer ${i}`,
      });
    }
    return { notebook, conversation };
  }

  test("passes below the cap, rejects at the cap with a message naming the limit", async () => {
    const ownerId = owner();
    const { notebook } = await conversationWithMessages(
      ownerId,
      MAX_CHAT_MESSAGES_PER_NOTEBOOK_PER_DAY - 1,
    );
    await assertChatMessageQuota(notebook.id, ownerId, { db: database });

    const conversations = createConversationRepository(database);
    const [conversation] = await conversations.listByNotebook(
      notebook.id,
      ownerId,
    );
    await conversations.appendMessage(conversation.id, ownerId, {
      role: "user",
      content: "the one that hits the cap",
    });
    expect(
      assertChatMessageQuota(notebook.id, ownerId, { db: database }),
    ).rejects.toThrow(ChatQuotaError);
    expect(
      assertChatMessageQuota(notebook.id, ownerId, { db: database }),
    ).rejects.toThrow(
      `daily limit of ${MAX_CHAT_MESSAGES_PER_NOTEBOOK_PER_DAY} chat messages`,
    );
  });

  test("assistant messages do not count against the cap", async () => {
    const ownerId = owner();
    const { notebook } = await conversationWithMessages(
      ownerId,
      1,
      MAX_CHAT_MESSAGES_PER_NOTEBOOK_PER_DAY,
    );
    await assertChatMessageQuota(notebook.id, ownerId, { db: database });
  });

  test("the cap is per notebook — a second notebook still chats", async () => {
    const ownerId = owner();
    await conversationWithMessages(
      ownerId,
      MAX_CHAT_MESSAGES_PER_NOTEBOOK_PER_DAY,
    );
    const fresh = await createNotebookRepository(database).create(
      ownerId,
      "Fresh",
    );
    await assertChatMessageQuota(fresh.id, ownerId, { db: database });
  });

  test("the count window is time-bounded (repository honors `since`)", async () => {
    const ownerId = owner();
    const { notebook } = await conversationWithMessages(ownerId, 3);
    const conversations = createConversationRepository(database);
    const past = await conversations.countUserMessagesForNotebookSince(
      notebook.id,
      ownerId,
      new Date(0),
    );
    expect(past).toBe(3);
    const future = await conversations.countUserMessagesForNotebookSince(
      notebook.id,
      ownerId,
      new Date(Date.now() + 60_000),
    );
    expect(future).toBe(0);
  });
});

describe("audio overviews per user per day", () => {
  async function notebookWithReadySource(ownerId: string) {
    const notebook = await createNotebookRepository(database).create(
      ownerId,
      "Audio",
    );
    const sources = createSourceRepository(database);
    const source = await sources.create(ownerId, {
      notebookId: notebook.id,
      type: "text",
      title: "Ready source",
      content: "Enough text to narrate.",
    });
    await sources.update(source.id, ownerId, { status: "ready" });
    return { notebook, source };
  }

  async function createReadyOverview(
    ownerId: string,
    notebookId: string,
    sourceId: string,
  ) {
    const artifact = await createAudioOverview(
      ownerId,
      { notebookId, language: "en", sourceIds: [sourceId] },
      { db: database },
    );
    // Completed generation, so the 1-concurrent guard never interferes with
    // what this suite is exercising.
    await createArtifactRepository(database).update(artifact.id, ownerId, {
      status: "ready",
    });
    return artifact;
  }

  test("allows creations up to the daily cap, rejects the next across notebooks (per user)", async () => {
    const ownerId = owner();
    const a = await notebookWithReadySource(ownerId);
    for (let i = 0; i < MAX_AUDIO_OVERVIEWS_PER_USER_PER_DAY; i++) {
      await createReadyOverview(ownerId, a.notebook.id, a.source.id);
    }
    // A different notebook of the SAME user is still capped.
    const b = await notebookWithReadySource(ownerId);
    expect(
      createAudioOverview(
        ownerId,
        {
          notebookId: b.notebook.id,
          language: "en",
          sourceIds: [b.source.id],
        },
        { db: database },
      ),
    ).rejects.toThrow(ArtifactInputError);
    expect(
      createAudioOverview(
        ownerId,
        {
          notebookId: b.notebook.id,
          language: "en",
          sourceIds: [b.source.id],
        },
        { db: database },
      ),
    ).rejects.toThrow(
      `today's limit of ${MAX_AUDIO_OVERVIEWS_PER_USER_PER_DAY} audio overviews`,
    );
  });

  test("another user is unaffected by a capped user", async () => {
    const capped = owner();
    const a = await notebookWithReadySource(capped);
    for (let i = 0; i < MAX_AUDIO_OVERVIEWS_PER_USER_PER_DAY; i++) {
      await createReadyOverview(capped, a.notebook.id, a.source.id);
    }
    const other = owner();
    const b = await notebookWithReadySource(other);
    const artifact = await createAudioOverview(
      other,
      { notebookId: b.notebook.id, language: "en", sourceIds: [b.source.id] },
      { db: database },
    );
    expect(artifact.status).toBe("pending");
  });

  test("the count window is time-bounded (repository honors `since`)", async () => {
    const ownerId = owner();
    const { notebook, source } = await notebookWithReadySource(ownerId);
    await createReadyOverview(ownerId, notebook.id, source.id);
    const artifactRepository = createArtifactRepository(database);
    expect(await artifactRepository.countByOwnerSince(ownerId, new Date(0))).toBe(1);
    expect(
      await artifactRepository.countByOwnerSince(
        ownerId,
        new Date(Date.now() + 60_000),
      ),
    ).toBe(0);
  });
});
