import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { createClient } from "@supabase/supabase-js";
import { generateText } from "ai";
import { getDb, type Database } from "../db";
import {
  buildScriptPrompt,
  parseScriptResponse,
  type ScriptSource,
} from "../audio/script";
import { estimateMp3DurationSeconds } from "../audio/azure-tts";
import { createTtsProvider, type TtsProvider } from "../audio/tts";
import { DEFAULT_VOICE, voiceLabel, voicesForLanguage } from "../audio/voices";
import {
  createArtifactRepository,
  type Artifact,
} from "../repositories/artifact-repository";
import { createSourceRepository } from "../repositories/source-repository";
import type { AudioOverviewConfig } from "../db/schema";

// Business layer for the Audio Overview artifact (CF-12, SF-09). Mirrors the
// ingestion service: creation validates and writes a pending row, the
// generation pipeline runs detached via after() with job state on
// artifacts.status, and every I/O boundary is injectable for tests.

export class ArtifactInputError extends Error {}

// NF-15 guards (constants, not config — revisit with SF-11 quotas).
export const MAX_ARTIFACTS_PER_NOTEBOOK = 20;
export const MAX_CONCURRENT_GENERATIONS_PER_NOTEBOOK = 1;

// Shown to users on failed artifacts; keep it short and stack-free.
const MAX_ERROR_MESSAGE_LENGTH = 300;

// Default titles per language; a generated title only ever replaces these,
// never a name the user typed (rename survives regeneration).
const DEFAULT_TITLES: Record<AudioOverviewConfig["language"], string> = {
  de: "Audio-Überblick",
  en: "Audio Overview",
};

// Thin script-LLM interface (D-4/NF-16): one completion call, injectable so
// tests run a fake.
export type ScriptLlm = {
  complete(input: { system: string; prompt: string }): Promise<string>;
};

export function createScalewayScriptLlm(): ScriptLlm {
  const provider = createOpenAICompatible({
    name: "scaleway",
    baseURL:
      process.env.SCW_GENERATIVE_APIS_BASE_URL ?? "https://api.scaleway.ai/v1",
    apiKey: process.env.SCW_GENERATIVE_APIS_KEY ?? "",
  });
  // Model names rotate on Scaleway EOL cycles (D-4) — override via env.
  const modelId =
    process.env.SCW_GENERATIVE_APIS_MODEL ?? "mistral-small-3.2-24b-instruct-2506";
  return {
    async complete({ system, prompt }) {
      const { text } = await generateText({
        model: provider.chatModel(modelId),
        system,
        prompt,
      });
      return text;
    },
  };
}

export const ARTIFACTS_BUCKET = "artifacts";

// Server-only Storage access for the artifacts bucket; service-role because
// generation runs in after(), outside the request's cookie context (same
// rationale as src/server/storage.ts). Every call site is behind app-layer
// ownership checks and owner-prefixed paths.
function adminStorage() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  ).storage.from(ARTIFACTS_BUCKET);
}

async function defaultUploadAudio(
  path: string,
  bytes: Uint8Array,
  mimeType: string,
): Promise<void> {
  // upsert: regeneration replaces the previous audio at the same path.
  const { error } = await adminStorage().upload(path, bytes, {
    contentType: mimeType,
    upsert: true,
  });
  if (error) {
    throw new Error(`could not store the generated audio: ${error.message}`);
  }
}

async function defaultDeleteAudio(path: string): Promise<void> {
  const { error } = await adminStorage().remove([path]);
  if (error) {
    // The DB row is the source of truth; dangling audio is acceptable debris.
    console.error(`failed to delete artifact audio ${path}: ${error.message}`);
  }
}

const SIGNED_URL_TTL_SECONDS = 600;

async function defaultSignAudioUrl(
  path: string,
  options: { download?: string },
): Promise<string> {
  const { data, error } = await adminStorage().createSignedUrl(
    path,
    SIGNED_URL_TTL_SECONDS,
    options.download ? { download: options.download } : undefined,
  );
  if (error || !data) {
    throw new Error(`could not create a playback URL: ${error?.message ?? "unknown"}`);
  }
  return data.signedUrl;
}

export type AudioOverviewDeps = {
  db?: Database;
  tts?: TtsProvider;
  llm?: ScriptLlm;
  uploadAudio?: (path: string, bytes: Uint8Array, mimeType: string) => Promise<void>;
  deleteAudio?: (path: string) => Promise<void>;
  signAudioUrl?: (path: string, options: { download?: string }) => Promise<string>;
};

function resolveDeps(deps: AudioOverviewDeps): Required<AudioOverviewDeps> {
  return {
    db: deps.db ?? getDb(),
    tts: deps.tts ?? createTtsProvider(),
    llm: deps.llm ?? createScalewayScriptLlm(),
    uploadAudio: deps.uploadAudio ?? defaultUploadAudio,
    deleteAudio: deps.deleteAudio ?? defaultDeleteAudio,
    signAudioUrl: deps.signAudioUrl ?? defaultSignAudioUrl,
  };
}

function assertNoConcurrentGeneration(
  existing: Artifact[],
  excludeId?: string,
): void {
  const generating = existing.filter(
    (artifact) =>
      artifact.id !== excludeId &&
      (artifact.status === "pending" || artifact.status === "processing"),
  );
  if (generating.length >= MAX_CONCURRENT_GENERATIONS_PER_NOTEBOOK) {
    throw new ArtifactInputError(
      "an audio overview is already generating in this notebook — wait for it to finish",
    );
  }
}

export type NewAudioOverviewInput = {
  notebookId: string;
  language: AudioOverviewConfig["language"];
  voice?: string;
  focusPrompt?: string;
  sourceIds: string[];
};

export async function createAudioOverview(
  ownerId: string,
  input: NewAudioOverviewInput,
  deps: AudioOverviewDeps = {},
): Promise<Artifact> {
  const { db } = resolveDeps(deps);
  const artifactRepository = createArtifactRepository(db);

  const voice = input.voice ?? DEFAULT_VOICE[input.language];
  if (!voicesForLanguage(input.language).some((option) => option.key === voice)) {
    throw new ArtifactInputError(
      `"${voice}" is not an available ${input.language === "de" ? "German" : "English"} voice`,
    );
  }

  if (input.sourceIds.length === 0) {
    throw new ArtifactInputError("select at least one source for the overview");
  }
  // Selection is validated owner-scoped server-side (CF-05/SEC-5): every id
  // must resolve to the caller's own, fully ingested source.
  const sourceRepository = createSourceRepository(db);
  for (const sourceId of input.sourceIds) {
    const source = await sourceRepository.findById(sourceId, ownerId);
    if (!source) {
      throw new ArtifactInputError("a selected source was not found");
    }
    if (source.status !== "ready" || !source.content?.trim()) {
      throw new ArtifactInputError(
        `"${source.title}" is not ready yet — wait for ingestion to finish`,
      );
    }
  }

  const existing = await artifactRepository.listByNotebook(
    input.notebookId,
    ownerId,
  );
  if (existing.length >= MAX_ARTIFACTS_PER_NOTEBOOK) {
    throw new ArtifactInputError(
      `this notebook already has the maximum of ${MAX_ARTIFACTS_PER_NOTEBOOK} artifacts — delete one first`,
    );
  }
  assertNoConcurrentGeneration(existing);

  const config: AudioOverviewConfig = {
    language: input.language,
    voice,
    ...(input.focusPrompt?.trim() ? { focusPrompt: input.focusPrompt.trim() } : {}),
    sourceIds: input.sourceIds,
  };
  return artifactRepository.create(ownerId, {
    notebookId: input.notebookId,
    type: "audio_overview",
    title: DEFAULT_TITLES[input.language],
    config,
  });
}

// Runs the generation end-to-end and records the outcome on the artifact
// row. Never throws — it runs detached inside after(), so failures land in
// status=failed + errorMessage (mirrors ingestSource).
export async function generateAudioOverview(
  artifactId: string,
  ownerId: string,
  deps: AudioOverviewDeps = {},
): Promise<void> {
  const resolved = resolveDeps(deps);
  const repository = createArtifactRepository(resolved.db);

  const artifact = await repository.findById(artifactId, ownerId);
  if (!artifact) {
    // Deleted (or never owned) in the meantime — nothing to do.
    return;
  }
  const config = artifact.config;

  try {
    await repository.update(artifactId, ownerId, {
      status: "processing",
      errorMessage: null,
    });

    const sourceRepository = createSourceRepository(resolved.db);
    const scriptSources: ScriptSource[] = [];
    for (const sourceId of config.sourceIds) {
      const source = await sourceRepository.findById(sourceId, ownerId);
      if (!source || source.status !== "ready" || !source.content?.trim()) {
        throw new Error(
          "a selected source is no longer available — it may have been deleted",
        );
      }
      scriptSources.push({ title: source.title, content: source.content });
    }

    const { system, prompt } = buildScriptPrompt({
      language: config.language,
      voiceLabel: voiceLabel(config.voice),
      focusPrompt: config.focusPrompt,
      sources: scriptSources,
    });

    let raw: string;
    try {
      raw = await resolved.llm.complete({ system, prompt });
    } catch (error) {
      console.error(`script generation failed for artifact ${artifactId}:`, error);
      throw new Error("the overview script could not be generated");
    }
    const { title, script } = parseScriptResponse(raw);
    if (script === "") {
      throw new Error("the overview script could not be generated");
    }

    const { audio, mimeType } = await resolved.tts.synthesize({
      script,
      language: config.language,
      voice: config.voice,
    });

    const storagePath = `${ownerId}/${artifactId}.mp3`;
    await resolved.uploadAudio(storagePath, audio, mimeType);

    await repository.update(artifactId, ownerId, {
      status: "ready",
      storagePath,
      durationSeconds: estimateMp3DurationSeconds(audio.byteLength),
      // A generated title only replaces the language default — a rename by
      // the user survives regeneration.
      ...(title && artifact.title === DEFAULT_TITLES[config.language]
        ? { title }
        : {}),
    });
  } catch (error) {
    console.error(`audio overview generation failed for ${artifactId}:`, error);
    const message = error instanceof Error ? error.message : "generation failed";
    await repository
      .update(artifactId, ownerId, {
        status: "failed",
        errorMessage: message.slice(0, MAX_ERROR_MESSAGE_LENGTH),
      })
      .catch((updateError) =>
        console.error(`could not mark artifact ${artifactId} as failed:`, updateError),
      );
  }
}

export async function listArtifacts(
  notebookId: string,
  ownerId: string,
  deps: AudioOverviewDeps = {},
): Promise<Artifact[]> {
  const { db } = resolveDeps(deps);
  return createArtifactRepository(db).listByNotebook(notebookId, ownerId);
}

// Same config → new run replacing the audio at the same storage path.
export async function regenerateAudioOverview(
  artifactId: string,
  ownerId: string,
  deps: AudioOverviewDeps = {},
): Promise<Artifact> {
  const { db } = resolveDeps(deps);
  const repository = createArtifactRepository(db);
  const artifact = await repository.findById(artifactId, ownerId);
  if (!artifact) {
    throw new ArtifactInputError("artifact not found");
  }
  if (artifact.status === "pending" || artifact.status === "processing") {
    throw new ArtifactInputError("this overview is already generating");
  }
  const existing = await repository.listByNotebook(artifact.notebookId, ownerId);
  assertNoConcurrentGeneration(existing, artifactId);
  return repository.update(artifactId, ownerId, {
    status: "pending",
    errorMessage: null,
  });
}

export async function renameArtifact(
  artifactId: string,
  ownerId: string,
  title: string,
  deps: AudioOverviewDeps = {},
): Promise<Artifact> {
  const trimmed = title.trim();
  if (trimmed === "") {
    throw new ArtifactInputError("the title cannot be empty");
  }
  const { db } = resolveDeps(deps);
  return createArtifactRepository(db).update(artifactId, ownerId, {
    title: trimmed,
  });
}

export async function deleteArtifact(
  artifactId: string,
  ownerId: string,
  deps: AudioOverviewDeps = {},
): Promise<void> {
  const resolved = resolveDeps(deps);
  const repository = createArtifactRepository(resolved.db);
  const artifact = await repository.findById(artifactId, ownerId);
  if (artifact?.storagePath) {
    await resolved.deleteAudio(artifact.storagePath);
  }
  await repository.delete(artifactId, ownerId);
}

// Short-lived signed URL for playback/download of a ready artifact.
export async function getArtifactAudioUrl(
  artifactId: string,
  ownerId: string,
  options: { download?: boolean } = {},
  deps: AudioOverviewDeps = {},
): Promise<string> {
  const resolved = resolveDeps(deps);
  const artifact = await createArtifactRepository(resolved.db).findById(
    artifactId,
    ownerId,
  );
  if (!artifact || artifact.status !== "ready" || !artifact.storagePath) {
    throw new ArtifactInputError("this artifact has no audio yet");
  }
  return resolved.signAudioUrl(artifact.storagePath, {
    download: options.download ? `${artifact.title}.mp3` : undefined,
  });
}
