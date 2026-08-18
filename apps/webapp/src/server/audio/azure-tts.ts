import type { SynthesizeRequest, SynthesizeResult, TtsProvider } from "./tts";
import { voicesForLanguage, type VoiceLanguage } from "./voices";

// Azure AI Speech adapter (feasibility D-8): one key-authenticated POST with
// an SSML body to the realtime endpoint returns the whole script's audio —
// no chunking needed below the 10-minute cap. REST via plain fetch; the
// Azure SDK would add nothing for a single call.

// Neutral voice key → Azure voice name. Multilingual/standard neural voices,
// GA in swedencentral (verified 2026-08-18); DragonHD variants of Seraphina
// and Florian exist there as a quality upgrade if ever wanted.
const AZURE_VOICES: Record<string, { name: string; lang: string }> = {
  seraphina: { name: "de-DE-SeraphinaMultilingualNeural", lang: "de-DE" },
  florian: { name: "de-DE-FlorianMultilingualNeural", lang: "de-DE" },
  katja: { name: "de-DE-KatjaNeural", lang: "de-DE" },
  andrew: { name: "en-US-AndrewNeural", lang: "en-US" },
  ava: { name: "en-US-AvaNeural", lang: "en-US" },
};

// 24 kHz mono at a constant 96 kbps — good speech quality at ~3.6 MB per
// five minutes, and CBR makes duration derivable from file size.
const OUTPUT_FORMAT = "audio-24khz-96kbitrate-mono-mp3";
const MP3_BYTES_PER_SECOND = (96_000 / 8);

export function estimateMp3DurationSeconds(bytes: number): number {
  return Math.round(bytes / MP3_BYTES_PER_SECOND);
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function buildSsml(voiceKey: string, script: string): string {
  const voice = AZURE_VOICES[voiceKey];
  if (!voice) {
    throw new Error(`unknown voice "${voiceKey}"`);
  }
  return (
    `<speak version='1.0' xml:lang='${voice.lang}'>` +
    `<voice name='${voice.name}'>${escapeXml(script)}</voice>` +
    `</speak>`
  );
}

// Minimal call signature so tests can inject a plain async function (Bun's
// `typeof fetch` additionally demands `preconnect`).
type FetchLike = (url: string | URL, init?: RequestInit) => Promise<Response>;

export type AzureTtsConfig = {
  key?: string;
  region?: string;
  fetchImpl?: FetchLike;
};

export function createAzureTts(config: AzureTtsConfig = {}): TtsProvider {
  const key = config.key ?? process.env.AZURE_SPEECH_KEY ?? "";
  const region = config.region ?? process.env.AZURE_SPEECH_REGION ?? "";
  const fetchImpl = config.fetchImpl ?? fetch;

  return {
    async synthesize(request: SynthesizeRequest): Promise<SynthesizeResult> {
      if (!key || !region) {
        throw new Error(
          "Azure Speech is not configured (AZURE_SPEECH_KEY / AZURE_SPEECH_REGION)",
        );
      }
      const voiceKey =
        request.voice ?? voicesForLanguage(request.language)[0].key;
      const ssml = buildSsml(voiceKey, request.script);
      const response = await fetchImpl(
        `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`,
        {
          method: "POST",
          headers: {
            "Ocp-Apim-Subscription-Key": key,
            "Content-Type": "application/ssml+xml",
            "X-Microsoft-OutputFormat": OUTPUT_FORMAT,
            "User-Agent": "marginalia-audio-overview",
          },
          body: ssml,
        },
      );
      if (!response.ok) {
        // Azure error bodies are short and key-free; truncate defensively.
        const detail = (await response.text()).slice(0, 200);
        throw new Error(
          `speech synthesis failed (HTTP ${response.status}${detail ? `: ${detail}` : ""})`,
        );
      }
      const audio = new Uint8Array(await response.arrayBuffer());
      return {
        audio,
        mimeType: "audio/mpeg",
        // Azure bills per character of the submitted SSML, tags included.
        charactersBilled: ssml.length,
      };
    },

    // The curated catalog, not Azure's full 781-voice list — the config
    // dialog offers only auditioned voices.
    async listVoices(language: VoiceLanguage) {
      return voicesForLanguage(language);
    },
  };
}
