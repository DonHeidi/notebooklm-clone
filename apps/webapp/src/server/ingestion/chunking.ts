import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { countTokens } from "gpt-tokenizer";

// Chunk sizing is measured in tokens (gpt-tokenizer as an approximation of
// the embedding model's tokenizer — exactness doesn't matter, staying well
// under the model's context window does). ~400 tokens keeps chunks
// paragraph-sized for citation display (CF-07) while leaving retrieval
// enough context; the overlap preserves continuity across boundaries.
export const CHUNK_SIZE_TOKENS = 400;
export const CHUNK_OVERLAP_TOKENS = 40;

export type TextChunk = {
  text: string;
  // Offsets into the source's full `content` string — the raw material for
  // citation navigation (A5). Invariant: content.slice(charStart, charEnd)
  // === text. Enforced here, tested in chunking.test.ts.
  charStart: number;
  charEnd: number;
  pageNumber?: number;
};

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: CHUNK_SIZE_TOKENS,
  chunkOverlap: CHUNK_OVERLAP_TOKENS,
  lengthFunction: (text: string) => countTokens(text),
});

// Splits `content` into token-bounded, sentence/paragraph-aware chunks and
// maps each back to exact character offsets. The splitter only ever emits
// trimmed substrings of its input (it splits on literal separators and
// rejoins with the same separator), so each chunk is located with indexOf,
// scanning forward from the previous chunk's start — chunks overlap, so the
// scan starts at charStart + 1, not charEnd.
export async function chunkText(
  content: string,
  baseOffset = 0,
  pageNumber?: number,
): Promise<TextChunk[]> {
  if (content.trim() === "") {
    return [];
  }
  const pieces = await splitter.splitText(content);
  const chunks: TextChunk[] = [];
  let searchFrom = 0;
  for (const text of pieces) {
    const charStart = content.indexOf(text, searchFrom);
    if (charStart === -1) {
      // Would only happen if the splitter emitted a non-substring — a bug,
      // not a data condition. Fail the ingestion rather than store offsets
      // that citation navigation can't trust.
      throw new Error("chunker produced text that is not a substring of the source content");
    }
    chunks.push({
      text,
      charStart: baseOffset + charStart,
      charEnd: baseOffset + charStart + text.length,
      pageNumber,
    });
    searchFrom = charStart + 1;
  }
  return chunks;
}

const PAGE_SEPARATOR = "\n\n";

// PDF ingestion: pages are chunked independently so every chunk has an
// unambiguous page number, and offsets index into the joined content that
// gets stored on sources.content.
export async function chunkPages(
  pages: string[],
): Promise<{ content: string; chunks: TextChunk[] }> {
  const content = pages.join(PAGE_SEPARATOR);
  const chunks: TextChunk[] = [];
  let offset = 0;
  for (const [index, page] of pages.entries()) {
    chunks.push(...(await chunkText(page, offset, index + 1)));
    offset += page.length + PAGE_SEPARATOR.length;
  }
  return { content, chunks };
}
