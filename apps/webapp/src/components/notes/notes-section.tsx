"use client";

import { useCallback, useEffect, useState } from "react";
import { Pin, Plus, StickyNote } from "lucide-react";
import {
  createNoteAction,
  listNotesAction,
  type NoteListItem,
} from "@/app/notebooks/[id]/notes/actions";
import { NoteDialog } from "@/components/notes/note-dialog";
import { useNotebookBridge } from "@/components/notebook-bridge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

// Notes section of the Studio column (ui-research §2.3): notes share the
// Studio output list, with "Add note" pinned at the bottom of the column.
// D2's generated artifacts mount above this section.

function noteDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function NotesSection({ notebookId }: { notebookId: string }) {
  const bridge = useNotebookBridge();
  const [notes, setNotes] = useState<NoteListItem[] | null>(null);
  const [openNote, setOpenNote] = useState<{
    id: string;
    startInEdit: boolean;
  } | null>(null);

  const refresh = useCallback(async () => {
    setNotes(await listNotesAction(notebookId));
  }, [notebookId]);

  // notesVersion bumps when "Save to note" fires over in the chat panel.
  const notesVersion = bridge?.notesVersion ?? 0;
  useEffect(() => {
    let cancelled = false;
    void listNotesAction(notebookId).then((list) => {
      if (!cancelled) {
        setNotes(list);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [notebookId, notesVersion]);

  async function handleAdd() {
    const result = await createNoteAction(notebookId);
    if (result.note) {
      setOpenNote({ id: result.note.id, startInEdit: true });
      await refresh();
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <h3 className="px-4 pt-3 pb-1 text-xs font-medium text-muted-foreground">
        Notes
      </h3>
      {notes === null ? (
        // First load: skeleton rows instead of a blank gap.
        <div className="flex-1 space-y-3 px-4 py-2" aria-hidden>
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      ) : notes.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 py-6 text-center">
          <div className="flex size-9 items-center justify-center rounded-full bg-muted">
            <StickyNote className="size-4 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">No notes yet</p>
          <p className="text-sm text-muted-foreground">
            Write one with “Add note” below, or pin a chat answer with “Save
            to note”.
          </p>
        </div>
      ) : (
        <ul className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
          {notes.map((note) => (
            <li key={note.id}>
              <button
                type="button"
                onClick={() => setOpenNote({ id: note.id, startInEdit: false })}
                className="flex w-full flex-col gap-0.5 rounded-md px-2 py-1.5 text-left hover:bg-accent"
              >
                <span className="w-full truncate text-sm" title={note.title}>
                  {note.title}
                </span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  {note.savedFromChat && (
                    <Pin className="size-3" aria-label="Saved from chat" />
                  )}
                  {noteDate(note.updatedAt)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="border-t p-3">
        <Button variant="outline" className="w-full" onClick={() => void handleAdd()}>
          <Plus /> Add note
        </Button>
      </div>

      <NoteDialog
        noteId={openNote?.id ?? null}
        startInEdit={openNote?.startInEdit ?? false}
        onClose={() => setOpenNote(null)}
        onChanged={refresh}
      />
    </div>
  );
}
