import { beforeAll, describe, expect, test } from "bun:test";
import type { Embedder } from "../ai/embeddings";
import type { Database } from "../db";
import { createTestDatabase } from "../db/create-test-database";
import { EMBEDDING_DIMENSIONS } from "../db/schema";
import { NotFoundError } from "../repositories/errors";
import { createNotebookRepository } from "../repositories/notebook-repository";
import { createSourceRepository } from "../repositories/source-repository";
import {
  clearConversation,
  getOrCreateConversation,
  loadConversation,
  persistAssistantMessage,
  persistUserMessage,
  prepareGrounding,
} from "./chat-service";

const OWNER = "11111111-1111-4111-8111-111111111111";
const STRANGER = "22222222-2222-4222-8222-222222222222";

function unitVector(index: number): number[] {
  const vector = new Array<number>(EMBEDDING_DIMENSIONS).fill(0);
  vector[index] = 1;
  return vector;
}

// Deterministic fake: every text embeds to the same unit vector, so vector
// ranks are ties and full-text decides — sufficient for service-level tests.
const fakeEmbedder: Embedder = {
  async embed(texts) {
    return texts.map(() => unitVector(0));
  },
};

describe("chat service", () => {
  let db: Database;
  let notebookId: string;
  let sourceId: string;

  beforeAll(async () => {
    db = await createTestDatabase();
    const notebooks = createNotebookRepository(db);
    notebookId = (await notebooks.create(OWNER, "Research")).id;
    const sources = createSourceRepository(db);
    const source = await sources.create(OWNER, {
      notebookId,
      type: "text",
      title: "Alpha paper",
      content: "Zymurgy is the study of fermentation.",
    });
    sourceId = source.id;
    await sources.replaceChunks(sourceId, OWNER, [
      {
        chunkIndex: 0,
        text: "Zymurgy is the study of fermentation.",
        charStart: 0,
        charEnd: 37,
        embedding: unitVector(0),
      },
    ]);
    await sources.update(sourceId, OWNER, { status: "ready" });
  });

  test("getOrCreateConversation creates once and then reuses it", async () => {
    const first = await getOrCreateConversation(notebookId, OWNER, { db });
    const second = await getOrCreateConversation(notebookId, OWNER, { db });
    expect(second.id).toBe(first.id);
  });

  test("zero-source mode skips retrieval and instructs disclosure", async () => {
    const neverCalled: Embedder = {
      async embed() {
        throw new Error("retrieval must not run in zero-source mode");
      },
    };
    const grounding = await prepareGrounding(
      {
        notebookId,
        ownerId: OWNER,
        selectedSourceIds: [],
        question: "What is zymurgy?",
      },
      { db, embedder: neverCalled },
    );
    expect(grounding.retrieved).toEqual([]);
    expect(grounding.system).toContain("general knowledge");
    expect(grounding.system).not.toContain("<<<BEGIN SOURCE");
  });

  test("grounded mode retrieves the selection and quotes it delimited", async () => {
    const grounding = await prepareGrounding(
      {
        notebookId,
        ownerId: OWNER,
        selectedSourceIds: [sourceId],
        question: "What is zymurgy?",
      },
      { db, embedder: fakeEmbedder },
    );
    expect(grounding.retrieved.length).toBe(1);
    expect(grounding.retrieved[0].sourceId).toBe(sourceId);
    expect(grounding.system).toContain("<<<BEGIN SOURCE [1] — Alpha paper>>>");
    expect(grounding.system).toContain("Zymurgy is the study of fermentation.");
  });

  test("grounded mode is owner-scoped end to end", async () => {
    await expect(
      prepareGrounding(
        {
          notebookId,
          ownerId: STRANGER,
          selectedSourceIds: [sourceId],
          question: "What is zymurgy?",
        },
        { db, embedder: fakeEmbedder },
      ),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  test("persist + load round-trips an exchange with citation context", async () => {
    const conversation = await getOrCreateConversation(notebookId, OWNER, { db });
    await persistUserMessage(conversation.id, OWNER, "What is zymurgy?", { db });
    const grounding = await prepareGrounding(
      {
        notebookId,
        ownerId: OWNER,
        selectedSourceIds: [sourceId],
        question: "What is zymurgy?",
      },
      { db, embedder: fakeEmbedder },
    );
    await persistAssistantMessage(
      conversation.id,
      OWNER,
      "Zymurgy is the study of fermentation [1].",
      [
        {
          chunkId: grounding.retrieved[0].chunkId,
          ordinal: 1,
          quote: grounding.retrieved[0].text,
        },
      ],
      { db },
    );

    const loaded = await loadConversation(notebookId, OWNER, { db });
    expect(loaded).not.toBeNull();
    expect(loaded!.messages).toHaveLength(2);
    const assistant = loaded!.messages[1];
    expect(assistant.role).toBe("assistant");
    expect(assistant.citations).toHaveLength(1);
    expect(assistant.citations[0].ordinal).toBe(1);
    expect(assistant.citations[0].sourceTitle).toBe("Alpha paper");
    expect(assistant.citations[0].sourceId).toBe(sourceId);
  });

  test("clearConversation removes history; next exchange starts fresh", async () => {
    await clearConversation(notebookId, OWNER, { db });
    expect(await loadConversation(notebookId, OWNER, { db })).toBeNull();
    const fresh = await getOrCreateConversation(notebookId, OWNER, { db });
    const messages = (await loadConversation(notebookId, OWNER, { db }))!.messages;
    expect(messages).toHaveLength(0);
    expect(fresh.notebookId).toBe(notebookId);
  });

  test("loadConversation rejects for a stranger (owner-scoped)", async () => {
    await getOrCreateConversation(notebookId, OWNER, { db });
    await expect(
      loadConversation(notebookId, STRANGER, { db }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
