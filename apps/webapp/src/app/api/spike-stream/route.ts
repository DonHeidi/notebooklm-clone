/**
 * THROWAWAY — feasibility spike S-1 (SSE through Scaleway Serverless Containers).
 * Delete this route once D-7 is decided; the real chat route arrives in A4.
 *
 * Modes:
 *   GET  /api/spike-stream?mode=tick&count=20&interval=250
 *       SSE ticker with server-side timestamps — measures gateway buffering
 *       and inter-chunk cadence without spending LLM tokens.
 *   POST /api/spike-stream            {"prompt": "..."}
 *       Streams an LLM answer from Scaleway Generative APIs as SSE
 *       (AI SDK UI message stream). `?mode=text` returns a plain text stream.
 *   POST /api/spike-stream?mode=probe
 *       Echoes received body size — probes the request-body limit.
 */
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { streamText } from "ai";

export const dynamic = "force-dynamic";

const scaleway = createOpenAICompatible({
  name: "scaleway",
  baseURL: "https://api.scaleway.ai/v1",
  apiKey: process.env.SCW_GENERATIVE_APIS_KEY ?? "",
});

// Model names rotate on Scaleway EOL cycles (feasibility D-4) — override via env.
const MODEL = process.env.SCW_GENERATIVE_APIS_MODEL ?? "mistral-small-3.2-24b-instruct-2506";

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.get("mode") !== "tick") {
    return Response.json({
      ok: true,
      spike: "S-1 streaming",
      model: MODEL,
      keyPresent: Boolean(process.env.SCW_GENERATIVE_APIS_KEY),
    });
  }

  const count = Math.min(Number(url.searchParams.get("count") ?? 20), 200);
  const interval = Math.min(Number(url.searchParams.get("interval") ?? 250), 5000);
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const t0 = Date.now();
      for (let i = 0; i < count; i++) {
        controller.enqueue(
          encoder.encode(`data: {"tick":${i},"elapsedMs":${Date.now() - t0}}\n\n`),
        );
        await new Promise((r) => setTimeout(r, interval));
      }
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

export async function POST(request: Request) {
  const url = new URL(request.url);

  if (url.searchParams.get("mode") === "probe") {
    const body = await request.arrayBuffer();
    return Response.json({ receivedBytes: body.byteLength });
  }

  const { prompt } = (await request.json().catch(() => ({}))) as { prompt?: string };

  const result = streamText({
    model: scaleway(MODEL),
    prompt: prompt ?? "Count from 1 to 30, one number per line, no other text.",
  });

  if (url.searchParams.get("mode") === "text") {
    return result.toTextStreamResponse();
  }
  return result.toUIMessageStreamResponse();
}
