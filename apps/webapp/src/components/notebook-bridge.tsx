"use client";

import { createContext, useContext } from "react";

// Cross-panel bridge for the notebook workspace. The Studio column arrives
// as server-rendered children of NotebookWorkspace, so callbacks can't be
// passed as props — client components anywhere in the workspace tree consume
// this context instead (provided by NotebookWorkspace).

export type NotebookBridge = {
  // Citation → passage navigation (CF-07): resolves the chunk server-side
  // and opens the source viewer at the cited passage.
  openCitation: (chunkId: string) => void;
  // Chunk ids that failed to resolve (source removed); their chips render
  // inert instead of dead-clicking.
  removedChunkIds: ReadonlySet<string>;
  // Bumped whenever a note is created outside the notes section (save-to-
  // note in chat) so the section can refresh its list.
  notesVersion: number;
  notifyNotesChanged: () => void;
};

const NotebookBridgeContext = createContext<NotebookBridge | null>(null);

export const NotebookBridgeProvider = NotebookBridgeContext.Provider;

export function useNotebookBridge(): NotebookBridge | null {
  return useContext(NotebookBridgeContext);
}
