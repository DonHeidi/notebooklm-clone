import { getDb, type Database } from "../db";
import {
  createConversationRepository,
  type CitationWithContext,
} from "../repositories/conversation-repository";
import { NotFoundError } from "../repositories/errors";
import { createNoteRepository, type Note } from "../repositories/note-repository";

// Business layer for notes (CF-10): manual CRUD plus save-assistant-response-
// as-note. User-input problems surface as NoteInputError with presentable
// messages; ownership is enforced in the repositories on every call.

export class NoteInputError extends Error {}

export const MAX_NOTE_TITLE_CHARS = 200;
export const MAX_NOTE_CONTENT_CHARS = 100_000;

const DEFAULT_TITLE = "New note";
const SAVED_TITLE_FALLBACK = "Saved from chat";
const SAVED_TITLE_MAX = 80;

function repositories(database: Database = getDb()) {
  return {
    notes: createNoteRepository(database),
    conversations: createConversationRepository(database),
  };
}

function presentableTitle(title: string): string {
  const trimmed = title.trim();
  if (trimmed === "") {
    return DEFAULT_TITLE;
  }
  if (trimmed.length > MAX_NOTE_TITLE_CHARS) {
    throw new NoteInputError(
      `note titles are limited to ${MAX_NOTE_TITLE_CHARS} characters`,
    );
  }
  return trimmed;
}

function assertContentSize(content: string): void {
  if (content.length > MAX_NOTE_CONTENT_CHARS) {
    throw new NoteInputError(
      `notes are limited to ${MAX_NOTE_CONTENT_CHARS.toLocaleString("en-US")} characters`,
    );
  }
}

// Titles a saved response from the question that produced it (CF-10): first
// line of the user message, truncated; editable later like any note title.
export function deriveNoteTitle(question: string): string {
  const firstLine = question.split("\n", 1)[0].trim();
  if (firstLine === "") {
    return SAVED_TITLE_FALLBACK;
  }
  if (firstLine.length > SAVED_TITLE_MAX) {
    return `${firstLine.slice(0, SAVED_TITLE_MAX - 1).trimEnd()}…`;
  }
  return firstLine;
}

export async function listNotes(
  notebookId: string,
  ownerId: string,
  database?: Database,
): Promise<Note[]> {
  return repositories(database).notes.listByNotebook(notebookId, ownerId);
}

export async function createNote(
  ownerId: string,
  input: { notebookId: string; title: string; content: string },
  database?: Database,
): Promise<Note> {
  assertContentSize(input.content);
  return repositories(database).notes.create(ownerId, {
    notebookId: input.notebookId,
    title: presentableTitle(input.title),
    content: input.content,
  });
}

export async function updateNote(
  noteId: string,
  ownerId: string,
  patch: { title?: string; content?: string },
  database?: Database,
): Promise<Note> {
  const cleaned: { title?: string; content?: string } = {};
  if (patch.title !== undefined) {
    cleaned.title = presentableTitle(patch.title);
  }
  if (patch.content !== undefined) {
    assertContentSize(patch.content);
    cleaned.content = patch.content;
  }
  return repositories(database).notes.update(noteId, ownerId, cleaned);
}

export async function deleteNote(
  noteId: string,
  ownerId: string,
  database?: Database,
): Promise<void> {
  return repositories(database).notes.delete(noteId, ownerId);
}

// Save-assistant-response-as-note (CF-10). The message must be an assistant
// message inside a conversation of THIS notebook and owner — anything else
// is not found. Saving the same message again returns the existing note
// instead of stacking duplicates (cheap idempotence guard).
export async function saveMessageAsNote(
  ownerId: string,
  notebookId: string,
  messageId: string,
  database?: Database,
): Promise<Note> {
  const { notes, conversations } = repositories(database);
  const message = await conversations.findMessageById(messageId, ownerId);
  if (!message || message.role !== "assistant") {
    throw new NotFoundError("message not found");
  }
  const conversation = await conversations.findById(
    message.conversationId,
    ownerId,
  );
  if (!conversation || conversation.notebookId !== notebookId) {
    throw new NotFoundError("message not found");
  }

  const existing = (await notes.listByNotebook(notebookId, ownerId)).find(
    (note) => note.sourceMessageId === messageId,
  );
  if (existing) {
    return existing;
  }

  // Title from the conversation context: the user question this answer
  // replied to (nearest preceding user message).
  const history = await conversations.listMessages(conversation.id, ownerId);
  const index = history.findIndex((entry) => entry.id === messageId);
  const question = history
    .slice(0, index === -1 ? undefined : index)
    .reverse()
    .find((entry) => entry.role === "user");

  return notes.create(ownerId, {
    notebookId,
    title: deriveNoteTitle(question?.content ?? ""),
    content: message.content,
    sourceMessageId: messageId,
  });
}

// Note view (CF-10 "citations preserved"): the note plus the citation
// context of the message it was saved from. A manual or orphaned note
// (source message cleared → sourceMessageId set null) simply has none.
export async function getNoteWithCitations(
  noteId: string,
  ownerId: string,
  database?: Database,
): Promise<{ note: Note; citations: CitationWithContext[] } | undefined> {
  const { notes, conversations } = repositories(database);
  const note = await notes.findById(noteId, ownerId);
  if (!note) {
    return undefined;
  }
  const citations = note.sourceMessageId
    ? await conversations.listCitationsForMessage(note.sourceMessageId, ownerId)
    : [];
  return { note, citations };
}
