"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Loader2, SendHorizontal, Square, Trash2 } from "lucide-react";
import { clearChatAction } from "@/app/notebooks/[id]/chat/actions";
import { AssistantMarkdown } from "@/components/chat/assistant-markdown";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { ChatUIMessage, CitationData } from "@/lib/chat";

// Chat panel (ui-research §2.2): streamed grounded answers with inline
// citation chips, the "N sources" counter as the visible CF-05 contract,
// stop while streaming, and clear-chat.

function citationsByOrdinal(message: ChatUIMessage): Map<number, CitationData> {
  const map = new Map<number, CitationData>();
  for (const part of message.parts) {
    if (part.type === "data-citation") {
      map.set(part.data.ordinal, part.data);
    }
  }
  return map;
}

function messageText(message: ChatUIMessage): string {
  return message.parts
    .filter((part): part is Extract<typeof part, { type: "text" }> => part.type === "text")
    .map((part) => part.text)
    .join("");
}

export function ChatPanel({
  notebookId,
  initialMessages,
  selectedSourceIds,
}: {
  notebookId: string;
  initialMessages: ChatUIMessage[];
  selectedSourceIds: string[];
}) {
  const [input, setInput] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);
  const transport = useMemo(
    () =>
      new DefaultChatTransport<ChatUIMessage>({
        api: `/notebooks/${notebookId}/chat`,
      }),
    [notebookId],
  );
  const { messages, sendMessage, stop, status, error, setMessages, clearError } =
    useChat<ChatUIMessage>({ transport, messages: initialMessages });
  const busy = status === "submitted" || status === "streaming";

  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const text = input.trim();
    if (text === "" || busy) {
      return;
    }
    setInput("");
    clearError();
    // Selection travels with each message — the server re-validates
    // ownership; these ids are a filter, never an authorization.
    void sendMessage({ text }, { body: { selectedSourceIds } });
  }

  async function handleClear() {
    setConfirmClear(false);
    await clearChatAction(notebookId);
    setMessages([]);
    clearError();
  }

  return (
    <TooltipProvider>
      <div className="flex min-h-0 flex-1 flex-col">
        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto p-4">
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
              Ask a question about your selected sources — answers come with
              citations you can trace. With no sources selected, answers come
              from general knowledge instead.
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) =>
                message.role === "user" ? (
                  <div key={message.id} className="flex justify-end">
                    <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-4 py-2 text-sm text-primary-foreground">
                      {messageText(message)}
                    </div>
                  </div>
                ) : (
                  <div key={message.id} className="max-w-full">
                    <AssistantMarkdown
                      text={messageText(message)}
                      citations={citationsByOrdinal(message)}
                    />
                  </div>
                ),
              )}
              {status === "submitted" && (
                <Loader2
                  className="size-4 animate-spin text-muted-foreground"
                  aria-label="Thinking"
                />
              )}
            </div>
          )}
        </div>

        {error && (
          <div className="mx-4 mb-2 flex items-center justify-between gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <span>{error.message || "Something went wrong — please try again."}</span>
            <Button variant="ghost" size="sm" onClick={clearError}>
              Dismiss
            </Button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="border-t p-3">
          <div className="flex items-center gap-2">
            <Input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Start typing…"
              aria-label="Chat message"
            />
            <span className="shrink-0 text-xs text-muted-foreground">
              {selectedSourceIds.length}{" "}
              {selectedSourceIds.length === 1 ? "source" : "sources"}
            </span>
            {busy ? (
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Stop generating"
                onClick={() => void stop()}
              >
                <Square />
              </Button>
            ) : (
              <Button
                type="submit"
                size="icon"
                aria-label="Send"
                disabled={input.trim() === ""}
              >
                <SendHorizontal />
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Clear chat"
              disabled={busy || messages.length === 0}
              onClick={() => setConfirmClear(true)}
            >
              <Trash2 />
            </Button>
          </div>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Marginalia can be inaccurate — please double-check its responses.
          </p>
        </form>

        <AlertDialog open={confirmClear} onOpenChange={setConfirmClear}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Clear chat?</AlertDialogTitle>
              <AlertDialogDescription>
                The conversation and its citations will be deleted. Your
                sources are not affected.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction variant="destructive" onClick={handleClear}>
                Clear
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}
