"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type { SourceListItem } from "@/app/notebooks/[id]/sources/actions";
import { resolveCitationAction } from "@/app/notebooks/[id]/sources/actions";
import { ChatPanel } from "@/components/chat/chat-panel";
import {
  NotebookBridgeProvider,
  type NotebookBridge,
} from "@/components/notebook-bridge";
import {
  SourcesPanel,
  type ViewerOpenRequest,
} from "@/components/sources/sources-panel";
import type { ChatUIMessage } from "@/lib/chat";

// Client shell for the Sources + Chat columns: owns the source-selection
// state (CF-05) that the Sources panel edits and every chat request carries,
// plus the citation → passage navigation (CF-07) that chips anywhere in the
// workspace trigger through the NotebookBridge context. Selection is
// client-side only; the server re-validates the ids. The Studio column stays
// server-rendered and arrives as `children` (D2's area + the notes section).

export function NotebookWorkspace({
  notebookId,
  userId,
  initialSources,
  initialMessages,
  children,
}: {
  notebookId: string;
  userId: string;
  initialSources: SourceListItem[];
  initialMessages: ChatUIMessage[];
  children: React.ReactNode;
}) {
  const initialReady = initialSources
    .filter((source) => source.status === "ready")
    .map((source) => source.id);
  // Default: all ready sources selected. Sources seen becoming ready get
  // auto-selected once; a deliberate uncheck is never overridden by polling.
  const [selectedIds, setSelectedIds] = useState<string[]>(initialReady);
  const knownReady = useRef(new Set(initialReady));

  const handleSourcesUpdated = useCallback((sources: SourceListItem[]) => {
    const readyIds = new Set(
      sources
        .filter((source) => source.status === "ready")
        .map((source) => source.id),
    );
    setSelectedIds((previous) => {
      const next = previous.filter((id) => readyIds.has(id));
      for (const id of readyIds) {
        if (!knownReady.current.has(id)) {
          knownReady.current.add(id);
          next.push(id);
        }
      }
      return next;
    });
  }, []);

  const handleToggleSource = useCallback((sourceId: string) => {
    setSelectedIds((previous) =>
      previous.includes(sourceId)
        ? previous.filter((id) => id !== sourceId)
        : [...previous, sourceId],
    );
  }, []);

  // Citation → passage navigation (CF-07): resolve server-side (offsets are
  // never trusted from the client), then hand the Sources panel an open
  // request. A failed resolution marks the chunk removed — its chips turn
  // inert instead of dead-clicking (A1's cascade design, degraded gracefully).
  const [openRequest, setOpenRequest] = useState<ViewerOpenRequest | null>(null);
  const [removedChunkIds, setRemovedChunkIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const requestToken = useRef(0);
  const openCitation = useCallback((chunkId: string) => {
    void resolveCitationAction(chunkId).then((target) => {
      if (!target) {
        setRemovedChunkIds((previous) => new Set(previous).add(chunkId));
        return;
      }
      requestToken.current += 1;
      setOpenRequest({
        token: requestToken.current,
        sourceId: target.sourceId,
        highlight: {
          charStart: target.charStart,
          charEnd: target.charEnd,
          pageNumber: target.pageNumber,
          section: target.section,
        },
      });
    });
  }, []);

  // Save-to-note lives in the chat panel while the notes list lives in the
  // server-rendered Studio children — the version counter tells the list to
  // refresh.
  const [notesVersion, setNotesVersion] = useState(0);
  const notifyNotesChanged = useCallback(
    () => setNotesVersion((version) => version + 1),
    [],
  );

  const bridge = useMemo<NotebookBridge>(
    () => ({ openCitation, removedChunkIds, notesVersion, notifyNotesChanged }),
    [openCitation, removedChunkIds, notesVersion, notifyNotesChanged],
  );

  return (
    <NotebookBridgeProvider value={bridge}>
      <section
        aria-label="Sources"
        className="flex w-80 shrink-0 flex-col rounded-xl border bg-card"
      >
        <h2 className="border-b px-4 py-2.5 text-sm font-medium">Sources</h2>
        <SourcesPanel
          notebookId={notebookId}
          userId={userId}
          initialSources={initialSources}
          selectedIds={selectedIds}
          openRequest={openRequest}
          onToggleSource={handleToggleSource}
          onSourcesUpdated={handleSourcesUpdated}
        />
      </section>
      <section
        aria-label="Chat"
        className="flex min-w-0 flex-1 flex-col rounded-xl border bg-card"
      >
        <h2 className="border-b px-4 py-2.5 text-sm font-medium">Chat</h2>
        <ChatPanel
          notebookId={notebookId}
          initialMessages={initialMessages}
          selectedSourceIds={selectedIds}
        />
      </section>
      {children}
    </NotebookBridgeProvider>
  );
}
