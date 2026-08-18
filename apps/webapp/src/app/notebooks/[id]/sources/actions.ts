"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { requireUser } from "@/server/auth";
import { NotFoundError } from "@/server/repositories/errors";
import { ingestSource } from "@/server/services/ingestion-service";
import {
  createFileSource,
  createTextSource,
  createUrlSource,
  deleteSource,
  getSource,
  listSources,
  SourceInputError,
} from "@/server/services/source-service";

// Source server actions — the URL-path layer for the Sources panel. Owner is
// always re-derived from the verified JWT; the client never supplies it.
// Creation actions return immediately: ingestion runs detached via after()
// (feasibility D-2 stage 1), and the panel observes sources.status.

// Lean projection for the panel list — omits `content`, which can be
// megabytes and is only needed by the viewer.
export type SourceListItem = {
  id: string;
  type: "file" | "text" | "url";
  title: string;
  status: "pending" | "processing" | "ready" | "failed";
  errorMessage: string | null;
  createdAt: string;
};

export type SourceDetail = SourceListItem & {
  url: string | null;
  content: string | null;
};

type ActionResult = { error?: string };

function toListItem(source: {
  id: string;
  type: SourceListItem["type"];
  title: string;
  status: SourceListItem["status"];
  errorMessage: string | null;
  createdAt: Date;
}): SourceListItem {
  return {
    id: source.id,
    type: source.type,
    title: source.title,
    status: source.status,
    errorMessage: source.errorMessage,
    createdAt: source.createdAt.toISOString(),
  };
}

// User-input problems come back as messages; anything else is a real bug and
// propagates (Next surfaces a generic error page — no internals leak).
async function runCreate(create: () => Promise<{ id: string }>, ownerId: string) {
  try {
    const source = await create();
    after(() => ingestSource(source.id, ownerId));
    return {};
  } catch (error) {
    if (error instanceof SourceInputError || error instanceof NotFoundError) {
      return { error: error.message };
    }
    throw error;
  }
}

export async function listSourcesAction(
  notebookId: string,
): Promise<SourceListItem[]> {
  const user = await requireUser();
  const sources = await listSources(notebookId, user.id);
  return sources.map(toListItem);
}

export async function addTextSourceAction(
  notebookId: string,
  input: { title: string; content: string },
): Promise<ActionResult> {
  const user = await requireUser();
  return runCreate(
    () => createTextSource(user.id, { notebookId, ...input }),
    user.id,
  );
}

export async function addUrlSourceAction(
  notebookId: string,
  url: string,
): Promise<ActionResult> {
  const user = await requireUser();
  return runCreate(() => createUrlSource(user.id, { notebookId, url }), user.id);
}

export async function addFileSourceAction(
  notebookId: string,
  input: { fileName: string; storagePath: string; fileSize: number },
): Promise<ActionResult> {
  const user = await requireUser();
  return runCreate(
    () => createFileSource(user.id, { notebookId, ...input }),
    user.id,
  );
}

export async function getSourceAction(
  sourceId: string,
): Promise<SourceDetail | null> {
  const user = await requireUser();
  const source = await getSource(sourceId, user.id);
  if (!source) {
    return null;
  }
  return { ...toListItem(source), url: source.url, content: source.content };
}

export async function deleteSourceAction(
  sourceId: string,
  notebookId: string,
): Promise<ActionResult> {
  const user = await requireUser();
  try {
    await deleteSource(sourceId, user.id);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return { error: "source not found" };
    }
    throw error;
  }
  revalidatePath(`/notebooks/${notebookId}`);
  return {};
}
