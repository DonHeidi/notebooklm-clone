import { Readability } from "@mozilla/readability";
import { parseHTML } from "linkedom";
import { extractText, getDocumentProxy } from "unpdf";

// Parser adapters (feasibility F-4): each turns one raw input format into
// plain text. They are pure (bytes/string in, text out) — fetching and
// storage access live in the pipeline, so these are testable from fixtures
// with no network.

export class ParseError extends Error {}

// PDF → per-page text (unpdf / pdf.js). Page granularity is kept so chunks
// can carry a pageNumber for citations.
export async function parsePdf(data: Uint8Array): Promise<{ pages: string[] }> {
  let pages: string[];
  try {
    const pdf = await getDocumentProxy(data);
    ({ text: pages } = await extractText(pdf));
  } catch (error) {
    throw new ParseError(
      `could not read PDF: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  if (pages.every((page) => page.trim() === "")) {
    throw new ParseError(
      "the PDF contains no extractable text (it may be scanned images)",
    );
  }
  return { pages };
}

// TXT / Markdown are stored as-is; only line endings are normalized so chunk
// offsets are stable regardless of the uploading OS.
export function parsePlainText(raw: string): string {
  return raw.replace(/^﻿/, "").replace(/\r\n?/g, "\n");
}

// HTML → readable article text (@mozilla/readability on a linkedom DOM).
// Returns the extracted text plus the page title so URL sources can be named
// after the page.
export function extractArticle(
  html: string,
  url: string,
): { title: string | null; text: string } {
  const { document } = parseHTML(html);
  const article = new Readability(document as unknown as Document).parse();
  const title = article?.title?.trim() || document.title?.trim() || null;
  const text = article?.textContent
    ?.split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "")
    .join("\n\n");
  if (!text) {
    throw new ParseError(`no readable article content found at ${url}`);
  }
  return { title, text };
}
