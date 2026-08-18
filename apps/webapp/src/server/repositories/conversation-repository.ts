import { and, asc, count, desc, eq, exists, gte, inArray, sql } from "drizzle-orm";
import type { Database } from "../db";
import {
  chunks,
  citations,
  conversations,
  messages,
  notebooks,
  sources,
} from "../db/schema";
import { NotFoundError } from "./errors";
import { assertNotebookOwnership } from "./notebook-access";

export type Conversation = typeof conversations.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type Citation = typeof citations.$inferSelect;

export type NewMessageInput = {
  role: Message["role"];
  content: string;
};

// Citation raw material produced by retrieval (CF-07): which chunk grounds
// the claim, its marker number in the message, and the quoted excerpt.
export type NewCitationInput = {
  chunkId: string;
  ordinal: number;
  quote: string;
};

export type MessageWithCitations = Message & { citations: Citation[] };

// listMessages enriches each citation with the cited chunk's source context
// so the UI can rehydrate citation chips (title, location) after a reload.
// Safe as an inner join: deleting a chunk cascades its citations away.
export type CitationWithContext = Citation & {
  sourceId: string;
  sourceTitle: string;
  pageNumber: number | null;
  section: string | null;
};

export type MessageWithCitationContext = Message & {
  citations: CitationWithContext[];
};

export function createConversationRepository(database: Database) {
  async function assertConversationOwnership(
    conversationId: string,
    ownerId: string,
  ): Promise<void> {
    const [row] = await database
      .select({ id: conversations.id })
      .from(conversations)
      .innerJoin(notebooks, eq(notebooks.id, conversations.notebookId))
      .where(
        and(eq(conversations.id, conversationId), eq(notebooks.ownerId, ownerId)),
      )
      .limit(1);
    if (!row) {
      throw new NotFoundError("conversation not found");
    }
  }

  return {
    async create(
      ownerId: string,
      notebookId: string,
      title?: string,
    ): Promise<Conversation> {
      await assertNotebookOwnership(database, notebookId, ownerId);
      const [created] = await database
        .insert(conversations)
        .values({ notebookId, title })
        .returning();
      return created;
    },

    async listByNotebook(
      notebookId: string,
      ownerId: string,
    ): Promise<Conversation[]> {
      await assertNotebookOwnership(database, notebookId, ownerId);
      return database
        .select()
        .from(conversations)
        .where(eq(conversations.notebookId, notebookId))
        .orderBy(desc(conversations.updatedAt));
    },

    async findById(
      id: string,
      ownerId: string,
    ): Promise<Conversation | undefined> {
      const [row] = await database
        .select({ conversation: conversations })
        .from(conversations)
        .innerJoin(notebooks, eq(notebooks.id, conversations.notebookId))
        .where(and(eq(conversations.id, id), eq(notebooks.ownerId, ownerId)))
        .limit(1);
      return row?.conversation;
    },

    // Clear/reset chat history (CF-08); messages and citations cascade.
    async delete(id: string, ownerId: string): Promise<void> {
      const deleted = await database
        .delete(conversations)
        .where(
          and(
            eq(conversations.id, id),
            exists(
              database
                .select({ one: sql`1` })
                .from(notebooks)
                .where(
                  and(
                    eq(notebooks.id, conversations.notebookId),
                    eq(notebooks.ownerId, ownerId),
                  ),
                ),
            ),
          ),
        )
        .returning({ id: conversations.id });
      if (deleted.length === 0) {
        throw new NotFoundError("conversation not found");
      }
    },

    async appendMessage(
      conversationId: string,
      ownerId: string,
      input: NewMessageInput,
      citationInputs: NewCitationInput[] = [],
    ): Promise<MessageWithCitations> {
      await assertConversationOwnership(conversationId, ownerId);
      return database.transaction(async (tx) => {
        const [message] = await tx
          .insert(messages)
          .values({ ...input, conversationId })
          .returning();
        let inserted: Citation[] = [];
        if (citationInputs.length > 0) {
          inserted = await tx
            .insert(citations)
            .values(
              citationInputs.map((citation) => ({
                ...citation,
                messageId: message.id,
              })),
            )
            .returning();
        }
        await tx
          .update(conversations)
          .set({ updatedAt: new Date() })
          .where(eq(conversations.id, conversationId));
        return { ...message, citations: inserted };
      });
    },

    // Quota input (SF-11 / NF-15): user messages sent in this notebook since
    // a point in time — the per-day chat cap counts questions, not answers.
    // Owner scoping travels through the conversation → notebook join.
    async countUserMessagesForNotebookSince(
      notebookId: string,
      ownerId: string,
      since: Date,
    ): Promise<number> {
      const [row] = await database
        .select({ value: count() })
        .from(messages)
        .innerJoin(conversations, eq(conversations.id, messages.conversationId))
        .innerJoin(notebooks, eq(notebooks.id, conversations.notebookId))
        .where(
          and(
            eq(conversations.notebookId, notebookId),
            eq(notebooks.ownerId, ownerId),
            eq(messages.role, "user"),
            gte(messages.createdAt, since),
          ),
        );
      return row.value;
    },

    // Save-as-note (CF-10) needs the persisted message a note points at.
    // Owner scoping travels through the conversation → notebook join; a
    // foreign or unknown id is simply not found.
    async findMessageById(
      messageId: string,
      ownerId: string,
    ): Promise<Message | undefined> {
      const [row] = await database
        .select({ message: messages })
        .from(messages)
        .innerJoin(conversations, eq(conversations.id, messages.conversationId))
        .innerJoin(notebooks, eq(notebooks.id, conversations.notebookId))
        .where(and(eq(messages.id, messageId), eq(notebooks.ownerId, ownerId)))
        .limit(1);
      return row?.message;
    },

    // Citation context for ONE message — how a saved note rehydrates its
    // chips (CF-10). Owner scoping is built into the join, and citations
    // whose chunk cascaded away simply drop out, so a stranger and a
    // fully-dangling message both read as "no citations", never an error.
    async listCitationsForMessage(
      messageId: string,
      ownerId: string,
    ): Promise<CitationWithContext[]> {
      const rows = await database
        .select({
          citation: citations,
          sourceId: chunks.sourceId,
          sourceTitle: sources.title,
          pageNumber: chunks.pageNumber,
          section: chunks.section,
        })
        .from(citations)
        .innerJoin(messages, eq(messages.id, citations.messageId))
        .innerJoin(conversations, eq(conversations.id, messages.conversationId))
        .innerJoin(notebooks, eq(notebooks.id, conversations.notebookId))
        .innerJoin(chunks, eq(chunks.id, citations.chunkId))
        .innerJoin(sources, eq(sources.id, chunks.sourceId))
        .where(and(eq(citations.messageId, messageId), eq(notebooks.ownerId, ownerId)))
        .orderBy(asc(citations.ordinal));
      return rows.map((row) => ({
        ...row.citation,
        sourceId: row.sourceId,
        sourceTitle: row.sourceTitle,
        pageNumber: row.pageNumber,
        section: row.section,
      }));
    },

    async listMessages(
      conversationId: string,
      ownerId: string,
    ): Promise<MessageWithCitationContext[]> {
      await assertConversationOwnership(conversationId, ownerId);
      const messageRows = await database
        .select()
        .from(messages)
        .where(eq(messages.conversationId, conversationId))
        .orderBy(asc(messages.createdAt));
      if (messageRows.length === 0) {
        return [];
      }
      const citationRows = await database
        .select({
          citation: citations,
          sourceId: chunks.sourceId,
          sourceTitle: sources.title,
          pageNumber: chunks.pageNumber,
          section: chunks.section,
        })
        .from(citations)
        .innerJoin(chunks, eq(chunks.id, citations.chunkId))
        .innerJoin(sources, eq(sources.id, chunks.sourceId))
        .where(
          inArray(
            citations.messageId,
            messageRows.map((message) => message.id),
          ),
        )
        .orderBy(asc(citations.ordinal));
      const enriched = citationRows.map((row) => ({
        ...row.citation,
        sourceId: row.sourceId,
        sourceTitle: row.sourceTitle,
        pageNumber: row.pageNumber,
        section: row.section,
      }));
      return messageRows.map((message) => ({
        ...message,
        citations: enriched.filter(
          (citation) => citation.messageId === message.id,
        ),
      }));
    },
  };
}

export type ConversationRepository = ReturnType<
  typeof createConversationRepository
>;
