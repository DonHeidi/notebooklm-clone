"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import {
  getSourceAction,
  type SourceDetail,
} from "@/app/notebooks/[id]/sources/actions";
import { splitAtPassage } from "@/lib/passage";
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

// Where to highlight inside the source (CF-07 navigation): server-resolved
// offsets into sources.content plus the human-readable location shown in
// the header. Null = plain viewing, no highlight.
export type PassageHighlight = {
  charStart: number;
  charEnd: number;
  pageNumber: number | null;
  section: string | null;
};

function highlightLocation(highlight: PassageHighlight): string {
  const parts: string[] = [];
  if (highlight.pageNumber !== null) {
    parts.push(`Page ${highlight.pageNumber}`);
  }
  if (highlight.section) {
    parts.push(highlight.section);
  }
  return parts.join(" · ");
}

// Source viewer: extracted content, type, status/error, delete — and, when
// opened from a citation chip, the cited passage highlighted and scrolled
// into view. Dialog-state only (A3's open point stands; no URL addressing).
export function SourceViewer({
  sourceId,
  highlight,
  onClose,
  onDelete,
}: {
  sourceId: string | null;
  highlight?: PassageHighlight | null;
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

  // The A3 invariant guarantees content.slice(charStart, charEnd) is exactly
  // the chunk text; splitAtPassage only clamps against pathological input.
  const segments =
    source?.content && highlight
      ? splitAtPassage(source.content, highlight.charStart, highlight.charEnd)
      : null;

  const markRef = useRef<HTMLElement>(null);
  // Content arrives async, so key on when the passage becomes renderable.
  const passageRendered = segments !== null;
  useEffect(() => {
    if (passageRendered) {
      markRef.current?.scrollIntoView({ block: "center" });
    }
  }, [passageRendered, sourceId, highlight?.charStart, highlight?.charEnd]);

  const location = highlight ? highlightLocation(highlight) : "";

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
                {highlight && (
                  <Badge variant="outline">
                    Cited passage{location && ` — ${location}`}
                  </Badge>
                )}
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
                  {segments ? (
                    <>
                      {segments.before}
                      <mark
                        ref={markRef}
                        data-testid="cited-passage"
                        className="rounded-sm bg-amber-200/80 text-inherit dark:bg-amber-400/30"
                      >
                        {segments.passage}
                      </mark>
                      {segments.after}
                    </>
                  ) : (
                    source.content
                  )}
                </div>
              ) : processing ? (
                // A5-deferred state: a citation (or plain open) landed here
                // while ingestion is still running. The processing poll above
                // swaps the content in the moment it is ready.
                <div className="flex flex-col items-center gap-3 py-10 text-center">
                  <Loader2 className="size-6 animate-spin text-muted-foreground" />
                  <p className="text-sm font-medium">
                    This source is still processing
                  </p>
                  <p className="max-w-sm text-sm text-muted-foreground">
                    {highlight
                      ? "The cited passage will appear here, highlighted, as soon as processing finishes."
                      : "The extracted content will appear here as soon as processing finishes."}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No extracted content.
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
