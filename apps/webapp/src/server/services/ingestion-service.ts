import { createScalewayEmbedder, type Embedder } from "../ai/embeddings";
import { getDb, type Database } from "../db";
import { chunkPages, chunkText } from "../ingestion/chunking";
import { countWords, MAX_SOURCE_WORDS } from "../ingestion/limits";
import { extractArticle, ParseError, parsePdf, parsePlainText } from "../ingestion/parsers";
import {
  createSourceRepository,
  type Source,
} from "../repositories/source-repository";
import { downloadSourceObject } from "../storage";

// The ingestion pipeline (feasibility D-2 stage 1): runs in-process, kicked
// off with Next's after() so the request returns immediately. Job state IS
// the sources.status column: pending → processing → ready | failed. Stage 2
// moves this same code into a Serverless Job without touching schema or UI.

// All I/O boundaries are injectable so tests run the real pipeline against
// PGlite with a fake embedder and fixture bytes — no network.
export type IngestionDeps = {
  db?: Database;
  embedder?: Embedder;
  loadFileBytes?: (storagePath: string) => Promise<Uint8Array>;
  fetchHtml?: (url: string) => Promise<string>;
};

const FETCH_TIMEOUT_MS = 15_000;
const MAX_HTML_BYTES = 10 * 1024 * 1024;
// Shown to users on failed sources; keep it short and stack-free.
const MAX_ERROR_MESSAGE_LENGTH = 300;

// Best-effort SSRF guard for user-supplied URLs: refuses the obvious
// loopback/private/link-local hosts. Not exhaustive (no DNS resolution
// check) — acceptable for the prototype, noted in the session handover.
const PRIVATE_HOST_PATTERN =
  /^(localhost|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1\]?$|0\.0\.0\.0)/i;

async function defaultFetchHtml(url: string): Promise<string> {
  if (PRIVATE_HOST_PATTERN.test(new URL(url).hostname)) {
    throw new ParseError("this URL points to a private address and cannot be fetched");
  }
  const response = await fetch(url, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    headers: { accept: "text/html,application/xhtml+xml" },
    redirect: "follow",
  });
  if (!response.ok) {
    throw new ParseError(`the page could not be fetched (HTTP ${response.status})`);
  }
  const contentType = response.headers.get("content-type") ?? "";
  if (!/html|xml/i.test(contentType)) {
    throw new ParseError(
      `the URL returned ${contentType || "an unknown content type"}, not a web page`,
    );
  }
  const html = await response.text();
  if (html.length > MAX_HTML_BYTES) {
    throw new ParseError("the page is too large to ingest");
  }
  return html;
}

const PDF_MAGIC = "%PDF-";

function looksLikePdf(bytes: Uint8Array): boolean {
  return new TextDecoder().decode(bytes.slice(0, PDF_MAGIC.length)) === PDF_MAGIC;
}

type ExtractedSource = {
  content: string;
  // Set for PDFs: per-page text, so chunks carry page numbers.
  pages?: string[];
  // URL sources adopt the page's title during ingestion.
  title?: string;
};

// Parse only — chunking happens after the size guard, so an oversized source
// fails fast instead of being tokenized first.
async function extractContent(
  source: Source,
  deps: Required<IngestionDeps>,
): Promise<ExtractedSource> {
  switch (source.type) {
    case "file": {
      if (!source.storagePath) {
        throw new ParseError("the source has no uploaded file attached");
      }
      const bytes = await deps.loadFileBytes(source.storagePath);
      if (looksLikePdf(bytes)) {
        const { pages } = await parsePdf(bytes);
        return { content: pages.join("\n\n"), pages };
      }
      let text: string;
      try {
        text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      } catch {
        throw new ParseError(
          "unsupported file format — only PDF, TXT and Markdown files can be ingested",
        );
      }
      return { content: parsePlainText(text) };
    }
    case "url": {
      if (!source.url) {
        throw new ParseError("the source has no URL attached");
      }
      const html = await deps.fetchHtml(source.url);
      const { title, text } = extractArticle(html, source.url);
      return { content: text, title: title ?? undefined };
    }
    case "text": {
      return { content: source.content ?? "" };
    }
  }
}

// Processes one source end-to-end and records the outcome on its row. Never
// throws — it runs detached inside after(), so failures land in
// status=failed + errorMessage instead.
export async function ingestSource(
  sourceId: string,
  ownerId: string,
  deps: IngestionDeps = {},
): Promise<void> {
  const resolved: Required<IngestionDeps> = {
    db: deps.db ?? getDb(),
    embedder: deps.embedder ?? createScalewayEmbedder(),
    loadFileBytes: deps.loadFileBytes ?? downloadSourceObject,
    fetchHtml: deps.fetchHtml ?? defaultFetchHtml,
  };
  const repository = createSourceRepository(resolved.db);

  const source = await repository.findById(sourceId, ownerId);
  if (!source) {
    // Deleted (or never owned) in the meantime — nothing to do.
    return;
  }

  try {
    await repository.update(sourceId, ownerId, {
      status: "processing",
      errorMessage: null,
    });

    const extracted = await extractContent(source, resolved);
    if (countWords(extracted.content) > MAX_SOURCE_WORDS) {
      throw new ParseError(
        `the source exceeds the ${MAX_SOURCE_WORDS.toLocaleString("en-US")}-word limit`,
      );
    }

    // chunkPages re-joins the pages, so `content` is identical to the joined
    // string offsets were computed against — the invariant citations rely on.
    const { content, chunks } = extracted.pages
      ? await chunkPages(extracted.pages)
      : { content: extracted.content, chunks: await chunkText(extracted.content) };
    if (content.trim() === "" || chunks.length === 0) {
      throw new ParseError("no text content could be extracted from this source");
    }

    const embeddings = await resolved.embedder.embed(chunks.map((chunk) => chunk.text));

    await repository.update(sourceId, ownerId, {
      content,
      ...(extracted.title ? { title: extracted.title } : {}),
    });
    await repository.replaceChunks(
      sourceId,
      ownerId,
      chunks.map((chunk, index) => ({
        chunkIndex: index,
        text: chunk.text,
        charStart: chunk.charStart,
        charEnd: chunk.charEnd,
        pageNumber: chunk.pageNumber,
        embedding: embeddings[index],
      })),
    );
    await repository.update(sourceId, ownerId, { status: "ready" });
  } catch (error) {
    console.error(`ingestion failed for source ${sourceId}:`, error);
    const message = error instanceof Error ? error.message : "ingestion failed";
    await repository
      .update(sourceId, ownerId, {
        status: "failed",
        errorMessage: message.slice(0, MAX_ERROR_MESSAGE_LENGTH),
      })
      .catch((updateError) =>
        console.error(`could not mark source ${sourceId} as failed:`, updateError),
      );
  }
}
