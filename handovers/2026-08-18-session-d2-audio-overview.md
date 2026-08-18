# Session D2 — Audio Overview (2026-08-18)

> **Status: in progress** — this note is being written as the session runs;
> sections below the provisioning log land as the work completes.

## Goal

CF-12 MVP: single-narrator 2–5-minute Audio Overview generated from the
notebook's selected sources, produced asynchronously (SF-09), stored
privately, playable from the Studio panel — built on the generic artifacts
foundation (scope §3). TTS per decision D-8: Azure AI Speech behind a
`TtsProvider` interface.

## Gate 0 — Azure provisioning (first-time Azure setup, documented)

The owner had never used Azure before, so this is the full from-zero path.
Recorded here because future sessions (or a re-provision on another
subscription) will hit the same steps and gotchas.

### 0. Azure CLI

Already installed via mise (`az` 2.89.1, shim at
`~/.local/share/mise/shims/az`). Gotcha: a shell without mise's shims on
PATH won't find `az` — run it as `mise exec -- az …` there. No curl|bash
install needed or wanted.

### 1. Microsoft account ≠ Azure subscription

A Microsoft account alone is not enough: `az login` **fails with "no
subscriptions found"** until Azure is activated on the account. Azure
resources live in a **subscription** (the billing container), which a fresh
Microsoft account does not have.

Fix: sign up at <https://azure.microsoft.com/free> ("Start free") with the
same Microsoft account. The wizard verifies identity (phone) and asks for a
credit card — **verification only**; a free account does not bill unless
explicitly upgraded to pay-as-you-go, and everything this session uses is
on the F0 free tier regardless. Signup creates one subscription (default
name "Azure subscription 1").

### 2. CLI login

```sh
az login          # in Claude Code: `! az login` runs it in-session
```

Opens a browser (or prints a devicelogin URL + code). After the free-account
signup exists, login finds the subscription and sets it as default.
This session: subscription **"Azure subscription 1"**
(`2125eeda-591c-4942-aeca-c6bccb36d12a`), state Enabled, default.

### 3. Resource group + Speech resource (both free)

```sh
az group create --name marginalia --location westeurope

az provider register --namespace Microsoft.CognitiveServices --wait

az cognitiveservices account create \
  --name marginalia-speech \
  --resource-group marginalia \
  --kind SpeechServices \
  --sku F0 \
  --location swedencentral \
  --yes
```

Two gotchas hit on the way, both documented here because any fresh
subscription will hit them again:

- **`westeurope` rejected the Speech resource** with
  `RequestDisallowedByAzure: The selected region is currently not accepting
  new customers` — Azure capacity-gates popular regions for new
  subscriptions. **Deviation from D-8's "pin westeurope": the resource
  lives in `swedencentral`**, the other of the two EU regions carrying
  DragonHD German voices, so every property the region was chosen for
  (EU in-region processing, standard + HD German voices) is preserved.
  The resource group stayed in `westeurope` — a group's location is
  metadata only. `AZURE_SPEECH_REGION=swedencentral` must be set in
  `.env.local` (the `.env.schema` default still says `westeurope`).
- **`MissingSubscriptionRegistration`**: a fresh subscription has no
  resource providers enabled; the `az provider register` line above is the
  one-time, free fix (the portal does this silently, the CLI does not).

Other notes:

- **F0** = free tier: 0.5M chars/month ≈ 111 five-minute generations, $0.
  If F0 is ever unavailable on a subscription, that's a stop-and-ask —
  S0 is billable.
- The commands are safe to re-run (group create is idempotent; account
  create errors harmlessly if the resource exists).
- Created 2026-08-18 ~10:30 UTC; endpoint
  `https://swedencentral.tts.speech.microsoft.com`.

### 4. Key staging (never printed)

The key is fetched and piped directly into place without ever appearing in
a terminal, transcript, or committed file:

```sh
az cognitiveservices account keys list \
  --name marginalia-speech --resource-group marginalia \
  --query key1 --output tsv   # → piped straight into .env.local / pass-cli
```

**Done 2026-08-18:** staged as `AZURE_SPEECH_KEY` +
`AZURE_SPEECH_REGION=swedencentral` in the untracked root `.env.local`
(key1, 84 chars, piped, never displayed), and stored in Proton Pass vault
`marginalia` as login item "Azure Speech — marginalia-speech
(swedencentral)". Both variables were already declared in `.env.schema` by
session D1. Key verified working (voices/list returned 781 voices).

## Voice audition

Five samples generated 2026-08-18 (same ~30 s script per language, an
audio-overview-style opening; realtime endpoint, mp3 24 kHz/96 kbps),
written to the session scratchpad, nothing committed:

| File | Voice |
| --- | --- |
| `de-seraphina.mp3` | `de-DE-SeraphinaMultilingualNeural` |
| `de-florian.mp3` | `de-DE-FlorianMultilingualNeural` |
| `de-katja.mp3` | `de-DE-KatjaNeural` |
| `en-andrew.mp3` | `en-US-AndrewNeural` |
| `en-ava.mp3` | `en-US-AvaNeural` |

All candidates GA in `swedencentral`; DragonHD variants
(`de-DE-Seraphina:DragonHDLatestNeural`, `de-DE-Florian:…`) confirmed
present there too — the quality upgrade path survives the region move.

**Owner's picks (2026-08-18):** German default
**`de-DE-SeraphinaMultilingualNeural`**, English default
**`en-US-AndrewNeural`**. Verdict: Azure standard neural quality accepted
for the MVP — no ElevenLabs escalation needed; DragonHD remains the
optional upgrade.

## What was done

- **Schema (additive)**: `artifacts` table + `artifact_type`/`artifact_status`
  enums appended to `schema.ts` — generic artifact foundation (scope §3),
  `audio_overview` the only type so far; `config` jsonb
  (language/voice/focusPrompt/sourceIds) is replayable for regenerate.
  Generated migration via drizzle-kit (never push, D-3), hand-written RLS
  migration (A1's owner-chain pattern) and private `artifacts` bucket
  migration (A3's owner-prefix pattern, 20 MB limit).
- **Repository**: `artifact-repository.ts`, A1 factory style, every method
  owner-scoped (SEC-5), tested on PGlite.
- **TtsProvider** (`src/server/audio/`): D-8 interface
  (`synthesize()`/`listVoices()`) selected via `TTS_PROVIDER`; Azure
  adapter is one key-authed SSML POST to the realtime endpoint via plain
  fetch (no Azure SDK), CBR mp3 (24 kHz/96 kbps) so `durationSeconds`
  derives from byte length. Curated 5-voice catalog from the audition;
  elevenlabs/openai-compatible remain unimplemented switch arms.
- **Script generation** (`src/server/audio/script.ts`): pure prompt
  assembly. **SEC-3**: source text enters the prompt only between
  `<<<SOURCE n BEGIN/END>>>` markers, and the system prompt pins delimited
  material as quoted data, never instructions; the user's own focusPrompt
  is the only user text treated as an instruction. **Source strategy:**
  truncated `sources.content` with a 24k-char total budget split per
  source; oversized sources keep start/middle/end slices (deterministic —
  with no query there is no relevance signal for chunk sampling; chunks
  would also re-join to the same text). Model asked for a `TITLE:` first
  line; a generated title never overwrites a user rename.
- **Pipeline** (`audio-overview-service.ts`, mirrors A3 stage 1): pending →
  `after()` → processing → script LLM (Scaleway, D-4) → TTS → upload
  (service-role, upsert for regenerate) → ready; failures → failed +
  short user-safe message. Guards (NF-15 constants): ≤1 concurrent
  generation, ≤20 artifacts per notebook. Playback/download via
  server-created signed URLs (600 s TTL).
- **Studio panel** (placeholder replaced; ui-research §2.3): Audio
  Overview tile (Beta badge, chevron → config dialog), artifact list with
  A3-style 2.5 s polling while generating, inline rename, delete with
  confirmation, regenerate, download, on-demand `<audio>` player. Source
  selection checkboxes live **in the config dialog** (ready sources,
  default all) because the Sources panel's selection UI belongs to A4.

## Verified locally

- `bun test`: **88 pass, 0 fail** (24 + 28 pre-existing, 36 new:
  repository authz/transitions, prompt delimiting/language/focus,
  excerpt budgets, SSML escaping, Azure adapter against a fake fetch,
  pipeline transitions on PGlite with fake TTS + fake LLM, guard limits,
  regenerate/rename/delete).
- `bun run build` (via varlock): passes; next.config.ts/Dockerfile
  untouched.
- **E2E with real Azure + Scaleway + local Supabase** (headless Chromium
  via scratchpad puppeteer-core with its own profile — the shared MCP
  browser profile was locked by the parallel A4 session, the same quirk
  A2/A3 hit):
  fresh signup → notebook → pasted-text source + URL source
  (en.wikipedia.org/wiki/Roman_aqueduct, real fetch + real embeddings,
  both ready in ~4 s) → German overview (focus prompt set) → playback →
  English overview. Results:
  - **German** (seraphina): pipeline 16.8 s (SQL `updated_at-created_at`;
    17.7 s wall clock to Play button), **3:59 audio, 2.87 MB**, title
    generated: "Die Meisterwerke der römischen Wasserversorgung".
  - **English** (andrew): pipeline 9.3 s, **2:25 audio, 1.73 MB**, title
    "The Lifeblood of Ancient Rome: Aqueducts".
  - SQL: both artifact rows `ready` with `storage_path` set; both objects
    present in `storage.objects` (bucket `artifacts`, owner-prefixed,
    `audio/mpeg`).
  - Playback verified in-browser: `<audio>` element on the signed URL
    reached `currentTime > 1`, `paused: false`, duration 239.2 s.
  - Browser console clean except one **pre-existing** Base UI warning
    (A2's header back-button `Button render={<Link/>}` wants
    `nativeButton={false}` — not touched by this session, noted for the
    foreman).

## Hot files touched

- `bun.lock` / root `package.json` / `mise.toml` / root `AGENTS.md`:
  **untouched** (no new repo dependencies; puppeteer-core lives only in
  the session scratchpad; Azure CLI was already mise-installed).
- `.env.schema`: untouched — D1 had already declared
  `TTS_PROVIDER`/`AZURE_SPEECH_KEY`/`AZURE_SPEECH_REGION`.
- `product/feasibility.md`: dated D-8 audition note (allowed by brief);
  expect a merge collision with A4 only on `schema.ts` (append-only) if
  at all.

## Open questions / next sessions

- **Transcript**: the generated script is not persisted — only the audio.
  NF-11 lists transcript availability for audio; storing the script (e.g.
  a `content` text column on artifacts, or alongside in the bucket) is a
  small follow-up and would also enable A5-style "save as note".
- **Signed-URL lifetime vs long listens**: the playback URL lives 600 s;
  a paused 5-minute episode resumed much later can hit an expired URL
  (the player then errors until Play is clicked again — no data loss).
  Acceptable for the prototype.
- **Packages extraction**: the generic artifact plumbing (repository +
  status polling + bucket conventions) is a candidate for `packages/`
  once a second artifact type (CF-11 Reports) exists — noted instead of
  built (brief boundary).
- **Pre-existing dev warning**: A2's header back-button (`Button
  render={<Link/>}`) triggers a Base UI `nativeButton` console error in
  dev — outside this session's areas, left for the owner session.
- **Rate limiting** (SEC-7): audio generation is guarded per notebook
  (1 concurrent / 20 total) but not rate-limited per user — unchanged
  register status, hardening trigger stays "before public exposure".
- **Should the Azure resources be Terraform-managed?** Raised by the owner
  during provisioning. Deliberately not done in D2 (`infrastructure/` is out
  of this session's boundaries; two free, static resources; and
  `azurerm_cognitive_account` would put the Speech key into Terraform
  state, which our current state handling isn't hardened for). If Azure
  survives the audition and the feature sticks, a later infrastructure
  session should codify resource group + Speech resource in an
  `infrastructure/azure` module and decide the key-in-state / CI-credential
  story. Foreman call.
