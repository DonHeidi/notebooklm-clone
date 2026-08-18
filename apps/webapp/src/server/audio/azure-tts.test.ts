import { describe, expect, test } from "bun:test";
import { buildSsml, createAzureTts, estimateMp3DurationSeconds } from "./azure-tts";

describe("buildSsml", () => {
  test("wraps the script in a voice element for the mapped Azure voice", () => {
    const ssml = buildSsml("seraphina", "Hallo Welt");
    expect(ssml).toContain("de-DE-SeraphinaMultilingualNeural");
    expect(ssml).toContain("Hallo Welt");
    expect(ssml).toContain("xml:lang='de-DE'");
  });

  test("escapes XML special characters in the script", () => {
    const ssml = buildSsml("andrew", `Trade & "walls" <grew> faster`);
    expect(ssml).toContain("Trade &amp; &quot;walls&quot; &lt;grew&gt; faster");
    expect(ssml).not.toContain("<grew>");
  });

  test("rejects unknown voice keys", () => {
    expect(() => buildSsml("hal9000", "x")).toThrow("unknown voice");
  });
});

describe("createAzureTts", () => {
  test("posts SSML to the region endpoint and returns audio bytes", async () => {
    const audio = new Uint8Array([1, 2, 3]);
    let captured: { url: string; init: RequestInit } | undefined;
    const tts = createAzureTts({
      key: "test-key",
      region: "swedencentral",
      fetchImpl: async (url, init) => {
        captured = { url: String(url), init: init! };
        return new Response(audio, { status: 200 });
      },
    });

    const result = await tts.synthesize({ script: "Hello", language: "en" });

    expect(captured!.url).toBe(
      "https://swedencentral.tts.speech.microsoft.com/cognitiveservices/v1",
    );
    const headers = captured!.init.headers as Record<string, string>;
    expect(headers["Ocp-Apim-Subscription-Key"]).toBe("test-key");
    expect(headers["Content-Type"]).toBe("application/ssml+xml");
    expect(String(captured!.init.body)).toContain("en-US-AndrewNeural");
    expect(result.audio).toEqual(audio);
    expect(result.mimeType).toBe("audio/mpeg");
    expect(result.charactersBilled).toBe(String(captured!.init.body).length);
  });

  test("surfaces non-200 responses as errors without leaking the key", async () => {
    const tts = createAzureTts({
      key: "secret-key",
      region: "swedencentral",
      fetchImpl: async () => new Response("Quota exceeded", { status: 429 }),
    });

    try {
      await tts.synthesize({ script: "Hello", language: "en" });
      expect.unreachable();
    } catch (error) {
      const message = (error as Error).message;
      expect(message).toContain("429");
      expect(message).not.toContain("secret-key");
    }
  });

  test("listVoices returns the curated catalog for a language", async () => {
    const tts = createAzureTts({ key: "k", region: "r", fetchImpl: fetch });
    const voices = await tts.listVoices("de");
    expect(voices.map((v) => v.key)).toEqual(["seraphina", "florian", "katja"]);
  });
});

describe("estimateMp3DurationSeconds", () => {
  test("derives duration from constant-bitrate size", () => {
    // 96 kbps CBR: 12,000 bytes per second.
    expect(estimateMp3DurationSeconds(120_000)).toBe(10);
  });
});
