import { and, asc, desc, eq, exists, inArray, sql } from "drizzle-orm";
import type { Database } from "../db";
import { citations, conversations, messages, notebooks } from "../db/schema";
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

    async listMessages(
      conversationId: string,
      ownerId: string,
    ): Promise<MessageWithCitations[]> {
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
        .select()
        .from(citations)
        .where(
          inArray(
            citations.messageId,
            messageRows.map((message) => message.id),
          ),
        )
        .orderBy(asc(citations.ordinal));
      return messageRows.map((message) => ({
        ...message,
        citations: citationRows.filter(
          (citation) => citation.messageId === message.id,
        ),
      }));
    },
  };
}

export type ConversationRepository = ReturnType<
  typeof createConversationRepository
>;
