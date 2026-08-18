"use server";

import type { CitationData } from "@/lib/chat";
import { requireUser } from "@/server/auth";
import { NotFoundError } from "@/server/repositories/errors";
import type { Note } from "@/server/repositories/note-repository";
import {
  createNote,
  deleteNote,
  getNoteWithCitations,
  listNotes,
  NoteInputError,
  saveMessageAsNote,
  updateNote,
} from "@/server/services/note-service";

// Note server actions (CF-10) — the URL-path layer for the Studio notes
// section. Owner is always re-derived from the verified JWT; user-input
// problems come back as messages, anything else propagates.

export type NoteListItem = {
  id: string;
  title: string;
  // True while the source message still exists; clear-chat set-nulls the
  // link and the note continues as a plain note (designed behavior).
  savedFromChat: boolean;
  updatedAt: string;
  createdAt: string;
};

// Citations arrive in the same shape chat chips use, so a note's markers
// render (and navigate) exactly like the original answer's.
export type NoteDetail = NoteListItem & {
  content: string;
  citations: CitationData[];
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const isUuid = (value: string) =>
  typeof value === "string" && UUID_PATTERN.test(value);

function toListItem(note: Note): NoteListItem {
  return {
    id: note.id,
    title: note.title,
    savedFromChat: note.sourceMessageId !== null,
    updatedAt: note.updatedAt.toISOString(),
    createdAt: note.createdAt.toISOString(),
  };
}

export async function listNotesAction(
  notebookId: string,
): Promise<NoteListItem[]> {
  const user = await requireUser();
  const notes = await listNotes(notebookId, user.id);
  return notes.map(toListItem);
}

export async function getNoteAction(noteId: string): Promise<NoteDetail | null> {
  const user = await requireUser();
  if (!isUuid(noteId)) {
    return null;
  }
  const loaded = await getNoteWithCitations(noteId, user.id);
  if (!loaded) {
    return null;
  }
  return {
    ...toListItem(loaded.note),
    content: loaded.note.content,
    citations: loaded.citations.map((citation) => ({
      ordinal: citation.ordinal,
      chunkId: citation.chunkId,
      sourceId: citation.sourceId,
      sourceTitle: citation.sourceTitle,
      pageNumber: citation.pageNumber,
      section: citation.section,
    })),
  };
}

export async function createNoteAction(
  notebookId: string,
): Promise<{ note?: NoteListItem; error?: string }> {
  const user = await requireUser();
  try {
    const note = await createNote(user.id, {
      notebookId,
      title: "",
      content: "",
    });
    return { note: toListItem(note) };
  } catch (error) {
    if (error instanceof NoteInputError || error instanceof NotFoundError) {
      return { error: error.message };
    }
    throw error;
  }
}

export async function updateNoteAction(
  noteId: string,
  patch: { title?: string; content?: string },
): Promise<{ note?: NoteListItem; error?: string }> {
  const user = await requireUser();
  if (!isUuid(noteId)) {
    return { error: "note not found" };
  }
  try {
    const note = await updateNote(noteId, user.id, {
      title: typeof patch.title === "string" ? patch.title : undefined,
      content: typeof patch.content === "string" ? patch.content : undefined,
    });
    return { note: toListItem(note) };
  } catch (error) {
    if (error instanceof NoteInputError || error instanceof NotFoundError) {
      return { error: error.message };
    }
    throw error;
  }
}

export async function deleteNoteAction(
  noteId: string,
): Promise<{ error?: string }> {
  const user = await requireUser();
  if (!isUuid(noteId)) {
    return { error: "note not found" };
  }
  try {
    await deleteNote(noteId, user.id);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return { error: "note not found" };
    }
    throw error;
  }
  return {};
}

export async function saveMessageAsNoteAction(
  notebookId: string,
  messageId: string,
): Promise<{ note?: NoteListItem; error?: string }> {
  const user = await requireUser();
  if (!isUuid(messageId)) {
    return { error: "message not found" };
  }
  try {
    const note = await saveMessageAsNote(user.id, notebookId, messageId);
    return { note: toListItem(note) };
  } catch (error) {
    if (error instanceof NoteInputError || error instanceof NotFoundError) {
      return { error: error.message };
    }
    throw error;
  }
}
