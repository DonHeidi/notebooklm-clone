import { getDb, type Database } from "../db";
import {
  createNotebookRepository,
  type Notebook,
} from "../repositories/notebook-repository";

// Thin business layer between server actions/pages and the repository, so UI
// code never touches the db module (AGENTS.md architecture path). Every call
// takes the verified auth user id as ownerId.

// Quota problems surface as user-presentable messages, mirroring
// SourceInputError/ArtifactInputError in the sibling services.
export class NotebookQuotaError extends Error {}

// Per-user cap (SF-11 / NF-15 minimum, A6): bounds the fan-out every other
// per-notebook guard multiplies against.
export const MAX_NOTEBOOKS_PER_USER = 20;

const DEFAULT_TITLE = "Untitled notebook";

function repository(database: Database = getDb()) {
  return createNotebookRepository(database);
}

export async function listNotebooks(
  ownerId: string,
  database?: Database,
): Promise<Notebook[]> {
  return repository(database).findByOwner(ownerId);
}

export async function getNotebook(
  id: string,
  ownerId: string,
  database?: Database,
): Promise<Notebook | undefined> {
  return repository(database).findById(id, ownerId);
}

// Creation is instant with a default title (ui-research §1: no wizard);
// naming happens inline afterwards.
export async function createNotebook(
  ownerId: string,
  database?: Database,
): Promise<Notebook> {
  const owned = await repository(database).countByOwner(ownerId);
  if (owned >= MAX_NOTEBOOKS_PER_USER) {
    throw new NotebookQuotaError(
      `you've reached the limit of ${MAX_NOTEBOOKS_PER_USER} notebooks — delete one to create another`,
    );
  }
  return repository(database).create(ownerId, DEFAULT_TITLE);
}

export async function renameNotebook(
  id: string,
  ownerId: string,
  title: string,
  database?: Database,
): Promise<Notebook> {
  const trimmed = title.trim();
  return repository(database).rename(
    id,
    ownerId,
    trimmed === "" ? DEFAULT_TITLE : trimmed,
  );
}

export async function deleteNotebook(
  id: string,
  ownerId: string,
  database?: Database,
): Promise<void> {
  return repository(database).delete(id, ownerId);
}
