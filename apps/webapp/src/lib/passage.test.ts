import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { chunkText } from "../server/ingestion/chunking";
import { splitAtPassage } from "./passage";

describe("splitAtPassage", () => {
  test("splits content into before, passage, after", () => {
    const content = "alpha beta gamma";
    const segments = splitAtPassage(content, 6, 10);
    expect(segments).toEqual({
      before: "alpha ",
      passage: "beta",
      after: " gamma",
    });
  });

  test("segments always reassemble into the original content", () => {
    const content = "one two three";
    const segments = splitAtPassage(content, 4, 7);
    expect(segments).not.toBeNull();
    const { before, passage, after } = segments!;
    expect(before + passage + after).toBe(content);
  });

  test("handles the boundaries: start of content and end of content", () => {
    const content = "abcdef";
    expect(splitAtPassage(content, 0, 3)).toEqual({
      before: "",
      passage: "abc",
      after: "def",
    });
    expect(splitAtPassage(content, 3, 6)).toEqual({
      before: "abc",
      passage: "def",
      after: "",
    });
    expect(splitAtPassage(content, 0, 6)).toEqual({
      before: "",
      passage: "abcdef",
      after: "",
    });
  });

  test("clamps out-of-range offsets instead of throwing", () => {
    const content = "abcdef";
    expect(splitAtPassage(content, -2, 3)).toEqual({
      before: "",
      passage: "abc",
      after: "def",
    });
    expect(splitAtPassage(content, 3, 99)).toEqual({
      before: "abc",
      passage: "def",
      after: "",
    });
  });

  test("returns null when the range is empty or inverted", () => {
    const content = "abcdef";
    expect(splitAtPassage(content, 3, 3)).toBeNull();
    expect(splitAtPassage(content, 4, 2)).toBeNull();
    expect(splitAtPassage(content, 99, 120)).toBeNull();
    expect(splitAtPassage("", 0, 5)).toBeNull();
  });

  test("returns null for non-finite offsets", () => {
    const content = "abcdef";
    expect(splitAtPassage(content, Number.NaN, 3)).toBeNull();
    expect(splitAtPassage(content, 0, Number.POSITIVE_INFINITY)).toBeNull();
  });

  test("offsets are UTF-16 code units — consistent with String.slice on unicode", () => {
    // Emoji (surrogate pairs), umlauts, and CJK — the same unit convention
    // ingestion used when it computed charStart/charEnd.
    const content = "Grüße 👋 aus München — 東京の資料です。";
    const passage = "aus München";
    const start = content.indexOf(passage);
    const segments = splitAtPassage(content, start, start + passage.length);
    expect(segments?.passage).toBe(passage);
    expect(segments!.before + segments!.passage + segments!.after).toBe(content);
  });

  test("round-trips real chunk offsets from the ingestion fixture", async () => {
    const content = readFileSync(
      join(import.meta.dir, "../server/ingestion/fixtures/notes.md"),
      "utf8",
    ).replaceAll("\r\n", "\n");
    const chunks = await chunkText(content);
    expect(chunks.length).toBeGreaterThan(0);
    for (const chunk of chunks) {
      const segments = splitAtPassage(content, chunk.charStart, chunk.charEnd);
      expect(segments?.passage).toBe(chunk.text);
    }
  });
});
