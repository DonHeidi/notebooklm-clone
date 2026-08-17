import { and, eq } from "drizzle-orm";
import type { Database } from "../db";
import { notebooks } from "../db/schema";
import { NotFoundError } from "./errors";

// Shared authorization guard for repositories that write into a notebook's
// child tables: the notebook must exist AND belong to the caller.
export async function assertNotebookOwnership(
  database: Database,
  notebookId: string,
  ownerId: string,
): Promise<void> {
  const [row] = await database
    .select({ id: notebooks.id })
    .from(notebooks)
    .where(and(eq(notebooks.id, notebookId), eq(notebooks.ownerId, ownerId)))
    .limit(1);
  if (!row) {
    throw new NotFoundError("notebook not found");
  }
}
