"use client";

import { useCallback, useEffect, useState } from "react";
import { FileText, Globe, Loader2, Plus, Trash2, Type } from "lucide-react";
import {
  deleteSourceAction,
  listSourcesAction,
  type SourceListItem,
} from "@/app/notebooks/[id]/sources/actions";
import { AddSourcesDialog } from "@/components/sources/add-sources-dialog";
import { SourceViewer } from "@/components/sources/source-viewer";
import { Checkbox } from "@/components/ui/checkbox";
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

const TYPE_ICONS = {
  file: FileText,
  url: Globe,
  text: Type,
} as const;

// Sources panel (ui-research §2.1): list + add dialog + viewer. Live status
// uses lightweight polling — a 2.5 s interval that only runs while a source
// is pending/processing (in-process ingestion finishes in seconds, so the
// polling window is short); see the session PR for the Realtime trade-off.
const POLL_INTERVAL_MS = 2500;

export function SourcesPanel({
  notebookId,
  userId,
  initialSources,
  selectedIds,
  onToggleSource,
  onSourcesUpdated,
}: {
  notebookId: string;
  userId: string;
  initialSources: SourceListItem[];
  /** Chat-grounding selection (CF-05): ready sources whose checkbox is on. */
  selectedIds: string[];
  onToggleSource: (sourceId: string) => void;
  /** Fires after every list refresh so the workspace can reconcile the
   * selection (auto-select newly ready sources, drop deleted ones). */
  onSourcesUpdated: (sources: SourceListItem[]) => void;
}) {
  const [sources, setSources] = useState(initialSources);
  const [viewerSourceId, setViewerSourceId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<SourceListItem | null>(null);

  const refresh = useCallback(async () => {
    setSources(await listSourcesAction(notebookId));
  }, [notebookId]);

  useEffect(() => {
    onSourcesUpdated(sources);
  }, [sources, onSourcesUpdated]);

  const hasActive = sources.some(
    (s) => s.status === "pending" || s.status === "processing",
  );
  useEffect(() => {
    if (!hasActive) {
      return;
    }
    const timer = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [hasActive, refresh]);

  async function confirmDelete() {
    if (!pendingDelete) {
      return;
    }
    await deleteSourceAction(pendingDelete.id, notebookId);
    setPendingDelete(null);
    if (viewerSourceId === pendingDelete.id) {
      setViewerSourceId(null);
    }
    await refresh();
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="p-3">
        <AddSourcesDialog
          notebookId={notebookId}
          userId={userId}
          onAdded={refresh}
          trigger={
            <Button variant="outline" className="w-full">
              <Plus /> Add sources
            </Button>
          }
        />
      </div>

      {sources.length === 0 ? (
        <p className="flex flex-1 items-center justify-center p-6 text-center text-sm text-muted-foreground">
          Saved sources will appear here. Add PDFs, text or websites to ground
          the chat.
        </p>
      ) : (
        <ul className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
          {sources.map((source) => (
            <SourceRow
              key={source.id}
              source={source}
              selected={selectedIds.includes(source.id)}
              onToggle={() => onToggleSource(source.id)}
              onOpen={() => setViewerSourceId(source.id)}
              onDelete={() => setPendingDelete(source)}
            />
          ))}
        </ul>
      )}

      <SourceViewer
        sourceId={viewerSourceId}
        onClose={() => setViewerSourceId(null)}
        onDelete={(source) => setPendingDelete(source)}
      />

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete source?</AlertDialogTitle>
            <AlertDialogDescription>
              “{pendingDelete?.title}” and its indexed chunks will be removed
              from this notebook. Chat citations pointing at it will stop
              resolving.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SourceRow({
  source,
  selected,
  onToggle,
  onOpen,
  onDelete,
}: {
  source: SourceListItem;
  selected: boolean;
  onToggle: () => void;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const Icon = TYPE_ICONS[source.type];
  const processing = source.status === "pending" || source.status === "processing";
  return (
    <li className="group flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent">
      {source.status === "ready" && (
        <Checkbox
          checked={selected}
          onCheckedChange={onToggle}
          aria-label={`Use ${source.title} to ground the chat`}
        />
      )}
      <button
        type="button"
        onClick={onOpen}
        className="flex min-w-0 flex-1 items-center gap-2 text-left"
      >
        <Icon className="size-4 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate text-sm" title={source.title}>
          {source.title}
        </span>
        {processing && (
          <Loader2
            className="size-4 shrink-0 animate-spin text-muted-foreground"
            aria-label="Processing"
          />
        )}
        {source.status === "failed" && (
          <Badge variant="destructive" title={source.errorMessage ?? undefined}>
            Failed
          </Badge>
        )}
      </button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`Delete ${source.title}`}
        className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
        onClick={onDelete}
      >
        <Trash2 />
      </Button>
    </li>
  );
}
