"use client";

import type { ReactNode } from "react";
import type { CitationData } from "@/lib/chat";
import { useNotebookBridge } from "@/components/notebook-bridge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Deliberately tiny markdown-ish renderer for assistant answers: paragraphs,
// bold, bulleted/numbered lists — plus inline [n] citation chips resolved
// from the message's data-citation parts. A real markdown pipeline is not
// worth its dependency surface for this output contract (the system prompt
// requests exactly these constructs).

function citationLocation(data: CitationData): string {
  const parts: string[] = [];
  if (data.pageNumber !== null) {
    parts.push(`page ${data.pageNumber}`);
  }
  if (data.section) {
    parts.push(data.section);
  }
  return parts.join(", ");
}

// A citation whose chunk no longer resolves (source deleted — A1 cascade
// design): keep the marker visible but inert, with the hint on hover.
function RemovedChip({ ordinal }: { ordinal: number }) {
  return (
    <Tooltip>
      <TooltipTrigger
        aria-label={`Citation ${ordinal}: source removed`}
        aria-disabled
        className="mx-0.5 inline-flex size-4 shrink-0 -translate-y-px cursor-default items-center justify-center rounded-full bg-muted align-middle text-[10px] font-medium text-muted-foreground"
      >
        {ordinal}
      </TooltipTrigger>
      <TooltipContent>Source removed</TooltipContent>
    </Tooltip>
  );
}

function CitationChip({ data }: { data: CitationData }) {
  const bridge = useNotebookBridge();
  if (bridge?.removedChunkIds.has(data.chunkId)) {
    return <RemovedChip ordinal={data.ordinal} />;
  }
  const location = citationLocation(data);
  return (
    <Tooltip>
      <TooltipTrigger
        data-chunk-id={data.chunkId}
        data-source-id={data.sourceId}
        aria-label={`Citation ${data.ordinal}: ${data.sourceTitle} — open the cited passage`}
        onClick={() => bridge?.openCitation(data.chunkId)}
        className="mx-0.5 inline-flex size-4 shrink-0 -translate-y-px items-center justify-center rounded-full bg-primary/10 align-middle text-[10px] font-medium text-primary hover:bg-primary/20"
      >
        {data.ordinal}
      </TooltipTrigger>
      <TooltipContent>
        {data.sourceTitle}
        {location && <span className="text-muted-foreground"> · {location}</span>}
      </TooltipContent>
    </Tooltip>
  );
}

// How to render a [n] marker that has no citation data. In live chat that
// happens mid-stream (data part not arrived yet) or for model-invented
// markers — keep the literal text. In a saved note the markers were real
// citations whose message or source is gone — show the inert removed chip.
export type UnresolvedMarkerMode = "literal" | "removed";

// Splits inline text into plain runs, **bold** runs, and [n] chips.
function renderInline(
  text: string,
  citations: Map<number, CitationData>,
  keyPrefix: string,
  unresolvedMarkers: UnresolvedMarkerMode,
): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|\[\d{1,3}\])/g).map((token, index) => {
    const key = `${keyPrefix}-${index}`;
    if (/^\*\*[^*]+\*\*$/.test(token)) {
      return <strong key={key}>{token.slice(2, -2)}</strong>;
    }
    const marker = token.match(/^\[(\d{1,3})\]$/);
    if (marker) {
      const ordinal = Number(marker[1]);
      const data = citations.get(ordinal);
      if (data) {
        return <CitationChip key={key} data={data} />;
      }
      return unresolvedMarkers === "removed" ? (
        <RemovedChip key={key} ordinal={ordinal} />
      ) : (
        <span key={key}>{token}</span>
      );
    }
    return token;
  });
}

const BULLET_LINE = /^\s*[-*]\s+/;
const NUMBERED_LINE = /^\s*\d+[.)]\s+/;

export function AssistantMarkdown({
  text,
  citations,
  unresolvedMarkers = "literal",
}: {
  text: string;
  citations: Map<number, CitationData>;
  unresolvedMarkers?: UnresolvedMarkerMode;
}) {
  const blocks = text
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter((block) => block !== "");

  return (
    <div className="space-y-3 text-sm leading-relaxed">
      {blocks.map((block, blockIndex) => {
        const lines = block.split("\n");
        const isBulleted = lines.every((line) => BULLET_LINE.test(line));
        const isNumbered = lines.every((line) => NUMBERED_LINE.test(line));
        if (isBulleted || isNumbered) {
          const List = isBulleted ? "ul" : "ol";
          const pattern = isBulleted ? BULLET_LINE : NUMBERED_LINE;
          return (
            <List
              key={blockIndex}
              className={`space-y-1 pl-5 ${isBulleted ? "list-disc" : "list-decimal"}`}
            >
              {lines.map((line, lineIndex) => (
                <li key={lineIndex}>
                  {renderInline(
                    line.replace(pattern, ""),
                    citations,
                    `${blockIndex}-${lineIndex}`,
                    unresolvedMarkers,
                  )}
                </li>
              ))}
            </List>
          );
        }
        return (
          <p key={blockIndex}>
            {renderInline(
              lines.join(" "),
              citations,
              `${blockIndex}`,
              unresolvedMarkers,
            )}
          </p>
        );
      })}
    </div>
  );
}
