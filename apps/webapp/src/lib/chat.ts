import type { UIMessage } from "ai";

// Shared chat types (client + server). The citation payload travels as a
// "data-citation" stream part while the answer streams, and is rebuilt from
// the citations table when a conversation is reloaded — same shape both ways,
// so chips render identically live and after reload. chunkId/charStart-free:
// navigation to the passage is A5's job; chips only need identity + label.
export type CitationData = {
  ordinal: number;
  chunkId: string;
  sourceId: string;
  sourceTitle: string;
  pageNumber: number | null;
  section: string | null;
};

export type ChatUIMessage = UIMessage<unknown, { citation: CitationData }>;
