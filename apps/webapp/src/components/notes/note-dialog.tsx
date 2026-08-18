"use client";

import { useEffect, useState } from "react";
import { Loader2, Pencil, Pin, StickyNote, Trash2 } from "lucide-react";
import {
  deleteNoteAction,
  getNoteAction,
  updateNoteAction,
  type NoteDetail,
} from "@/app/notebooks/[id]/notes/actions";
import { AssistantMarkdown } from "@/components/chat/assistant-markdown";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { CitationData } from "@/lib/chat";

// Note viewer/editor (CF-10). Viewing renders the content through the same
// markdown-ish renderer as chat, so a note saved from an answer keeps its
// citation chips — clickable via the NotebookBridge exactly like in chat.
// Markers whose citation no longer resolves (source deleted, or the source
// message cleared away — the designed set-null path) render inert with a
// "source removed" hint. Editing is plain text in a textarea, no rich text.

function citationsByOrdinal(citations: CitationData[]): Map<number, CitationData> {
  const map = new Map<number, CitationData>();
  for (const citation of citations) {
    map.set(citation.ordinal, citation);
  }
  return map;
}

export function NoteDialog({
  noteId,
  startInEdit,
  onClose,
  onChanged,
}: {
  noteId: string | null;
  startInEdit: boolean;
  onClose: () => void;
  onChanged: () => Promise<void> | void;
}) {
  const [loaded, setLoaded] = useState<NoteDetail | null>(null);
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftContent, setDraftContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Derive instead of resetting in an effect: a previously viewed note's
  // detail simply doesn't match the current noteId.
  const note = loaded && loaded.id === noteId ? loaded : null;

  // Reset per-note UI state when a different note opens — adjusted during
  // render, not in an effect.
  const [lastNoteId, setLastNoteId] = useState<string | null>(null);
  if (noteId !== lastNoteId) {
    setLastNoteId(noteId);
    setEditing(noteId !== null && startInEdit);
    setError(null);
  }

  useEffect(() => {
    if (!noteId) {
      return;
    }
    let cancelled = false;
    void getNoteAction(noteId).then((detail) => {
      if (cancelled || !detail) {
        return;
      }
      setLoaded(detail);
      setDraftTitle(detail.title);
      setDraftContent(detail.content);
    });
    return () => {
      cancelled = true;
    };
  }, [noteId]);

  async function handleSave() {
    if (!note || saving) {
      return;
    }
    setSaving(true);
    setError(null);
    const result = await updateNoteAction(note.id, {
      title: draftTitle,
      content: draftContent,
    });
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setLoaded({
      ...note,
      title: result.note?.title ?? draftTitle,
      content: draftContent,
    });
    setEditing(false);
    await onChanged();
  }

  async function handleDelete() {
    if (!note) {
      return;
    }
    setConfirmDelete(false);
    const result = await deleteNoteAction(note.id);
    if (result.error) {
      setError(result.error);
      return;
    }
    onClose();
    await onChanged();
  }

  return (
    <Dialog open={noteId !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[85dvh] flex-col sm:max-w-2xl">
        {note === null ? (
          <>
            <DialogHeader>
              <DialogTitle>Loading note…</DialogTitle>
              <DialogDescription>Fetching the note.</DialogDescription>
            </DialogHeader>
            <div className="flex items-center justify-center p-10">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          </>
        ) : editing ? (
          <>
            <DialogHeader>
              <DialogTitle>Edit note</DialogTitle>
              <DialogDescription>
                Title and plain-text content. Citation markers like [1] keep
                working as long as their sources exist.
              </DialogDescription>
            </DialogHeader>
            <Input
              value={draftTitle}
              onChange={(event) => setDraftTitle(event.target.value)}
              aria-label="Note title"
              placeholder="Note title"
            />
            <Textarea
              value={draftContent}
              onChange={(event) => setDraftContent(event.target.value)}
              aria-label="Note content"
              placeholder="Write your note…"
              className="min-h-48 flex-1"
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setDraftTitle(note.title);
                  setDraftContent(note.content);
                  setEditing(false);
                  setError(null);
                }}
              >
                Cancel
              </Button>
              <Button disabled={saving} onClick={() => void handleSave()}>
                {saving && <Loader2 className="animate-spin" />} Save
              </Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="pr-8">{note.title}</DialogTitle>
              <DialogDescription className="flex flex-wrap items-center gap-2">
                {note.savedFromChat && (
                  <Badge variant="secondary">
                    <Pin /> Saved from chat
                  </Badge>
                )}
                <span>
                  Edited{" "}
                  {new Date(note.updatedAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </DialogDescription>
            </DialogHeader>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {note.content.trim() === "" ? (
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                  <div className="flex size-10 items-center justify-center rounded-full bg-muted">
                    <StickyNote className="size-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    This note is empty.
                  </p>
                  <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                    <Pencil /> Add content
                  </Button>
                </div>
              ) : (
                <TooltipProvider>
                  <AssistantMarkdown
                    text={note.content}
                    citations={citationsByOrdinal(note.citations)}
                    unresolvedMarkers="removed"
                  />
                </TooltipProvider>
              )}
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 /> Delete
              </Button>
              <Button size="sm" onClick={() => setEditing(true)}>
                <Pencil /> Edit
              </Button>
            </div>
          </>
        )}

        <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete note?</AlertDialogTitle>
              <AlertDialogDescription>
                “{note?.title}” will be removed from this notebook.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={() => void handleDelete()}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}
