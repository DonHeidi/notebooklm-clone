import { getDb, type Database } from "../db";
import {
  createSourceRepository,
  type Source,
} from "../repositories/source-repository";
import {
  countWords,
  MAX_FILE_BYTES,
  MAX_SOURCE_WORDS,
  MAX_SOURCES_PER_NOTEBOOK,
} from "../ingestion/limits";
import { parsePlainText } from "../ingestion/parsers";
import { deleteSourceObject } from "../storage";

// Business layer for source management. Ingestion (parse → chunk → embed)
// lives in ingestion-service.ts; this module owns creation guards, listing,
// and deletion. User-input problems surface as SourceInputError with
// user-presentable messages.

export class SourceInputError extends Error {}

function repository(database: Database = getDb()) {
  return createSourceRepository(database);
}

async function assertBelowSourceCap(
  notebookId: string,
  ownerId: string,
  database?: Database,
) {
  const existing = await repository(database).listByNotebook(notebookId, ownerId);
  if (existing.length >= MAX_SOURCES_PER_NOTEBOOK) {
    throw new SourceInputError(
      `this notebook already has the maximum of ${MAX_SOURCES_PER_NOTEBOOK} sources`,
    );
  }
}

export async function listSources(
  notebookId: string,
  ownerId: string,
  database?: Database,
): Promise<Source[]> {
  return repository(database).listByNotebook(notebookId, ownerId);
}

export async function getSource(
  id: string,
  ownerId: string,
  database?: Database,
): Promise<Source | undefined> {
  return repository(database).findById(id, ownerId);
}

export async function createTextSource(
  ownerId: string,
  input: { notebookId: string; title: string; content: string },
  database?: Database,
): Promise<Source> {
  const content = parsePlainText(input.content).trim();
  if (content === "") {
    throw new SourceInputError("the pasted text is empty");
  }
  if (countWords(content) > MAX_SOURCE_WORDS) {
    throw new SourceInputError(
      `the pasted text exceeds the ${MAX_SOURCE_WORDS.toLocaleString("en-US")}-word limit per source`,
    );
  }
  await assertBelowSourceCap(input.notebookId, ownerId, database);
  return repository(database).create(ownerId, {
    notebookId: input.notebookId,
    type: "text",
    title: input.title.trim() || "Pasted text",
    content,
  });
}

export async function createUrlSource(
  ownerId: string,
  input: { notebookId: string; url: string },
  database?: Database,
): Promise<Source> {
  let parsed: URL;
  try {
    parsed = new URL(input.url.trim());
  } catch {
    throw new SourceInputError("that is not a valid URL");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new SourceInputError("only http(s) URLs are supported");
  }
  await assertBelowSourceCap(input.notebookId, ownerId, database);
  return repository(database).create(ownerId, {
    notebookId: input.notebookId,
    type: "url",
    // Provisional title; ingestion replaces it with the page's title.
    title: parsed.host + (parsed.pathname === "/" ? "" : parsed.pathname),
    url: parsed.href,
  });
}

export async function createFileSource(
  ownerId: string,
  input: {
    notebookId: string;
    fileName: string;
    storagePath: string;
    fileSize: number;
  },
  database?: Database,
): Promise<Source> {
  // The client uploaded directly to Storage (feasibility D-5) and hands the
  // server only the object path. Accept only paths inside the caller's own
  // user-id prefix — the same rule the storage RLS policies enforce.
  if (!input.storagePath.startsWith(`${ownerId}/`)) {
    throw new SourceInputError("invalid upload path");
  }
  if (input.fileSize > MAX_FILE_BYTES) {
    throw new SourceInputError(
      `files are limited to ${Math.floor(MAX_FILE_BYTES / 1024 / 1024)} MB`,
    );
  }
  await assertBelowSourceCap(input.notebookId, ownerId, database);
  return repository(database).create(ownerId, {
    notebookId: input.notebookId,
    type: "file",
    title: input.fileName.trim() || "Uploaded file",
    storagePath: input.storagePath,
  });
}

export async function deleteSource(
  id: string,
  ownerId: string,
  database?: Database,
): Promise<void> {
  const source = await repository(database).findById(id, ownerId);
  if (source?.storagePath) {
    await deleteSourceObject(source.storagePath);
  }
  await repository(database).delete(id, ownerId);
}
