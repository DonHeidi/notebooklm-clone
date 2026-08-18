import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { extractArticle, ParseError, parsePdf, parsePlainText } from "./parsers";

const fixture = (name: string) => join(import.meta.dir, "fixtures", name);

describe("parsePdf", () => {
  test("extracts per-page text from a two-page PDF", async () => {
    const data = new Uint8Array(readFileSync(fixture("two-pages.pdf")));
    const { pages } = await parsePdf(data);
    expect(pages).toHaveLength(2);
    expect(pages[0]).toContain("Alpha page one text about rivers.");
    expect(pages[1]).toContain("Beta page two text about cities.");
  });

  test("rejects non-PDF bytes with a ParseError", async () => {
    const data = new TextEncoder().encode("definitely not a pdf");
    expect(parsePdf(data)).rejects.toBeInstanceOf(ParseError);
  });
});

describe("parsePlainText", () => {
  test("keeps markdown as-is, normalizing line endings", () => {
    const raw = readFileSync(fixture("notes.md"), "utf8");
    const text = parsePlainText(raw);
    expect(text).toContain("**bold** markdown");
    expect(text).toContain("# River valley notes");
  });

  test("normalizes CRLF and strips a BOM", () => {
    expect(parsePlainText("﻿a\r\nb\rc")).toBe("a\nb\nc");
  });
});

describe("extractArticle", () => {
  test("extracts article text and title, dropping nav/footer chrome", () => {
    const html = readFileSync(fixture("article.html"), "utf8");
    const { title, text } = extractArticle(html, "https://example.com/civ");
    expect(title).toBe("Early Civilisations — Field Notes");
    expect(text).toContain("cuneiform writing");
    expect(text).toContain("Mohenjo-daro");
    expect(text).not.toContain("All rights reserved");
  });

  test("throws ParseError when no article content is found", () => {
    expect(() => extractArticle("<html><body></body></html>", "https://x.test")).toThrow(
      ParseError,
    );
  });
});
