"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  listSourcesAction,
  type SourceListItem,
} from "@/app/notebooks/[id]/sources/actions";
import { createAudioOverviewAction } from "@/app/notebooks/[id]/studio/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { VoiceCatalog } from "./studio-panel";

// Configuration step behind the Audio Overview tile's chevron (ui-research
// §2.3): language, voice (defaults from the D2 audition), optional focus
// prompt, and the source selection. Source checkboxes live here because the
// Sources panel's selection UI belongs to session A4.
export function AudioOverviewDialog({
  notebookId,
  voices,
  open,
  onOpenChange,
  onCreated,
}: {
  notebookId: string;
  voices: VoiceCatalog;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => Promise<void>;
}) {
  const [language, setLanguage] = useState<"de" | "en">("de");
  const [voice, setVoice] = useState(voices.defaults.de);
  const [focusPrompt, setFocusPrompt] = useState("");
  const [sources, setSources] = useState<SourceListItem[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load the notebook's sources when the dialog opens; ready ones start
  // selected — "overview of everything" is the common case.
  useEffect(() => {
    if (!open) {
      return;
    }
    setSources(null);
    void listSourcesAction(notebookId).then((items) => {
      setSources(items);
      setSelected(
        new Set(items.filter((s) => s.status === "ready").map((s) => s.id)),
      );
    });
  }, [open, notebookId]);

  function switchLanguage(next: "de" | "en") {
    setLanguage(next);
    setVoice(voices.defaults[next]);
  }

  function toggleSource(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      const result = await createAudioOverviewAction(notebookId, {
        language,
        voice,
        focusPrompt: focusPrompt.trim() || undefined,
        sourceIds: [...selected],
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      await onCreated();
      onOpenChange(false);
      setFocusPrompt("");
    } catch {
      setError("Something went wrong — please try again.");
    } finally {
      setBusy(false);
    }
  }

  const readySources = sources?.filter((s) => s.status === "ready") ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Audio Overview</DialogTitle>
          <DialogDescription>
            A single narrator walks you through your selected sources in a
            short spoken episode (2–5 minutes).
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="ao-language">Language</Label>
            <select
              id="ao-language"
              className="border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm shadow-xs"
              value={language}
              onChange={(event) =>
                switchLanguage(event.target.value as "de" | "en")
              }
            >
              <option value="de">German</option>
              <option value="en">English</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ao-voice">Voice</Label>
            <select
              id="ao-voice"
              className="border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm shadow-xs"
              value={voice}
              onChange={(event) => setVoice(event.target.value)}
            >
              {voices.options
                .filter((option) => option.language === language)
                .map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="ao-focus">Focus (optional)</Label>
          <Textarea
            id="ao-focus"
            rows={2}
            placeholder="e.g. concentrate on the historical timeline"
            value={focusPrompt}
            onChange={(event) => setFocusPrompt(event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Sources</Label>
          {sources === null ? (
            <p className="text-sm text-muted-foreground">Loading sources…</p>
          ) : readySources.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No ready sources yet — add sources and wait for processing to
              finish.
            </p>
          ) : (
            <ul className="max-h-40 space-y-1 overflow-y-auto rounded-md border p-2">
              {readySources.map((source) => (
                <li key={source.id}>
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="accent-primary"
                      checked={selected.has(source.id)}
                      onChange={() => toggleSource(source.id)}
                    />
                    <span className="min-w-0 truncate" title={source.title}>
                      {source.title}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button
          className="w-full"
          disabled={busy || selected.size === 0}
          onClick={generate}
        >
          {busy ? <Loader2 className="animate-spin" /> : null}
          Generate
        </Button>
      </DialogContent>
    </Dialog>
  );
}
