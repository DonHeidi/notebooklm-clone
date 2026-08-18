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

*(pending)*

## Verified locally

*(pending)*

## Open questions / next sessions

- **Should the Azure resources be Terraform-managed?** Raised by the owner
  during provisioning. Deliberately not done in D2 (`infrastructure/` is out
  of this session's boundaries; two free, static resources; and
  `azurerm_cognitive_account` would put the Speech key into Terraform
  state, which our current state handling isn't hardened for). If Azure
  survives the audition and the feature sticks, a later infrastructure
  session should codify resource group + Speech resource in an
  `infrastructure/azure` module and decide the key-in-state / CI-credential
  story. Foreman call.
