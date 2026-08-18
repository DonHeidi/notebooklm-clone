import { beforeAll, describe, expect, test } from "bun:test";
import type { Database } from "../db";
import { createTestDatabase } from "../db/create-test-database";
import { NotFoundError } from "./errors";
import { createArtifactRepository } from "./artifact-repository";
import { createNotebookRepository } from "./notebook-repository";

let database: Database;

beforeAll(async () => {
  database = await createTestDatabase();
});

const owner = () => crypto.randomUUID();

async function notebookFor(ownerId: string) {
  return createNotebookRepository(database).create(ownerId, "Notebook");
}

const config = {
  language: "de" as const,
  voice: "seraphina",
  sourceIds: [] as string[],
};

describe("artifact repository", () => {
  test("create defaults status to pending and rejects foreign notebooks", async () => {
    const repo = createArtifactRepository(database);
    const alice = owner();
    const notebook = await notebookFor(alice);

    const artifact = await repo.create(alice, {
      notebookId: notebook.id,
      type: "audio_overview",
      title: "Audio Overview",
      config,
    });
    expect(artifact.status).toBe("pending");
    expect(artifact.config).toEqual(config);

    expect(
      repo.create(owner(), {
        notebookId: notebook.id,
        type: "audio_overview",
        title: "Sneaky",
        config,
      }),
    ).rejects.toThrow(NotFoundError);
  });

  test("listByNotebook requires ownership and orders newest first", async () => {
    const repo = createArtifactRepository(database);
    const alice = owner();
    const notebook = await notebookFor(alice);
    const first = await repo.create(alice, {
      notebookId: notebook.id,
      type: "audio_overview",
      title: "First",
      config,
    });
    const second = await repo.create(alice, {
      notebookId: notebook.id,
      type: "audio_overview",
      title: "Second",
      config,
    });

    const listed = await repo.listByNotebook(notebook.id, alice);
    expect(listed.map((a) => a.id)).toEqual([second.id, first.id]);
    expect(repo.listByNotebook(notebook.id, owner())).rejects.toThrow(
      NotFoundError,
    );
  });

  test("findById returns undefined for another user's artifact", async () => {
    const repo = createArtifactRepository(database);
    const alice = owner();
    const notebook = await notebookFor(alice);
    const artifact = await repo.create(alice, {
      notebookId: notebook.id,
      type: "audio_overview",
      title: "Mine",
      config,
    });

    expect((await repo.findById(artifact.id, alice))?.id).toBe(artifact.id);
    expect(await repo.findById(artifact.id, owner())).toBeUndefined();
  });

  test("update records generation state transitions and is owner-scoped", async () => {
    const repo = createArtifactRepository(database);
    const alice = owner();
    const notebook = await notebookFor(alice);
    const artifact = await repo.create(alice, {
      notebookId: notebook.id,
      type: "audio_overview",
      title: "Audio Overview",
      config,
    });

    const ready = await repo.update(artifact.id, alice, {
      status: "ready",
      storagePath: `${alice}/${artifact.id}.mp3`,
      durationSeconds: 261,
      title: "How cities emerged",
    });
    expect(ready.status).toBe("ready");
    expect(ready.durationSeconds).toBe(261);

    expect(
      repo.update(artifact.id, owner(), { status: "failed" }),
    ).rejects.toThrow(NotFoundError);
  });

  test("delete is owner-scoped", async () => {
    const repo = createArtifactRepository(database);
    const alice = owner();
    const notebook = await notebookFor(alice);
    const artifact = await repo.create(alice, {
      notebookId: notebook.id,
      type: "audio_overview",
      title: "Audio Overview",
      config,
    });

    expect(repo.delete(artifact.id, owner())).rejects.toThrow(NotFoundError);
    await repo.delete(artifact.id, alice);
    expect(await repo.findById(artifact.id, alice)).toBeUndefined();
  });
});
