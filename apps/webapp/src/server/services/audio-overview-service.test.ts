import { beforeAll, describe, expect, test } from "bun:test";
import type { Database } from "../db";
import { createTestDatabase } from "../db/create-test-database";
import { createArtifactRepository } from "../repositories/artifact-repository";
import { createNotebookRepository } from "../repositories/notebook-repository";
import { createSourceRepository } from "../repositories/source-repository";
import type { TtsProvider } from "../audio/tts";
import {
  ArtifactInputError,
  createAudioOverview,
  deleteArtifact,
  generateAudioOverview,
  MAX_ARTIFACTS_PER_NOTEBOOK,
  regenerateAudioOverview,
  renameArtifact,
  type AudioOverviewDeps,
} from "./audio-overview-service";

let database: Database;

beforeAll(async () => {
  database = await createTestDatabase();
});

const owner = () => crypto.randomUUID();

async function notebookFor(ownerId: string) {
  return createNotebookRepository(database).create(ownerId, "Notebook");
}

async function readySource(ownerId: string, notebookId: string, content: string) {
  const repo = createSourceRepository(database);
  const source = await repo.create(ownerId, {
    notebookId,
    type: "text",
    title: "Source",
    content,
  });
  return repo.update(source.id, ownerId, { status: "ready" });
}

const fakeTts = (audioBytes = 120_000): TtsProvider => ({
  async synthesize() {
    return {
      audio: new Uint8Array(audioBytes),
      mimeType: "audio/mpeg",
      charactersBilled: 100,
    };
  },
  async listVoices() {
    return [];
  },
});

type Upload = { path: string; bytes: Uint8Array; mimeType: string };

function testDeps(overrides: Partial<AudioOverviewDeps> = {}) {
  const uploads: Upload[] = [];
  const deletes: string[] = [];
  const deps: AudioOverviewDeps = {
    db: database,
    tts: fakeTts(),
    llm: {
      complete: async () => "TITLE: How cities emerged\n\nWelcome listener.",
    },
    uploadAudio: async (path, bytes, mimeType) => {
      uploads.push({ path, bytes, mimeType });
    },
    deleteAudio: async (path) => {
      deletes.push(path);
    },
    ...overrides,
  };
  return { deps, uploads, deletes };
}

async function createReadyInput(ownerId: string) {
  const notebook = await notebookFor(ownerId);
  const source = await readySource(ownerId, notebook.id, "Rivers enabled trade.");
  return { notebook, source };
}

describe("createAudioOverview", () => {
  test("creates a pending artifact carrying the full config", async () => {
    const alice = owner();
    const { notebook, source } = await createReadyInput(alice);
    const { deps } = testDeps();

    const artifact = await createAudioOverview(
      alice,
      { notebookId: notebook.id, language: "de", sourceIds: [source.id] },
      deps,
    );

    expect(artifact.status).toBe("pending");
    expect(artifact.type).toBe("audio_overview");
    expect(artifact.config).toEqual({
      language: "de",
      voice: "seraphina",
      sourceIds: [source.id],
    });
  });

  test("rejects sources the caller does not own", async () => {
    const alice = owner();
    const mallory = owner();
    const { source } = await createReadyInput(alice);
    const malloryNotebook = await notebookFor(mallory);
    const { deps } = testDeps();

    expect(
      createAudioOverview(
        mallory,
        { notebookId: malloryNotebook.id, language: "en", sourceIds: [source.id] },
        deps,
      ),
    ).rejects.toThrow(ArtifactInputError);
  });

  test("rejects empty selections and sources that are not ready", async () => {
    const alice = owner();
    const notebook = await notebookFor(alice);
    const pending = await createSourceRepository(database).create(alice, {
      notebookId: notebook.id,
      type: "text",
      title: "Pending",
      content: "x",
    });
    const { deps } = testDeps();

    expect(
      createAudioOverview(
        alice,
        { notebookId: notebook.id, language: "en", sourceIds: [] },
        deps,
      ),
    ).rejects.toThrow(ArtifactInputError);
    expect(
      createAudioOverview(
        alice,
        { notebookId: notebook.id, language: "en", sourceIds: [pending.id] },
        deps,
      ),
    ).rejects.toThrow(ArtifactInputError);
  });

  test("rejects voices that do not belong to the language", async () => {
    const alice = owner();
    const { notebook, source } = await createReadyInput(alice);
    const { deps } = testDeps();

    expect(
      createAudioOverview(
        alice,
        {
          notebookId: notebook.id,
          language: "en",
          voice: "seraphina",
          sourceIds: [source.id],
        },
        deps,
      ),
    ).rejects.toThrow(ArtifactInputError);
  });

  test("allows only one generation at a time per notebook", async () => {
    const alice = owner();
    const { notebook, source } = await createReadyInput(alice);
    const { deps } = testDeps();
    const input = {
      notebookId: notebook.id,
      language: "en" as const,
      sourceIds: [source.id],
    };

    await createAudioOverview(alice, input, deps);
    expect(createAudioOverview(alice, input, deps)).rejects.toThrow(
      /already generating/,
    );
  });

  test("caps artifacts per notebook", async () => {
    const alice = owner();
    const { notebook, source } = await createReadyInput(alice);
    const repo = createArtifactRepository(database);
    for (let i = 0; i < MAX_ARTIFACTS_PER_NOTEBOOK; i++) {
      const artifact = await repo.create(alice, {
        notebookId: notebook.id,
        type: "audio_overview",
        title: `Old ${i}`,
        config: { language: "en", voice: "andrew", sourceIds: [source.id] },
      });
      await repo.update(artifact.id, alice, { status: "ready" });
    }
    const { deps } = testDeps();

    expect(
      createAudioOverview(
        alice,
        { notebookId: notebook.id, language: "en", sourceIds: [source.id] },
        deps,
      ),
    ).rejects.toThrow(/maximum/);
  });
});

describe("generateAudioOverview", () => {
  test("runs pending → processing → ready, uploads audio, adopts the generated title", async () => {
    const alice = owner();
    const { notebook, source } = await createReadyInput(alice);
    const { deps, uploads } = testDeps();
    const artifact = await createAudioOverview(
      alice,
      { notebookId: notebook.id, language: "en", sourceIds: [source.id] },
      deps,
    );

    await generateAudioOverview(artifact.id, alice, deps);

    const done = await createArtifactRepository(database).findById(
      artifact.id,
      alice,
    );
    expect(done?.status).toBe("ready");
    expect(done?.title).toBe("How cities emerged");
    expect(done?.storagePath).toBe(`${alice}/${artifact.id}.mp3`);
    // 120,000 bytes at 96 kbps CBR = 10 s.
    expect(done?.durationSeconds).toBe(10);
    expect(uploads).toHaveLength(1);
    expect(uploads[0].path).toBe(`${alice}/${artifact.id}.mp3`);
    expect(uploads[0].mimeType).toBe("audio/mpeg");
  });

  test("keeps a user-renamed title on regeneration", async () => {
    const alice = owner();
    const { notebook, source } = await createReadyInput(alice);
    const { deps } = testDeps();
    const artifact = await createAudioOverview(
      alice,
      { notebookId: notebook.id, language: "en", sourceIds: [source.id] },
      deps,
    );
    await generateAudioOverview(artifact.id, alice, deps);
    await renameArtifact(artifact.id, alice, "My custom name", deps);

    await regenerateAudioOverview(artifact.id, alice, deps);
    await generateAudioOverview(artifact.id, alice, deps);

    const done = await createArtifactRepository(database).findById(
      artifact.id,
      alice,
    );
    expect(done?.status).toBe("ready");
    expect(done?.title).toBe("My custom name");
  });

  test("marks the artifact failed with a user-safe message when the LLM call fails", async () => {
    const alice = owner();
    const { notebook, source } = await createReadyInput(alice);
    const { deps, uploads } = testDeps({
      llm: {
        complete: async () => {
          throw new Error("connect ECONNREFUSED 10.0.0.1:443 at TCPConnectWrap");
        },
      },
    });
    const artifact = await createAudioOverview(
      alice,
      { notebookId: notebook.id, language: "en", sourceIds: [source.id] },
      deps,
    );

    await generateAudioOverview(artifact.id, alice, deps);

    const done = await createArtifactRepository(database).findById(
      artifact.id,
      alice,
    );
    expect(done?.status).toBe("failed");
    expect(done?.errorMessage).toBe("the overview script could not be generated");
    expect(uploads).toHaveLength(0);
  });

  test("marks the artifact failed when speech synthesis fails", async () => {
    const alice = owner();
    const { notebook, source } = await createReadyInput(alice);
    const { deps } = testDeps({
      tts: {
        async synthesize() {
          throw new Error("speech synthesis failed (HTTP 429)");
        },
        async listVoices() {
          return [];
        },
      },
    });
    const artifact = await createAudioOverview(
      alice,
      { notebookId: notebook.id, language: "en", sourceIds: [source.id] },
      deps,
    );

    await generateAudioOverview(artifact.id, alice, deps);

    const done = await createArtifactRepository(database).findById(
      artifact.id,
      alice,
    );
    expect(done?.status).toBe("failed");
    expect(done?.errorMessage).toContain("speech synthesis failed");
  });

  test("marks the artifact failed when a selected source disappeared", async () => {
    const alice = owner();
    const { notebook, source } = await createReadyInput(alice);
    const { deps } = testDeps();
    const artifact = await createAudioOverview(
      alice,
      { notebookId: notebook.id, language: "en", sourceIds: [source.id] },
      deps,
    );
    await createSourceRepository(database).delete(source.id, alice);

    await generateAudioOverview(artifact.id, alice, deps);

    const done = await createArtifactRepository(database).findById(
      artifact.id,
      alice,
    );
    expect(done?.status).toBe("failed");
    expect(done?.errorMessage).toContain("no longer");
  });
});

describe("regenerate / rename / delete", () => {
  test("regenerate resets a finished artifact to pending", async () => {
    const alice = owner();
    const { notebook, source } = await createReadyInput(alice);
    const { deps } = testDeps();
    const artifact = await createAudioOverview(
      alice,
      { notebookId: notebook.id, language: "en", sourceIds: [source.id] },
      deps,
    );
    await generateAudioOverview(artifact.id, alice, deps);

    const reset = await regenerateAudioOverview(artifact.id, alice, deps);
    expect(reset.status).toBe("pending");
    expect(reset.errorMessage).toBeNull();
  });

  test("regenerate refuses while another artifact in the notebook is generating", async () => {
    const alice = owner();
    const { notebook, source } = await createReadyInput(alice);
    const { deps } = testDeps();
    const first = await createAudioOverview(
      alice,
      { notebookId: notebook.id, language: "en", sourceIds: [source.id] },
      deps,
    );
    await generateAudioOverview(first.id, alice, deps);
    const second = await createAudioOverview(
      alice,
      { notebookId: notebook.id, language: "en", sourceIds: [source.id] },
      deps,
    );

    expect(regenerateAudioOverview(first.id, alice, deps)).rejects.toThrow(
      /already generating/,
    );
    // keep the linter honest about the unused variable
    expect(second.status).toBe("pending");
  });

  test("rename trims and rejects empty titles", async () => {
    const alice = owner();
    const { notebook, source } = await createReadyInput(alice);
    const { deps } = testDeps();
    const artifact = await createAudioOverview(
      alice,
      { notebookId: notebook.id, language: "en", sourceIds: [source.id] },
      deps,
    );

    const renamed = await renameArtifact(artifact.id, alice, "  New name  ", deps);
    expect(renamed.title).toBe("New name");
    expect(renameArtifact(artifact.id, alice, "   ", deps)).rejects.toThrow(
      ArtifactInputError,
    );
  });

  test("delete removes the storage object and the row", async () => {
    const alice = owner();
    const { notebook, source } = await createReadyInput(alice);
    const { deps, deletes } = testDeps();
    const artifact = await createAudioOverview(
      alice,
      { notebookId: notebook.id, language: "en", sourceIds: [source.id] },
      deps,
    );
    await generateAudioOverview(artifact.id, alice, deps);

    await deleteArtifact(artifact.id, alice, deps);

    expect(deletes).toEqual([`${alice}/${artifact.id}.mp3`]);
    expect(
      await createArtifactRepository(database).findById(artifact.id, alice),
    ).toBeUndefined();
  });
});
