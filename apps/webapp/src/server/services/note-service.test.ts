import { beforeAll, describe, expect, test } from "bun:test";
import type { Database } from "../db";
import { createTestDatabase } from "../db/create-test-database";
import { EMBEDDING_DIMENSIONS } from "../db/schema";
import { createConversationRepository } from "../repositories/conversation-repository";
import { NotFoundError } from "../repositories/errors";
import { createNotebookRepository } from "../repositories/notebook-repository";
import { createSourceRepository } from "../repositories/source-repository";
import {
  createNote,
  deleteNote,
  deriveNoteTitle,
  getNoteWithCitations,
  listNotes,
  MAX_NOTE_CONTENT_CHARS,
  NoteInputError,
  saveMessageAsNote,
  updateNote,
} from "./note-service";

let database: Database;

beforeAll(async () => {
  database = await createTestDatabase();
});

const owner = () => crypto.randomUUID();

async function notebookFor(ownerId: string) {
  return createNotebookRepository(database).create(ownerId, "Notebook");
}

// A notebook with one ready source/chunk and a cited assistant exchange —
// the save-as-note raw material.
async function citedExchange(ownerId: string, question = "What is zymurgy?") {
  const notebook = await notebookFor(ownerId);
  const sourceRepo = createSourceRepository(database);
  const source = await sourceRepo.create(ownerId, {
    notebookId: notebook.id,
    type: "text",
    title: "Brewing notes",
    content: "Zymurgy is the study of fermentation.",
  });
  const [chunk] = await sourceRepo.replaceChunks(source.id, ownerId, [
    {
      chunkIndex: 0,
      text: "Zymurgy is the study of fermentation.",
      charStart: 0,
      charEnd: 37,
      embedding: Array.from({ length: EMBEDDING_DIMENSIONS }, () => 0),
    },
  ]);
  const conversationRepo = createConversationRepository(database);
  const conversation = await conversationRepo.create(ownerId, notebook.id);
  await conversationRepo.appendMessage(conversation.id, ownerId, {
    role: "user",
    content: question,
  });
  const answer = await conversationRepo.appendMessage(
    conversation.id,
    ownerId,
    { role: "assistant", content: "It studies fermentation [1]." },
    [{ chunkId: chunk.id, ordinal: 1, quote: chunk.text }],
  );
  return { notebook, source, chunk, conversation, answer };
}

describe("deriveNoteTitle", () => {
  test("uses the first line of the question, trimmed", () => {
    expect(deriveNoteTitle("What is zymurgy?\nAnd why?")).toBe(
      "What is zymurgy?",
    );
    expect(deriveNoteTitle("  spaced  ")).toBe("spaced");
  });

  test("truncates long questions with an ellipsis", () => {
    const long = "w".repeat(120);
    const title = deriveNoteTitle(long);
    expect(title.length).toBeLessThanOrEqual(80);
    expect(title.endsWith("…")).toBe(true);
  });

  test("falls back when the question is empty", () => {
    expect(deriveNoteTitle("")).toBe("Saved from chat");
    expect(deriveNoteTitle("   \n  ")).toBe("Saved from chat");
  });
});

describe("createNote / updateNote / deleteNote", () => {
  test("creates a manual note with defaults for blank title", async () => {
    const alice = owner();
    const notebook = await notebookFor(alice);
    const note = await createNote(
      alice,
      { notebookId: notebook.id, title: "  ", content: "" },
      database,
    );
    expect(note.title).toBe("New note");
    expect(note.content).toBe("");
    expect(note.sourceMessageId).toBeNull();
    expect(await listNotes(notebook.id, alice, database)).toHaveLength(1);
  });

  test("rejects oversized content with a user-presentable message", async () => {
    const alice = owner();
    const notebook = await notebookFor(alice);
    expect(
      createNote(
        alice,
        {
          notebookId: notebook.id,
          title: "Big",
          content: "x".repeat(MAX_NOTE_CONTENT_CHARS + 1),
        },
        database,
      ),
    ).rejects.toThrow(NoteInputError);
  });

  test("updates title and content, keeping blank titles presentable", async () => {
    const alice = owner();
    const notebook = await notebookFor(alice);
    const note = await createNote(
      alice,
      { notebookId: notebook.id, title: "Draft", content: "v1" },
      database,
    );
    const updated = await updateNote(
      note.id,
      alice,
      { title: "", content: "v2" },
      database,
    );
    expect(updated.title).toBe("New note");
    expect(updated.content).toBe("v2");

    await deleteNote(note.id, alice, database);
    expect(await listNotes(notebook.id, alice, database)).toHaveLength(0);
  });
});

describe("saveMessageAsNote", () => {
  test("creates a note titled from the user question, linked to the message", async () => {
    const alice = owner();
    const { notebook, answer } = await citedExchange(alice);

    const note = await saveMessageAsNote(alice, notebook.id, answer.id, database);
    expect(note.title).toBe("What is zymurgy?");
    expect(note.content).toBe("It studies fermentation [1].");
    expect(note.sourceMessageId).toBe(answer.id);
  });

  test("saving the same message twice returns the existing note", async () => {
    const alice = owner();
    const { notebook, answer } = await citedExchange(alice);

    const first = await saveMessageAsNote(alice, notebook.id, answer.id, database);
    const second = await saveMessageAsNote(alice, notebook.id, answer.id, database);
    expect(second.id).toBe(first.id);
    expect(await listNotes(notebook.id, alice, database)).toHaveLength(1);
  });

  test("rejects foreign owners, foreign notebooks, and user-role messages", async () => {
    const alice = owner();
    const { notebook, answer, conversation } = await citedExchange(alice);

    expect(
      saveMessageAsNote(owner(), notebook.id, answer.id, database),
    ).rejects.toThrow(NotFoundError);

    const otherNotebook = await notebookFor(alice);
    expect(
      saveMessageAsNote(alice, otherNotebook.id, answer.id, database),
    ).rejects.toThrow(NotFoundError);

    const conversationRepo = createConversationRepository(database);
    const history = await conversationRepo.listMessages(conversation.id, alice);
    const userMessage = history.find((message) => message.role === "user")!;
    expect(
      saveMessageAsNote(alice, notebook.id, userMessage.id, database),
    ).rejects.toThrow(NotFoundError);
  });
});

describe("getNoteWithCitations", () => {
  test("returns the note with its message's citation context", async () => {
    const alice = owner();
    const { notebook, answer, source, chunk } = await citedExchange(alice);
    const note = await saveMessageAsNote(alice, notebook.id, answer.id, database);

    const loaded = await getNoteWithCitations(note.id, alice, database);
    expect(loaded?.note.id).toBe(note.id);
    expect(loaded?.citations).toHaveLength(1);
    expect(loaded?.citations[0].chunkId).toBe(chunk.id);
    expect(loaded?.citations[0].sourceId).toBe(source.id);
    expect(loaded?.citations[0].sourceTitle).toBe("Brewing notes");

    expect(await getNoteWithCitations(note.id, owner(), database)).toBeUndefined();
  });

  test("deleting the cited source leaves the note with no citations", async () => {
    const alice = owner();
    const { notebook, answer, source } = await citedExchange(alice);
    const note = await saveMessageAsNote(alice, notebook.id, answer.id, database);

    await createSourceRepository(database).delete(source.id, alice);
    const loaded = await getNoteWithCitations(note.id, alice, database);
    expect(loaded?.note.id).toBe(note.id);
    expect(loaded?.citations).toHaveLength(0);
  });

  test("clearing the chat orphans the note gracefully", async () => {
    const alice = owner();
    const { notebook, answer, conversation } = await citedExchange(alice);
    const note = await saveMessageAsNote(alice, notebook.id, answer.id, database);

    await createConversationRepository(database).delete(conversation.id, alice);
    const loaded = await getNoteWithCitations(note.id, alice, database);
    expect(loaded?.note.sourceMessageId).toBeNull();
    expect(loaded?.citations).toHaveLength(0);
  });
});
