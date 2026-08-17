# Session D1 — TTS provider spike (2026-08-17)

## Goal

Feasibility spike for the Audio Overview differentiator (CF-12 MVP tier:
single-speaker 2–5-minute narrated summary, German + English): pick the TTS
provider and the interface shape session D2 wraps it in. Docs-only output —
no product code.

## What was done

- Researched ten providers against **current official documentation, all
  fetched 2026-08-17** (five parallel research passes): Scaleway, Mistral,
  OpenAI, ElevenLabs, Azure Speech, Google Cloud TTS, Cartesia, Deepgram
  Aura, Amazon Polly, plus the open-weight field (Kokoro, Piper,
  Chatterbox, XTTS-v2, Fish/OpenAudio, Orpheus, Kitten, Dia).
- Mid-session steer from the project owner: criteria re-weighted to
  **feature fit ahead of EU data residency** (residency still recorded),
  and Cartesia/Deepgram/Polly added to the candidate list.
- No TTS API key was resolvable via varlock or Proton Pass, so every hosted
  provider is **read-from-docs** (marked as such throughout). The self-host
  fallback was **verified by a real local generation**: Piper 1.2.0 on CPU
  rendered a ~700-word script in ~13 s (~17× realtime) for both
  `de_DE-thorsten-medium` (3:42 audio, 9.8 MB WAV) and
  `en_US-lessac-medium` (3:45, 9.9 MB). Probe artifacts stayed in the
  session scratchpad, nothing committed.
- Appended **decision D-8** to `product/feasibility.md` (chosen provider,
  runner-up, criteria rationale, cost table pointer, `TtsProvider`
  interface at function-signature level) plus two risk-register rows.
- Declared `TTS_PROVIDER`, `AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION` in
  `.env.schema` (declarations only, no values).

## Decision (D-8 summary)

- **Chosen: Azure AI Speech** — whole script in one call (10-min audio cap;
  every cheaper/equal competitor needs chunking), raw audio from one
  key-authed POST, full SSML on standard voices, dedicated fine-tuned
  German HD voices, $0.0675/generation standard ($0.099 HD), F0 free tier
  ≈ 111 five-minute generations/month, documented EU in-region processing
  (`westeurope`).
- **Runner-up: ElevenLabs** (`eleven_multilingual_v2`) — best voice
  quality, ~10× the cost (~$0.74–0.82/generation), EU residency
  Enterprise-only. Quality upgrade path.
- Notable: **Scaleway has no TTS at all** (transcription only — verified);
  **Mistral shipped Voxtral TTS in 2026-03** (EU-native, $0.072/gen, the
  closest D-4-spirit option, held back by ~300-word chunking and newness);
  self-host floor is Piper (~€15/mo CPU instance), quality self-host is
  Chatterbox Multilingual v3 (MIT, needs GPU).

## Open questions for review

- Voice quality was judged from docs and catalogs, not by ear. **D2 must
  start by creating an F0 Azure key and auditioning the German voices**
  (Seraphina/Florian/Katja) against an ElevenLabs free-tier sample before
  wiring the pipeline. If Azure German narration disappoints, the D-8
  interface makes ElevenLabs a config swap.
- Whether the demo should budget for DragonHD ($22/1M chars) or standard
  neural ($15/1M) voices — audition decides.

## Next

- D2 (`feat/audio-overview`, needs A1+A3): implement `TtsProvider` with the
  `azure` adapter (+ `openai-compatible` escape hatch), script generation
  from selected sources, Storage upload, Studio tile with Realtime job
  status (SF-09).
- Expected merge conflict with B1 in `product/feasibility.md` (both append
  to the decisions/risk sections) — trivial to resolve, keep both.
