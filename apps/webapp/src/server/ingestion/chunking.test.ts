import { describe, expect, test } from "bun:test";
import { countTokens } from "gpt-tokenizer";
import {
  CHUNK_OVERLAP_TOKENS,
  CHUNK_SIZE_TOKENS,
  chunkPages,
  chunkText,
} from "./chunking";

const PARAGRAPH =
  "The first human civilisations arose in river valleys. " +
  "Mesopotamia sat between the Tigris and Euphrates. " +
  "Egypt grew along the Nile, and the Indus valley fed Harappa.";

function longText(paragraphs: number): string {
  return Array.from(
    { length: paragraphs },
    (_, i) => `Paragraph ${i + 1}. ${PARAGRAPH}`,
  ).join("\n\n");
}

describe("chunkText", () => {
  test("every chunk's offsets slice back to exactly its text", async () => {
    const content = longText(40);
    const chunks = await chunkText(content);
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(content.slice(chunk.charStart, chunk.charEnd)).toBe(chunk.text);
    }
  });

  test("chunks are token-bounded and ordered", async () => {
    const content = longText(40);
    const chunks = await chunkText(content);
    for (const chunk of chunks) {
      expect(countTokens(chunk.text)).toBeLessThanOrEqual(CHUNK_SIZE_TOKENS);
    }
    for (let i = 1; i < chunks.length; i++) {
      expect(chunks[i].charStart).toBeGreaterThan(chunks[i - 1].charStart);
    }
  });

  test("overlapping chunks (unbroken prose) still slice back correctly", async () => {
    expect(CHUNK_OVERLAP_TOKENS).toBeGreaterThan(0);
    // One long paragraph: the splitter falls through to word-level splits,
    // which are small enough for its overlap mechanism to kick in.
    const content = Array.from({ length: 60 }, () => PARAGRAPH).join(" ");
    const chunks = await chunkText(content);
    let overlapping = 0;
    for (let i = 1; i < chunks.length; i++) {
      if (chunks[i].charStart < chunks[i - 1].charEnd) {
        overlapping++;
      }
    }
    expect(overlapping).toBeGreaterThan(0);
    for (const chunk of chunks) {
      expect(content.slice(chunk.charStart, chunk.charEnd)).toBe(chunk.text);
    }
  });

  test("repeated identical paragraphs still get correct offsets", async () => {
    const content = Array.from({ length: 30 }, () => PARAGRAPH).join("\n\n");
    const chunks = await chunkText(content);
    for (const chunk of chunks) {
      expect(content.slice(chunk.charStart, chunk.charEnd)).toBe(chunk.text);
    }
  });

  test("short text becomes a single chunk covering it fully (modulo trim)", async () => {
    const chunks = await chunkText(PARAGRAPH);
    expect(chunks).toHaveLength(1);
    expect(chunks[0].text).toBe(PARAGRAPH);
    expect(chunks[0].charStart).toBe(0);
    expect(chunks[0].charEnd).toBe(PARAGRAPH.length);
  });

  test("whitespace-only text yields no chunks", async () => {
    expect(await chunkText("  \n\n \t ")).toHaveLength(0);
    expect(await chunkText("")).toHaveLength(0);
  });
});

describe("chunkPages", () => {
  test("assigns page numbers and offsets into the joined content", async () => {
    const pages = [longText(10), longText(12), "Tiny final page."];
    const { content, chunks } = await chunkPages(pages);
    expect(chunks.length).toBeGreaterThan(2);
    const seenPages = new Set(chunks.map((c) => c.pageNumber));
    expect(seenPages).toEqual(new Set([1, 2, 3]));
    for (const chunk of chunks) {
      expect(content.slice(chunk.charStart, chunk.charEnd)).toBe(chunk.text);
    }
  });

  test("skips empty pages but keeps page numbering of later pages", async () => {
    const { content, chunks } = await chunkPages(["First page.", "", "Third page."]);
    expect(chunks.map((c) => c.pageNumber)).toEqual([1, 3]);
    for (const chunk of chunks) {
      expect(content.slice(chunk.charStart, chunk.charEnd)).toBe(chunk.text);
    }
  });
});
