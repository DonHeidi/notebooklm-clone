import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
} from "ai";
import type { ChatUIMessage } from "@/lib/chat";
import { createScalewayChatModel } from "@/server/ai/chat-model";
import {
  buildCitationInputs,
  extractCitedOrdinals,
  toCitationData,
} from "@/server/ai/grounding";
import { getAuthenticatedUser } from "@/server/auth";
import {
  CHAT_HISTORY_WINDOW,
  getOrCreateConversation,
  persistAssistantMessage,
  persistUserMessage,
  prepareGrounding,
} from "@/server/services/chat-service";
import { getNotebook } from "@/server/services/notebook-service";

// Grounded chat endpoint (CF-05/06/07): retrieval-restricted, streaming,
// with inline citations as custom data parts. SEC-3 contract: retrieved
// source text reaches the model ONLY inside the delimited blocks that
// buildGroundedSystemPrompt writes, the model gets NO tools, and nothing a
// source says can reach any authority beyond producing answer text.

export const dynamic = "force-dynamic";

type ChatRequestBody = {
  messages?: ChatUIMessage[];
  selectedSourceIds?: string[];
};

function messageText(message: ChatUIMessage): string {
  return message.parts
    .filter((part): part is Extract<typeof part, { type: "text" }> => part.type === "text")
    .map((part) => part.text)
    .join("\n")
    .trim();
}

export async function POST(
  request: Request,
  ctx: RouteContext<"/notebooks/[id]/chat">,
) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return new Response("Not signed in.", { status: 401 });
  }
  const { id: notebookId } = await ctx.params;
  const notebook = await getNotebook(notebookId, user.id);
  if (!notebook) {
    return new Response("Notebook not found.", { status: 404 });
  }

  const body = (await request.json().catch(() => ({}))) as ChatRequestBody;
  const messages = Array.isArray(body.messages) ? body.messages : [];
  const selectedSourceIds = Array.isArray(body.selectedSourceIds)
    ? body.selectedSourceIds.filter((id) => typeof id === "string")
    : [];
  const lastMessage = messages.at(-1);
  if (!lastMessage || lastMessage.role !== "user") {
    return new Response("The last message must be a user message.", {
      status: 400,
    });
  }
  const question = messageText(lastMessage);
  if (question === "") {
    return new Response("The message is empty.", { status: 400 });
  }

  // Retrieval + prompt before the stream opens, so provider failures here
  // surface as a plain readable error response instead of a broken stream.
  let grounding;
  try {
    grounding = await prepareGrounding({
      notebookId,
      ownerId: user.id,
      selectedSourceIds,
      question,
    });
  } catch (error) {
    console.error("chat retrieval failed:", error);
    return new Response(
      "Retrieval is unavailable right now — please try again.",
      { status: 502 },
    );
  }
  const { system, retrieved } = grounding;

  const conversation = await getOrCreateConversation(notebookId, user.id);
  await persistUserMessage(conversation.id, user.id, question);

  const result = streamText({
    model: createScalewayChatModel(),
    system,
    // Simple fixed context window (CF-08 MVP); data parts are dropped by
    // convertToModelMessages, so history text keeps its [n] markers as-is.
    messages: await convertToModelMessages(messages.slice(-CHAT_HISTORY_WINDOW)),
    abortSignal: request.signal,
  });

  const stream = createUIMessageStream<ChatUIMessage>({
    onError: (error) => {
      console.error("chat stream failed:", error);
      return "The answer could not be generated — please try again.";
    },
    execute: async ({ writer }) => {
      writer.write({ type: "start" });
      writer.write({ type: "text-start", id: "answer" });
      let text = "";
      const emitted = new Set<number>();
      try {
        for await (const delta of result.textStream) {
          text += delta;
          writer.write({ type: "text-delta", id: "answer", delta });
          // Stream a citation part the moment its marker first appears.
          for (const ordinal of extractCitedOrdinals(text, retrieved.length)) {
            if (!emitted.has(ordinal)) {
              emitted.add(ordinal);
              writer.write({
                type: "data-citation",
                data: toCitationData(ordinal, retrieved),
              });
            }
          }
        }
      } catch (error) {
        // Stop button / closed tab: keep what already streamed. Anything
        // else propagates to onError.
        if (!request.signal.aborted) {
          throw error;
        }
      }
      writer.write({ type: "text-end", id: "answer" });
      writer.write({ type: "finish" });

      // Persist what the user actually saw — full or stopped-early — so a
      // reload matches the transcript. Zero-source mode yields no citations
      // (retrieved is empty, so no marker is valid).
      if (text.trim() !== "") {
        await persistAssistantMessage(
          conversation.id,
          user.id,
          text,
          buildCitationInputs(text, retrieved),
        );
      }
    },
  });

  return createUIMessageStreamResponse({ stream });
}
