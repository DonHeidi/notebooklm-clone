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

// Emitted once the assistant message is persisted (stream: after onFinish
// writes the row; reload: rebuilt in toUIMessages). Carries the DB message
// id "Save to note" (CF-10) needs — the client-side UIMessage id is not the
// persisted id during a live stream.
export type PersistedData = {
  messageId: string;
};

export type ChatUIMessage = UIMessage<
  unknown,
  { citation: CitationData; persisted: PersistedData }
>;

export function persistedMessageId(message: ChatUIMessage): string | null {
  for (const part of message.parts) {
    if (part.type === "data-persisted") {
      return part.data.messageId;
    }
  }
  return null;
}
