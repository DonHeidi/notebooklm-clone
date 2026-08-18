// Curated, provider-neutral voice catalog (feasibility D-8: the config
// stores neutral keys; each TtsProvider adapter maps them to its own voice
// names). Keys and defaults come from the session-D2 audition — the owner
// listened to all five and picked Seraphina (de) and Andrew (en).

export type VoiceLanguage = "de" | "en";

export type VoiceOption = {
  key: string;
  label: string;
  language: VoiceLanguage;
};

export const VOICE_OPTIONS: VoiceOption[] = [
  { key: "seraphina", label: "Seraphina", language: "de" },
  { key: "florian", label: "Florian", language: "de" },
  { key: "katja", label: "Katja", language: "de" },
  { key: "andrew", label: "Andrew", language: "en" },
  { key: "ava", label: "Ava", language: "en" },
];

export const DEFAULT_VOICE: Record<VoiceLanguage, string> = {
  de: "seraphina",
  en: "andrew",
};

export function voicesForLanguage(language: VoiceLanguage): VoiceOption[] {
  return VOICE_OPTIONS.filter((voice) => voice.language === language);
}

export function voiceLabel(key: string): string {
  return VOICE_OPTIONS.find((voice) => voice.key === key)?.label ?? key;
}
