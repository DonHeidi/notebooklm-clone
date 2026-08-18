// Pure slicing math for citation → passage highlighting (CF-07). Offsets are
// UTF-16 code units into the source's parsed content — the same convention
// ingestion used to compute chunk charStart/charEnd, so the A3 invariant
// content.slice(charStart, charEnd) === chunk.text carries through 1:1.

export type PassageSegments = {
  before: string;
  passage: string;
  after: string;
};

// Splits content around the [charStart, charEnd) passage. Out-of-range
// offsets are clamped; an empty or inverted range (or non-finite offsets)
// yields null — the caller renders the content without a highlight.
export function splitAtPassage(
  content: string,
  charStart: number,
  charEnd: number,
): PassageSegments | null {
  if (!Number.isFinite(charStart) || !Number.isFinite(charEnd)) {
    return null;
  }
  const start = Math.max(0, Math.min(charStart, content.length));
  const end = Math.max(0, Math.min(charEnd, content.length));
  if (start >= end) {
    return null;
  }
  return {
    before: content.slice(0, start),
    passage: content.slice(start, end),
    after: content.slice(end),
  };
}
