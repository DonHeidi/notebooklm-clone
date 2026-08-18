"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import {
  AudioLines,
  ChevronRight,
  Download,
  Loader2,
  Play,
  RefreshCw,
  Trash2,
} from "lucide-react";
import {
  deleteArtifactAction,
  getArtifactAudioUrlAction,
  listArtifactsAction,
  regenerateArtifactAction,
  renameArtifactAction,
  type ArtifactListItem,
} from "@/app/notebooks/[id]/studio/actions";
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
import { Input } from "@/components/ui/input";
import { AudioOverviewDialog } from "./audio-overview-dialog";

// Serializable slice of the server-side voice catalog, passed down from the
// page (server component) so the client bundle needs no server import.
export type VoiceCatalog = {
  options: { key: string; label: string; language: "de" | "en" }[];
  defaults: Record<"de" | "en", string>;
};

// Studio panel (ui-research §2.3): generator tiles on top, generated
// artifacts as a list below. Phase 1 ships the Audio Overview tile only —
// absent tiles stay absent, keeping the layout honest. Status uses the same
// short-interval polling as the Sources panel.
const POLL_INTERVAL_MS = 2500;

export function StudioPanel({
  notebookId,
  voices,
  initialArtifacts,
}: {
  notebookId: string;
  voices: VoiceCatalog;
  initialArtifacts: ArtifactListItem[];
}) {
  const [artifacts, setArtifacts] = useState(initialArtifacts);
  const [configOpen, setConfigOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<ArtifactListItem | null>(
    null,
  );

  const refresh = useCallback(async () => {
    setArtifacts(await listArtifactsAction(notebookId));
  }, [notebookId]);

  const hasActive = artifacts.some(
    (a) => a.status === "pending" || a.status === "processing",
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
    await deleteArtifactAction(pendingDelete.id);
    setPendingDelete(null);
    await refresh();
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="p-3">
        <button
          type="button"
          onClick={() => setConfigOpen(true)}
          className="flex w-full items-center gap-2 rounded-lg border px-3 py-2.5 text-sm hover:bg-accent"
        >
          <AudioLines className="size-4 shrink-0 text-muted-foreground" />
          <span className="flex-1 text-left font-medium">Audio Overview</span>
          <Badge variant="secondary">Beta</Badge>
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
        </button>
      </div>

      {artifacts.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
          <div className="flex size-10 items-center justify-center rounded-full bg-muted">
            <AudioLines className="size-5 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">No Studio output yet</p>
            <p className="text-sm text-muted-foreground">
              Turn your sources into a short spoken episode — it generates in
              the background and is saved here.
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={() => setConfigOpen(true)}>
            <AudioLines /> Create an Audio Overview
          </Button>
        </div>
      ) : (
        <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 pb-3">
          {artifacts.map((artifact) => (
            <ArtifactRow
              key={artifact.id}
              artifact={artifact}
              onChanged={refresh}
              onDelete={() => setPendingDelete(artifact)}
            />
          ))}
        </ul>
      )}

      <AudioOverviewDialog
        notebookId={notebookId}
        voices={voices}
        open={configOpen}
        onOpenChange={setConfigOpen}
        onCreated={refresh}
      />

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete audio overview?</AlertDialogTitle>
            <AlertDialogDescription>
              “{pendingDelete?.title}” and its audio file will be removed from
              this notebook.
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

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function ArtifactRow({
  artifact,
  onChanged,
  onDelete,
}: {
  artifact: ArtifactListItem;
  onChanged: () => Promise<void>;
  onDelete: () => void;
}) {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();
  const generating =
    artifact.status === "pending" || artifact.status === "processing";

  // The signed URL is short-lived, so it is fetched when the user hits play
  // (and dropped again when the artifact regenerates).
  // Drop the stale signed URL the moment a regeneration starts —
  // render-time adjustment instead of a sync setState in an effect
  // (react-hooks/set-state-in-effect).
  const [wasGenerating, setWasGenerating] = useState(generating);
  if (generating !== wasGenerating) {
    setWasGenerating(generating);
    if (generating) {
      setAudioUrl(null);
    }
  }

  async function play() {
    setBusy(true);
    try {
      const { url } = await getArtifactAudioUrlAction(artifact.id);
      if (url) {
        setAudioUrl(url);
      }
    } finally {
      setBusy(false);
    }
  }

  async function download() {
    const { url } = await getArtifactAudioUrlAction(artifact.id, {
      download: true,
    });
    if (url) {
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.click();
    }
  }

  async function regenerate() {
    setAudioUrl(null);
    await regenerateArtifactAction(artifact.id);
    await onChanged();
  }

  return (
    <li className="group rounded-lg border p-2.5">
      <div className="flex items-center gap-2">
        <ArtifactTitle
          artifact={artifact}
          onRenamed={() => startTransition(onChanged)}
        />
        {generating && (
          <Loader2
            className="size-4 shrink-0 animate-spin text-muted-foreground"
            aria-label="Generating"
          />
        )}
        {artifact.status === "failed" && (
          <Badge variant="destructive">Failed</Badge>
        )}
      </div>

      {artifact.status === "failed" && artifact.errorMessage && (
        // Visible in the row, not tooltip-only — the failure reason tells the
        // user whether a retry can work.
        <p className="mt-1 text-xs text-destructive">{artifact.errorMessage}</p>
      )}

      <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
        <span className="flex-1">
          {artifact.language === "de" ? "German" : "English"}
          {artifact.durationSeconds !== null &&
            artifact.status === "ready" &&
            ` · ${formatDuration(artifact.durationSeconds)}`}
        </span>
        {artifact.status === "ready" && (
          <>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Download ${artifact.title}`}
              onClick={download}
            >
              <Download />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Regenerate ${artifact.title}`}
              onClick={regenerate}
            >
              <RefreshCw />
            </Button>
          </>
        )}
        {artifact.status === "failed" && (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Retry ${artifact.title}`}
            onClick={regenerate}
          >
            <RefreshCw />
          </Button>
        )}
        {!generating && (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Delete ${artifact.title}`}
            onClick={onDelete}
          >
            <Trash2 />
          </Button>
        )}
      </div>

      {artifact.status === "ready" &&
        (audioUrl ? (
          // Generated speech without captions; the source script is not
          // persisted yet (transcript is a known follow-up, NF-11).
          <audio
            controls
            autoPlay
            src={audioUrl}
            className="mt-2 h-9 w-full"
          />
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="mt-2 w-full"
            disabled={busy}
            onClick={play}
          >
            {busy ? <Loader2 className="animate-spin" /> : <Play />}
            Play
          </Button>
        ))}
    </li>
  );
}

// Inline rename, same interaction as the notebook title in the top bar.
function ArtifactTitle({
  artifact,
  onRenamed,
}: {
  artifact: ArtifactListItem;
  onRenamed: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const submittedRef = useRef(false);

  function submit(value: string) {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setIsEditing(false);
    if (value.trim() !== "" && value.trim() !== artifact.title) {
      void renameArtifactAction(artifact.id, value).then(onRenamed);
    }
  }

  if (isEditing) {
    return (
      <Input
        autoFocus
        defaultValue={artifact.title}
        aria-label="Artifact title"
        className="h-7 flex-1 text-sm"
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            submit(event.currentTarget.value);
          } else if (event.key === "Escape") {
            submittedRef.current = true;
            setIsEditing(false);
          }
        }}
        onBlur={(event) => submit(event.currentTarget.value)}
      />
    );
  }

  return (
    <button
      type="button"
      title="Rename"
      className="min-w-0 flex-1 truncate rounded px-1 text-left text-sm font-medium hover:bg-muted"
      onClick={() => {
        submittedRef.current = false;
        setIsEditing(true);
      }}
    >
      {artifact.title}
    </button>
  );
}
