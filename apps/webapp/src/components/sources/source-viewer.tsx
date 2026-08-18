"use client";

import { useEffect, useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import {
  getSourceAction,
  type SourceDetail,
} from "@/app/notebooks/[id]/sources/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const TYPE_LABELS = { file: "File", url: "Website", text: "Pasted text" } as const;

// Read-only source viewer: extracted content, type, status/error, delete.
// Navigating to a cited passage inside this view is session A5.
export function SourceViewer({
  sourceId,
  onClose,
  onDelete,
}: {
  sourceId: string | null;
  onClose: () => void;
  onDelete: (source: SourceDetail) => void;
}) {
  const [loaded, setLoaded] = useState<SourceDetail | null>(null);
  // Derive instead of resetting in an effect: stale details from a previously
  // viewed source simply don't match the current sourceId.
  const source = loaded && loaded.id === sourceId ? loaded : null;

  useEffect(() => {
    if (!sourceId) {
      return;
    }
    let cancelled = false;
    void getSourceAction(sourceId).then((detail) => {
      if (!cancelled && detail) {
        setLoaded(detail);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [sourceId]);

  // Keep the open viewer in sync while its source is still being ingested.
  const processing = source?.status === "pending" || source?.status === "processing";
  useEffect(() => {
    if (!sourceId || !processing) {
      return;
    }
    const timer = setInterval(() => {
      void getSourceAction(sourceId).then((detail) => {
        if (detail) {
          setLoaded(detail);
        }
      });
    }, 2500);
    return () => clearInterval(timer);
  }, [sourceId, processing]);

  return (
    <Dialog open={sourceId !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[85dvh] flex-col sm:max-w-3xl">
        {source === null ? (
          <>
            <DialogHeader>
              <DialogTitle>Loading source…</DialogTitle>
              <DialogDescription>Fetching the extracted content.</DialogDescription>
            </DialogHeader>
            <div className="flex items-center justify-center p-10">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="pr-8">{source.title}</DialogTitle>
              <DialogDescription className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{TYPE_LABELS[source.type]}</Badge>
                {(source.status === "pending" || source.status === "processing") && (
                  <Badge variant="outline">
                    <Loader2 className="animate-spin" /> Processing
                  </Badge>
                )}
                {source.status === "failed" && (
                  <Badge variant="destructive">Failed</Badge>
                )}
                {source.url && (
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="truncate underline underline-offset-2"
                  >
                    {source.url}
                  </a>
                )}
              </DialogDescription>
            </DialogHeader>

            {source.status === "failed" && source.errorMessage && (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {source.errorMessage}
              </p>
            )}

            <div className="min-h-0 flex-1 overflow-y-auto rounded-md border bg-muted/30 p-4">
              {source.content ? (
                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                  {source.content}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No extracted content yet
                  {source.status === "pending" || source.status === "processing"
                    ? " — this source is still being processed."
                    : "."}
                </p>
              )}
            </div>

            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={() => onDelete(source)}>
                <Trash2 /> Delete source
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
