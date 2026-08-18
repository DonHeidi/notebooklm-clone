"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth";
import {
  createNotebook,
  deleteNotebook,
  NotebookQuotaError,
  renameNotebook,
} from "@/server/services/notebook-service";

// Notebook server actions — the URL-path layer of the DDD chain. Each one
// re-derives the owner from the verified JWT (requireUser); the client never
// supplies an owner id.

// Quota rejections come back as messages (SF-11); on success the redirect
// throws, so callers only ever see the error shape.
export async function createNotebookAction(): Promise<{ error?: string }> {
  const user = await requireUser();
  let notebook;
  try {
    notebook = await createNotebook(user.id);
  } catch (error) {
    if (error instanceof NotebookQuotaError) {
      return { error: error.message };
    }
    throw error;
  }
  revalidatePath("/");
  // Instant creation (ui-research §1): land in the new notebook right away.
  redirect(`/notebooks/${notebook.id}`);
}

export async function renameNotebookAction(
  id: string,
  title: string,
): Promise<void> {
  const user = await requireUser();
  await renameNotebook(id, user.id, title);
  revalidatePath("/");
  revalidatePath(`/notebooks/${id}`);
}

export async function deleteNotebookAction(id: string): Promise<void> {
  const user = await requireUser();
  await deleteNotebook(id, user.id);
  revalidatePath("/");
}
