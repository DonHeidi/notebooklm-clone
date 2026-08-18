import type { ChatUIMessage } from "@/lib/chat";
import { createScalewayEmbedder, type Embedder } from "../ai/embeddings";
import {
  buildGroundedSystemPrompt,
  buildZeroSourceSystemPrompt,
} from "../ai/grounding";
import { getDb, type Database } from "../db";
import {
  createConversationRepository,
  type Conversation,
  type MessageWithCitationContext,
  type MessageWithCitations,
  type NewCitationInput,
} from "../repositories/conversation-repository";
import {
  createSourceRepository,
  type RetrievedChunk,
} from "../repositories/source-repository";

// Business layer for the grounded chat (CF-05/06/07/08): conversation
// lifecycle, retrieval → system prompt, and message persistence. The route
// handler owns streaming; everything stateful lives here so it is testable
// against PGlite with a fake embedder.

// How many of the most recent messages are sent to the model as context
// (simple fixed window ≙ 6 exchanges — CF-08 MVP).
export const CHAT_HISTORY_WINDOW = 12;

// Top-k chunks put into the prompt.
export const RETRIEVAL_LIMIT = 10;

export type ChatDeps = {
  db?: Database;
  embedder?: Embedder;
};

function resolve(deps: ChatDeps) {
  const db = deps.db ?? getDb();
  return {
    db,
    embedder: deps.embedder ?? createScalewayEmbedder(),
    conversations: createConversationRepository(db),
    sources: createSourceRepository(db),
  };
}

// CF-08 MVP: one conversation per notebook, created on first use.
export async function getOrCreateConversation(
  notebookId: string,
  ownerId: string,
  deps: ChatDeps = {},
): Promise<Conversation> {
  const { conversations } = resolve(deps);
  const existing = await conversations.listByNotebook(notebookId, ownerId);
  if (existing.length > 0) {
    return existing[0];
  }
  return conversations.create(ownerId, notebookId);
}

export type Grounding = {
  system: string;
  retrieved: RetrievedChunk[];
};

// Builds the system prompt for one exchange. Zero-source mode (ui-research
// §4): no retrieval, disclosure + redirect instead. Grounded mode: hybrid
// search restricted to the caller's selection (ownership enforced in the
// repository — client-sent ids are never trusted).
export async function prepareGrounding(
  params: {
    notebookId: string;
    ownerId: string;
    selectedSourceIds: string[];
    question: string;
  },
  deps: ChatDeps = {},
): Promise<Grounding> {
  if (params.selectedSourceIds.length === 0) {
    return { system: buildZeroSourceSystemPrompt(), retrieved: [] };
  }
  const { embedder, sources } = resolve(deps);
  const [queryEmbedding] = await embedder.embed([params.question]);
  const retrieved = await sources.hybridSearchChunks({
    notebookId: params.notebookId,
    ownerId: params.ownerId,
    sourceIds: params.selectedSourceIds,
    queryEmbedding,
    queryText: params.question,
    limit: RETRIEVAL_LIMIT,
  });
  return { system: buildGroundedSystemPrompt(retrieved), retrieved };
}

export async function persistUserMessage(
  conversationId: string,
  ownerId: string,
  content: string,
  deps: ChatDeps = {},
): Promise<void> {
  const { conversations } = resolve(deps);
  await conversations.appendMessage(conversationId, ownerId, {
    role: "user",
    content,
  });
}

// Returns the stored row: the route emits its id as a data-persisted part so
// the client can save the message as a note (CF-10) without a reload.
export async function persistAssistantMessage(
  conversationId: string,
  ownerId: string,
  content: string,
  citations: NewCitationInput[],
  deps: ChatDeps = {},
): Promise<MessageWithCitations> {
  const { conversations } = resolve(deps);
  return conversations.appendMessage(
    conversationId,
    ownerId,
    { role: "assistant", content },
    citations,
  );
}

// Workspace-open load (CF-08): the notebook's conversation with messages and
// citation context, or null when no conversation exists yet.
export async function loadConversation(
  notebookId: string,
  ownerId: string,
  deps: ChatDeps = {},
): Promise<{
  conversation: Conversation;
  messages: MessageWithCitationContext[];
} | null> {
  const { conversations } = resolve(deps);
  const existing = await conversations.listByNotebook(notebookId, ownerId);
  if (existing.length === 0) {
    return null;
  }
  const conversation = existing[0];
  const messages = await conversations.listMessages(conversation.id, ownerId);
  return { conversation, messages };
}

// Rehydrates persisted messages into the UI message shape the chat streams
// with: one text part plus a data-citation part per stored citation, so
// reloaded chips render exactly like live ones.
export function toUIMessages(
  messages: MessageWithCitationContext[],
): ChatUIMessage[] {
  return messages.map((message) => ({
    id: message.id,
    role: message.role,
    parts: [
      { type: "text" as const, text: message.content },
      // Rehydrated messages ARE persisted — same part the stream emits, so
      // "Save to note" works identically live and after reload.
      {
        type: "data-persisted" as const,
        data: { messageId: message.id },
      },
      ...message.citations.map((citation) => ({
        type: "data-citation" as const,
        id: citation.id,
        data: {
          ordinal: citation.ordinal,
          chunkId: citation.chunkId,
          sourceId: citation.sourceId,
          sourceTitle: citation.sourceTitle,
          pageNumber: citation.pageNumber,
          section: citation.section,
        },
      })),
    ],
  }));
}

// Clear-chat action (CF-08): drops the conversation; messages and citations
// cascade. The next message starts a fresh conversation.
export async function clearConversation(
  notebookId: string,
  ownerId: string,
  deps: ChatDeps = {},
): Promise<void> {
  const { conversations } = resolve(deps);
  const existing = await conversations.listByNotebook(notebookId, ownerId);
  for (const conversation of existing) {
    await conversations.delete(conversation.id, ownerId);
  }
}
