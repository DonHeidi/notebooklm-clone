import { createAzureTts } from "./azure-tts";
import type { VoiceLanguage, VoiceOption } from "./voices";

// Thin speech-synthesis interface (feasibility D-8 / NF-16): the generation
// pipeline depends on this, tests substitute a fake, and providers swap via
// TTS_PROVIDER. Chunking, if a provider needs it, lives inside its adapter.

export type SynthesizeRequest = {
  // Plain text, ≤ ~1,000 words.
  script: string;
  language: VoiceLanguage;
  // Provider-neutral key from voices.ts; defaults per language.
  voice?: string;
};

export type SynthesizeResult = {
  audio: Uint8Array;
  mimeType: string;
  charactersBilled: number;
};

export interface TtsProvider {
  synthesize(request: SynthesizeRequest): Promise<SynthesizeResult>;
  listVoices(language: VoiceLanguage): Promise<VoiceOption[]>;
}

export function createTtsProvider(): TtsProvider {
  const provider = process.env.TTS_PROVIDER ?? "azure";
  if (provider === "azure") {
    return createAzureTts();
  }
  // elevenlabs / openai-compatible are declared in .env.schema as the D-8
  // escape hatches; wire them here when a session needs them.
  throw new Error(`TTS provider "${provider}" is not implemented`);
}
