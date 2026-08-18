import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModel } from "ai";

// Chat model against Scaleway Generative APIs (feasibility D-4): OpenAI-
// compatible, so any compatible endpoint swaps in via env (NF-16). Model
// names rotate on Scaleway EOL cycles — override via env.
const DEFAULT_CHAT_MODEL = "mistral-small-3.2-24b-instruct-2506";

export function createScalewayChatModel(): LanguageModel {
  const provider = createOpenAICompatible({
    name: "scaleway",
    // Project-scoped base URL (https://api.scaleway.ai/<project-id>/v1) is
    // required when the IAM key's default project isn't the target project.
    baseURL:
      process.env.SCW_GENERATIVE_APIS_BASE_URL ?? "https://api.scaleway.ai/v1",
    apiKey: process.env.SCW_GENERATIVE_APIS_KEY ?? "",
  });
  return provider(process.env.SCW_GENERATIVE_APIS_MODEL ?? DEFAULT_CHAT_MODEL);
}
