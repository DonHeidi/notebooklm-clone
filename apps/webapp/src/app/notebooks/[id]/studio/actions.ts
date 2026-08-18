"use server";

import { after } from "next/server";
import { requireUser } from "@/server/auth";
import { NotFoundError } from "@/server/repositories/errors";
import {
  ArtifactInputError,
  createAudioOverview,
  deleteArtifact,
  generateAudioOverview,
  getArtifactAudioUrl,
  listArtifacts,
  regenerateAudioOverview,
  renameArtifact,
} from "@/server/services/audio-overview-service";

// Studio server actions — the URL-path layer for the Studio panel. Owner is
// always re-derived from the verified JWT. Generation runs detached via
// after() (SF-09), and the panel observes artifacts.status by polling,
// exactly like the Sources panel does for ingestion.

export type ArtifactListItem = {
  id: string;
  type: "audio_overview";
  title: string;
  status: "pending" | "processing" | "ready" | "failed";
  errorMessage: string | null;
  language: "de" | "en";
  voice: string;
  durationSeconds: number | null;
  createdAt: string;
};

type ActionResult = { error?: string };

function toListItem(artifact: {
  id: string;
  type: ArtifactListItem["type"];
  title: string;
  status: ArtifactListItem["status"];
  errorMessage: string | null;
  config: { language: "de" | "en"; voice: string };
  durationSeconds: number | null;
  createdAt: Date;
}): ArtifactListItem {
  return {
    id: artifact.id,
    type: artifact.type,
    title: artifact.title,
    status: artifact.status,
    errorMessage: artifact.errorMessage,
    language: artifact.config.language,
    voice: artifact.config.voice,
    durationSeconds: artifact.durationSeconds,
    createdAt: artifact.createdAt.toISOString(),
  };
}

// User-input problems come back as messages; anything else is a real bug and
// propagates (Next surfaces a generic error page — no internals leak).
function asActionError(error: unknown): ActionResult {
  if (error instanceof ArtifactInputError || error instanceof NotFoundError) {
    return { error: error.message };
  }
  throw error;
}

export async function listArtifactsAction(
  notebookId: string,
): Promise<ArtifactListItem[]> {
  const user = await requireUser();
  const artifacts = await listArtifacts(notebookId, user.id);
  return artifacts.map(toListItem);
}

export async function createAudioOverviewAction(
  notebookId: string,
  input: {
    language: "de" | "en";
    voice: string;
    focusPrompt?: string;
    sourceIds: string[];
  },
): Promise<ActionResult> {
  const user = await requireUser();
  try {
    const artifact = await createAudioOverview(user.id, {
      notebookId,
      ...input,
    });
    after(() => generateAudioOverview(artifact.id, user.id));
    return {};
  } catch (error) {
    return asActionError(error);
  }
}

export async function regenerateArtifactAction(
  artifactId: string,
): Promise<ActionResult> {
  const user = await requireUser();
  try {
    await regenerateAudioOverview(artifactId, user.id);
    after(() => generateAudioOverview(artifactId, user.id));
    return {};
  } catch (error) {
    return asActionError(error);
  }
}

export async function renameArtifactAction(
  artifactId: string,
  title: string,
): Promise<ActionResult> {
  const user = await requireUser();
  try {
    await renameArtifact(artifactId, user.id, title);
    return {};
  } catch (error) {
    return asActionError(error);
  }
}

export async function deleteArtifactAction(
  artifactId: string,
): Promise<ActionResult> {
  const user = await requireUser();
  try {
    await deleteArtifact(artifactId, user.id);
    return {};
  } catch (error) {
    return asActionError(error);
  }
}

export async function getArtifactAudioUrlAction(
  artifactId: string,
  options: { download?: boolean } = {},
): Promise<{ url?: string; error?: string }> {
  const user = await requireUser();
  try {
    return { url: await getArtifactAudioUrl(artifactId, user.id, options) };
  } catch (error) {
    return asActionError(error);
  }
}
