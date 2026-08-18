"use client";

import { useCallback, useRef, useState } from "react";
import type { SourceListItem } from "@/app/notebooks/[id]/sources/actions";
import { ChatPanel } from "@/components/chat/chat-panel";
import { SourcesPanel } from "@/components/sources/sources-panel";
import type { ChatUIMessage } from "@/lib/chat";

// Client shell for the Sources + Chat columns: owns the source-selection
// state (CF-05) that the Sources panel edits and every chat request carries.
// Selection is client-side only; the server re-validates the ids. The Studio
// column stays server-rendered and arrives as `children` (D2's area).

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

  return (
    <>
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
    </>
  );
}
