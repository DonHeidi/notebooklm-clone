"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth";
import {
  createNotebook,
  deleteNotebook,
  renameNotebook,
} from "@/server/services/notebook-service";

// Notebook server actions — the URL-path layer of the DDD chain. Each one
// re-derives the owner from the verified JWT (requireUser); the client never
// supplies an owner id.

export async function createNotebookAction(): Promise<void> {
  const user = await requireUser();
  const notebook = await createNotebook(user.id);
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
