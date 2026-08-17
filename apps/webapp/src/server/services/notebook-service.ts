import { getDb } from "../db";
import {
  createNotebookRepository,
  type Notebook,
} from "../repositories/notebook-repository";

// Thin business layer between server actions/pages and the repository, so UI
// code never touches the db module (AGENTS.md architecture path). Every call
// takes the verified auth user id as ownerId.

const DEFAULT_TITLE = "Untitled notebook";

function repository() {
  return createNotebookRepository(getDb());
}

export async function listNotebooks(ownerId: string): Promise<Notebook[]> {
  return repository().findByOwner(ownerId);
}

export async function getNotebook(
  id: string,
  ownerId: string,
): Promise<Notebook | undefined> {
  return repository().findById(id, ownerId);
}

// Creation is instant with a default title (ui-research §1: no wizard);
// naming happens inline afterwards.
export async function createNotebook(ownerId: string): Promise<Notebook> {
  return repository().create(ownerId, DEFAULT_TITLE);
}

export async function renameNotebook(
  id: string,
  ownerId: string,
  title: string,
): Promise<Notebook> {
  const trimmed = title.trim();
  return repository().rename(id, ownerId, trimmed === "" ? DEFAULT_TITLE : trimmed);
}

export async function deleteNotebook(
  id: string,
  ownerId: string,
): Promise<void> {
  return repository().delete(id, ownerId);
}
