"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/server/auth";
import { NotFoundError } from "@/server/repositories/errors";
import { clearConversation } from "@/server/services/chat-service";

// Clear-chat (CF-08): deletes the notebook's conversation; messages and
// citations cascade. Owner is re-derived from the verified JWT.
export async function clearChatAction(
  notebookId: string,
): Promise<{ error?: string }> {
  const user = await requireUser();
  try {
    await clearConversation(notebookId, user.id);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return { error: "notebook not found" };
    }
    throw error;
  }
  revalidatePath(`/notebooks/${notebookId}`);
  return {};
}
