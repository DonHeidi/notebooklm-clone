/**
 * Demo-notebook seed (session A6) — the demo-day opening state AND the
 * data-recovery procedure (the hosted Supabase Free tier has no backups; if
 * the project is lost, redeploy + re-run this script).
 *
 * Provisions, for one target account, entirely THROUGH the service layer
 * (never raw SQL — chunks and embeddings must be real for citations to
 * resolve):
 *   - one notebook (title is the idempotency marker),
 *   - three processed text sources (excerpts of this repo's own product
 *     docs — self-owned, demo-safe),
 *   - one grounded chat exchange (real retrieval + real completion), whose
 *     answer is saved as a note with resolving citations.
 *
 * Usage (local stack):
 *   SEED_DEMO_USER_EMAIL=demo@example.com \
 *     bunx varlock run -- bun run seed:demo
 * Usage (hosted project):
 *   SEED_TARGET=hosted SEED_DEMO_USER_EMAIL=<demo account email> \
 *     bunx varlock run -- bun run seed:demo
 *
 * Idempotent and resumable: the seed notebook's title is the marker, and
 * each step re-checks before acting — an existing ready source (by title) is
 * kept, an existing note ends the run. Re-running never duplicates; a run
 * that died halfway continues where it stopped.
 * Secrets are never printed — output is names, ids, and statuses only.
 */

// Top-level await needs module context; all real imports are dynamic so the
// hosted env remap below runs before anything reads process.env.
export {};

// SEED_TARGET=hosted remaps the hosted values (staged as TF_VAR_* by B3)
// onto the runtime variables BEFORE anything connects. getDb() and the
// Supabase clients read process.env lazily, so doing this first is enough.
const target = process.env.SEED_TARGET ?? "local";
if (target === "hosted") {
  const mapping: Record<string, string> = {
    DATABASE_URL: "TF_VAR_database_url",
    NEXT_PUBLIC_SUPABASE_URL: "TF_VAR_supabase_url",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "TF_VAR_supabase_anon_key",
    SUPABASE_SERVICE_ROLE_KEY: "TF_VAR_supabase_service_role_key",
  };
  for (const [runtime, hosted] of Object.entries(mapping)) {
    const value = process.env[hosted];
    if (!value) {
      console.error(`SEED_TARGET=hosted but ${hosted} is not set — aborting.`);
      process.exit(1);
    }
    process.env[runtime] = value;
  }
} else if (target !== "local") {
  console.error(`unknown SEED_TARGET "${target}" — use "local" or "hosted".`);
  process.exit(1);
}

const { createClient } = await import("@supabase/supabase-js");
const { generateText } = await import("ai");
const { createScalewayChatModel } = await import("../src/server/ai/chat-model");
const { buildCitationInputs } = await import("../src/server/ai/grounding");
const { ingestSource } = await import(
  "../src/server/services/ingestion-service"
);
const {
  getOrCreateConversation,
  persistAssistantMessage,
  persistUserMessage,
  prepareGrounding,
} = await import("../src/server/services/chat-service");
const { createNotebook, listNotebooks, renameNotebook } = await import(
  "../src/server/services/notebook-service"
);
const { listNotes, saveMessageAsNote } = await import(
  "../src/server/services/note-service"
);
const { createTextSource, getSource, listSources } = await import(
  "../src/server/services/source-service"
);

const SEED_NOTEBOOK_TITLE = "Marginalia — Product Tour";

const SEED_QUESTION =
  "What is Marginalia's defining product principle, and how do the architecture and the security register back it up?";

// Self-owned content: condensed excerpts of this repository's product docs
// (product/scope.md, apps/webapp/AGENTS.md, product/security.md). Constants
// rather than file reads so the seed is deterministic and survives doc
// refactors.
const SEED_SOURCES: { title: string; content: string }[] = [
  {
    title: "Marginalia — product scope (excerpt)",
    content: `Marginalia is an AI-assisted research workspace in which users create notebooks, populate them with trusted source material, and use AI to analyse, query, transform, and learn from those sources.

The defining product principle is that AI output should remain grounded in the notebook's selected source material and provide traceable provenance back to those sources. Answers carry inline citations, and clicking a citation opens the source viewer at the exact cited passage, highlighted.

Phase 1, the core MVP, covers the loop that defines the product: notebooks, then sources, then retrieval, then grounded chat, then inline citations, then source navigation, then notes. Users add sources as uploaded files, pasted text, or website URLs. Ingestion parses each source, splits it into chunks, embeds the chunks, and stores them for hybrid retrieval. The chat is restricted to the user's selected sources: retrieval finds the most relevant chunks, the model answers only from them, and every claim carries a citation marker that navigates back to the passage it came from.

Notes close the loop. Users write manual notes, and any assistant answer can be saved as a note with its citations preserved and still navigable. Usage limits protect operating cost even without subscriptions: per-source and per-notebook guards arrived with ingestion, and per-user quotas — notebooks per user, chat messages per notebook per day, audio generations per user per day — arrived with the demo-polish session.

Later phases add source organisation, sharing, artifact generation beyond audio, video overviews, and research features; several items such as public notebooks and usage analytics are deliberately cut from version one.`,
  },
  {
    title: "Marginalia — architecture (excerpt)",
    content: `The webapp is a Next.js App Router application in a Bun-managed TypeScript monorepo. In production it runs on the Node runtime as a standalone container deployed to a Scaleway serverless container; Bun remains the package manager, script runner, and test runner. Supabase provides auth, Postgres with pgvector, and object storage.

The methodology is Domain Driven Design: every feature must be traceable straight through the layers — app view, then URL path, then business layer, then repository, then database. The repository pattern is mandatory for all data access: UI code, route handlers, and server actions never import the database module directly; they go through a repository, and repositories are factory functions taking a database handle so tests can substitute their own.

Authorization is enforced in the application layer. Every repository method takes the owner id derived from the verified JWT and scopes its queries by it; row-level security policies exist as defense in depth, not as the primary guard. Database-backed tests run against a real Postgres with real pgvector — each test file gets its own throwaway database migrated with the actual migration timeline.

Embeddings and chat completions come from Scaleway Generative APIs behind thin provider-neutral interfaces, so cheaper or stronger models can be substituted per workload. The chunk offsets computed at ingestion time are the invariant citations rely on: the highlighted passage in the source viewer is exactly the chunk text the model cited.`,
  },
  {
    title: "Marginalia — security register (excerpt)",
    content: `The security register is a living document with one entry per known concern: what it is, what mitigates it today, whether the residual risk is accepted for the prototype, and the trigger that ends the acceptance.

The acceptance model is explicit. Accepted-for-prototype means a single-tenant-ish demo with authenticated users only and no untrusted public traffic; every acceptance names the trigger that revokes it, most commonly public exposure.

Representative entries: server-side request forgery through URL sources is mitigated by a hostname blocklist and timeouts, with full redirect-hop checking deferred until public exposure. Prompt injection via source content is mitigated by a treat-chunks-as-data contract — retrieved text enters the prompt only inside delimited blocks, the chat model has no tools, and invented citation markers are dropped server-side. Abuse limits exist as layered guards: size and count caps at ingestion, auth rate limits on the hosted project, and per-user quotas capping daily notebook, chat, and audio-generation volume; request-rate limiting within those bounds remains open and is tracked before public exposure.

Secrets follow a strict convention: the environment schema is committed while values live only in the password manager and untracked local files, and nothing secret is ever printed into sessions, pull requests, or logs.`,
  },
];

function fail(message: string): never {
  console.error(`seed:demo failed — ${message}`);
  process.exit(1);
}

const email = process.env.SEED_DEMO_USER_EMAIL;
if (!email) {
  fail(
    "SEED_DEMO_USER_EMAIL is not set. Set it to the email of an existing account (sign it up first).",
  );
}

console.log(`Target stack: ${target}`);

// Resolve the target account by email via the admin API (service role).
async function resolveUserId(targetEmail: string): Promise<string> {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const wanted = targetEmail.toLowerCase();
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 100,
    });
    if (error) {
      fail(`could not list users: ${error.message}`);
    }
    const match = data.users.find(
      (user) => user.email?.toLowerCase() === wanted,
    );
    if (match) {
      return match.id;
    }
    if (data.users.length < 100) {
      break;
    }
  }
  fail(
    `no account found for SEED_DEMO_USER_EMAIL — create the account first (sign up in the app), then re-run.`,
  );
}

const ownerId = await resolveUserId(email);
console.log(`Target account resolved (user id ${ownerId}).`);

// Idempotency marker: the seed notebook's title. Reuse it if present so a
// half-finished run resumes instead of duplicating.
let notebook = (await listNotebooks(ownerId)).find(
  (candidate) => candidate.title === SEED_NOTEBOOK_TITLE,
);
if (notebook) {
  console.log(
    `Notebook "${SEED_NOTEBOOK_TITLE}" already exists (${notebook.id}) — resuming.`,
  );
} else {
  const created = await createNotebook(ownerId);
  notebook = await renameNotebook(created.id, ownerId, SEED_NOTEBOOK_TITLE);
  console.log(`Created notebook "${SEED_NOTEBOOK_TITLE}" (${notebook.id}).`);
}

// Sources: create + ingest through the real pipeline (parse → chunk → embed)
// so chunks/embeddings are real and citations resolve. A source that already
// exists (by title) and is ready is kept as-is.
for (const input of SEED_SOURCES) {
  const present = (await listSources(notebook.id, ownerId)).find(
    (candidate) => candidate.title === input.title,
  );
  if (present?.status === "ready") {
    console.log(`Source already ready: "${input.title}" (${present.id}).`);
    continue;
  }
  const source =
    present ??
    (await createTextSource(ownerId, {
      notebookId: notebook.id,
      title: input.title,
      content: input.content,
    }));
  await ingestSource(source.id, ownerId);
  const processed = await getSource(source.id, ownerId);
  if (processed?.status !== "ready") {
    fail(
      `source "${input.title}" ended in status ${processed?.status ?? "missing"}` +
        (processed?.errorMessage ? `: ${processed.errorMessage}` : ""),
    );
  }
  console.log(`Source ready: "${input.title}" (${source.id}).`);
}

const sourceIds = (await listSources(notebook.id, ownerId)).map(
  (source) => source.id,
);

// A note already present means a previous run completed the chat exchange.
const existingNotes = await listNotes(notebook.id, ownerId);
if (existingNotes.length > 0) {
  console.log(
    `Note "${existingNotes[0].title}" already exists — seed is complete. Nothing to do.`,
  );
  process.exit(0);
}

// One grounded chat round-trip at the service level — the same retrieval,
// prompting, and persistence path the chat route runs, minus streaming.
// Retried a couple of times in case the model answers without [n] markers
// (the note must carry resolving citations).
const conversation = await getOrCreateConversation(notebook.id, ownerId);
let savedNoteTitle: string | null = null;
for (let attempt = 1; attempt <= 3 && !savedNoteTitle; attempt++) {
  const grounding = await prepareGrounding({
    notebookId: notebook.id,
    ownerId,
    selectedSourceIds: sourceIds,
    question: SEED_QUESTION,
  });
  const { text } = await generateText({
    model: createScalewayChatModel(),
    system: grounding.system,
    prompt: SEED_QUESTION,
  });
  const citations = buildCitationInputs(text, grounding.retrieved);
  if (citations.length === 0) {
    console.log(
      `Attempt ${attempt}: the answer carried no citation markers — retrying.`,
    );
    continue;
  }
  await persistUserMessage(conversation.id, ownerId, SEED_QUESTION);
  const persisted = await persistAssistantMessage(
    conversation.id,
    ownerId,
    text,
    citations,
  );
  const note = await saveMessageAsNote(ownerId, notebook.id, persisted.id);
  savedNoteTitle = note.title;
  console.log(
    `Chat exchange persisted (${citations.length} citations); saved as note "${note.title}".`,
  );
}
if (!savedNoteTitle) {
  fail(
    "the model produced no citation markers in 3 attempts — notebook and sources are seeded, but no note was created. Re-run to retry the chat step (everything already seeded is kept).",
  );
}

console.log("Seed complete.");
process.exit(0);
