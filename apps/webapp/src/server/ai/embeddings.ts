import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { embedMany } from "ai";
import { EMBEDDING_DIMENSIONS } from "../db/schema";

// Thin embedding interface (feasibility D-4 / NF-16): the ingestion pipeline
// depends on this, tests substitute a deterministic fake, and any
// OpenAI-compatible endpoint can back it via config.
export interface Embedder {
  embed(texts: string[]): Promise<number[][]>;
}

// qwen3-embedding-8b natively outputs 4096 dims; it is Matryoshka-trained and
// Scaleway documents requesting 2000 dims for pgvector HNSW (see
// EMBEDDING_DIMENSIONS in the schema). Model name rotates on Scaleway EOL
// cycles — override via env.
const DEFAULT_EMBEDDING_MODEL = "qwen3-embedding-8b";

export function createScalewayEmbedder(): Embedder {
  const provider = createOpenAICompatible({
    name: "scaleway",
    // Project-scoped base URL (https://api.scaleway.ai/<project-id>/v1) is
    // required when the IAM key's default project isn't the target project.
    baseURL:
      process.env.SCW_GENERATIVE_APIS_BASE_URL ?? "https://api.scaleway.ai/v1",
    apiKey: process.env.SCW_GENERATIVE_APIS_KEY ?? "",
  });
  const modelId =
    process.env.SCW_GENERATIVE_APIS_EMBEDDING_MODEL ?? DEFAULT_EMBEDDING_MODEL;

  return {
    async embed(texts: string[]): Promise<number[][]> {
      if (texts.length === 0) {
        return [];
      }
      // embedMany batches values into as few API requests as the model
      // allows and preserves input order.
      const { embeddings } = await embedMany({
        model: provider.textEmbeddingModel(modelId),
        values: texts,
        providerOptions: {
          scaleway: { dimensions: EMBEDDING_DIMENSIONS },
        },
      });
      for (const embedding of embeddings) {
        if (embedding.length !== EMBEDDING_DIMENSIONS) {
          throw new Error(
            `embedding provider returned ${embedding.length} dimensions, expected ${EMBEDDING_DIMENSIONS} — check the model supports Matryoshka truncation`,
          );
        }
      }
      return embeddings;
    },
  };
}
