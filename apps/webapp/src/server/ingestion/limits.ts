// Ingestion guard rails (NF-15 minimum). Deliberately simple constants.
// Per-user quotas (notebooks, daily chat messages, daily audio overviews)
// live in their owning services — see src/server/services/quota.ts (A6).

// Hard cap per uploaded file. Also enforced server-side by the `sources`
// storage bucket's file_size_limit (see the storage migration).
export const MAX_FILE_BYTES = 20 * 1024 * 1024;

// Cap on extracted text size per source, counted in whitespace-separated
// words (~150k tokens — comfortably chunkable and embeddable).
export const MAX_SOURCE_WORDS = 200_000;

export const MAX_SOURCES_PER_NOTEBOOK = 50;

export function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}
