// Drizzle schema — single source of truth for the application's own tables.
// Supabase-managed schemas (auth, storage, vault) are NOT modeled here.
//
// Phase 1 domain model (product/scope.md §10):
//   notebook → sources → chunks (retrieval index)
//   notebook → conversations → messages → citations (→ chunks)
//   notebook → notes

import { sql, type SQL } from "drizzle-orm";
import {
  customType,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  vector,
} from "drizzle-orm/pg-core";

// qwen3-embedding-8b (feasibility D-4) natively outputs 4096 dims, above the
// 2000-dim ceiling pgvector HNSW indexes support on `vector` columns. The
// model is Matryoshka-trained, so embeddings are requested with
// `dimensions: 2000` — Scaleway's documented recommendation for pgvector.
export const EMBEDDING_DIMENSIONS = 2000;

// Postgres full-text type; Drizzle has no built-in tsvector.
const tsvector = customType<{ data: string }>({
  dataType() {
    return "tsvector";
  },
});

export const sourceType = pgEnum("source_type", ["file", "text", "url"]);
export const sourceStatus = pgEnum("source_status", [
  "pending",
  "processing",
  "ready",
  "failed",
]);
export const messageRole = pgEnum("message_role", ["user", "assistant"]);

export const notebooks = pgTable(
  "notebooks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // References auth.users implicitly; no FK because Supabase-managed
    // schemas are out of bounds for Drizzle.
    ownerId: uuid("owner_id").notNull(),
    title: text("title").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("notebooks_owner_id_idx").on(t.ownerId)],
);

export const sources = pgTable(
  "sources",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    notebookId: uuid("notebook_id")
      .notNull()
      .references(() => notebooks.id, { onDelete: "cascade" }),
    type: sourceType("type").notNull(),
    status: sourceStatus("status").notNull().default("pending"),
    title: text("title").notNull(),
    // Exactly one of these carries the original input, depending on `type`:
    // file → storagePath (Supabase Storage object), url → url, text → content.
    storagePath: text("storage_path"),
    url: text("url"),
    // Extracted/pasted full text; filled by ingestion for file/url sources.
    content: text("content"),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("sources_notebook_id_idx").on(t.notebookId)],
);

export const chunks = pgTable(
  "chunks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => sources.id, { onDelete: "cascade" }),
    chunkIndex: integer("chunk_index").notNull(),
    text: text("text").notNull(),
    // Citation location metadata (CF-07): offsets into the source's parsed
    // content, plus page/section where the parser provides them.
    charStart: integer("char_start").notNull(),
    charEnd: integer("char_end").notNull(),
    pageNumber: integer("page_number"),
    section: text("section"),
    embedding: vector("embedding", {
      dimensions: EMBEDDING_DIMENSIONS,
    }).notNull(),
    fts: tsvector("fts")
      .notNull()
      .generatedAlwaysAs((): SQL => sql`to_tsvector('english', ${chunks.text})`),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("chunks_source_id_chunk_index_idx").on(t.sourceId, t.chunkIndex),
    index("chunks_embedding_idx").using(
      "hnsw",
      t.embedding.op("vector_cosine_ops"),
    ),
    index("chunks_fts_idx").using("gin", t.fts),
  ],
);

export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    notebookId: uuid("notebook_id")
      .notNull()
      .references(() => notebooks.id, { onDelete: "cascade" }),
    title: text("title"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("conversations_notebook_id_idx").on(t.notebookId)],
);

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    role: messageRole("role").notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("messages_conversation_id_created_at_idx").on(
      t.conversationId,
      t.createdAt,
    ),
  ],
);

export const citations = pgTable(
  "citations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    messageId: uuid("message_id")
      .notNull()
      .references(() => messages.id, { onDelete: "cascade" }),
    // Deleting a source deletes its chunks and therefore the citations that
    // point at them — a Phase 1 simplification (the citation marker in the
    // message text simply stops resolving).
    chunkId: uuid("chunk_id")
      .notNull()
      .references(() => chunks.id, { onDelete: "cascade" }),
    // 1-based marker number as rendered in the message ("[1]", "[2]", …).
    ordinal: integer("ordinal").notNull(),
    // The excerpt quoted as evidence (CF-07 "supporting excerpt").
    quote: text("quote").notNull(),
  },
  (t) => [
    uniqueIndex("citations_message_id_ordinal_idx").on(t.messageId, t.ordinal),
  ],
);

// Studio artifacts (scope §3): one generic table for all generated artifact
// types; `audio_overview` (CF-12) is the first. Generation is async (SF-09) —
// `status` is the job state, mirroring sources.status.
export const artifactType = pgEnum("artifact_type", ["audio_overview"]);
export const artifactStatus = pgEnum("artifact_status", [
  "pending",
  "processing",
  "ready",
  "failed",
]);

// Per-generation settings, stored so "regenerate" can replay them. Shape is
// per artifact type; audio_overview uses AudioOverviewConfig.
export type AudioOverviewConfig = {
  language: "de" | "en";
  // Provider-neutral voice key, mapped to a concrete voice by the TtsProvider
  // adapter (feasibility D-8).
  voice: string;
  focusPrompt?: string;
  // The sources the artifact was generated from (CF-05 selection, validated
  // owner-scoped at creation time).
  sourceIds: string[];
};

export const artifacts = pgTable(
  "artifacts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    notebookId: uuid("notebook_id")
      .notNull()
      .references(() => notebooks.id, { onDelete: "cascade" }),
    type: artifactType("type").notNull(),
    title: text("title").notNull(),
    status: artifactStatus("status").notNull().default("pending"),
    errorMessage: text("error_message"),
    config: jsonb("config").$type<AudioOverviewConfig>().notNull(),
    // Object in the private `artifacts` storage bucket, set when ready.
    storagePath: text("storage_path"),
    durationSeconds: integer("duration_seconds"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("artifacts_notebook_id_idx").on(t.notebookId)],
);

export const notes = pgTable(
  "notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    notebookId: uuid("notebook_id")
      .notNull()
      .references(() => notebooks.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    content: text("content").notNull(),
    // Set when the note was saved from an assistant message (CF-10); keeps
    // the message's citations reachable from the note. Survives message
    // deletion as a plain note.
    sourceMessageId: uuid("source_message_id").references(() => messages.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("notes_notebook_id_idx").on(t.notebookId)],
);
