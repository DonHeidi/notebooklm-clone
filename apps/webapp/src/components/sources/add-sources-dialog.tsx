"use client";

import { useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  addFileSourceAction,
  addTextSourceAction,
  addUrlSourceAction,
} from "@/app/notebooks/[id]/sources/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";

// 20 MB — mirror of MAX_FILE_BYTES (server) and the bucket's
// file_size_limit; checked here too so oversized files fail before uploading.
const MAX_FILE_BYTES = 20 * 1024 * 1024;
const ACCEPTED_FILES = ".pdf,.txt,.md,.markdown";

// Add-sources dialog (ui-research §3): one dialog, three Phase 1 entry
// points — Upload files, Website URL, Copied text.
export function AddSourcesDialog({
  notebookId,
  userId,
  onAdded,
  trigger,
}: {
  notebookId: string;
  userId: string;
  onAdded: () => Promise<void>;
  trigger: React.ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const [textTitle, setTextTitle] = useState("");
  const [text, setText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setError(null);
    setUrl("");
    setTextTitle("");
    setText("");
  }

  // Wraps each submit path: one spinner, one error slot, close on success.
  async function submit(run: () => Promise<{ error?: string }>) {
    setBusy(true);
    setError(null);
    try {
      const result = await run();
      if (result.error) {
        setError(result.error);
        return;
      }
      await onAdded();
      setOpen(false);
      reset();
    } catch {
      setError("Something went wrong — please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function uploadFiles(files: FileList) {
    await submit(async () => {
      for (const file of Array.from(files)) {
        if (file.size > MAX_FILE_BYTES) {
          return { error: `“${file.name}” is larger than 20 MB.` };
        }
        // Direct-to-storage upload (feasibility D-5): the file goes straight
        // to the private `sources` bucket under the user's own prefix — the
        // server only ever sees the object path.
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const storagePath = `${userId}/${crypto.randomUUID()}/${safeName}`;
        const { error: uploadError } = await createClient()
          .storage.from("sources")
          .upload(storagePath, file);
        if (uploadError) {
          return { error: `Upload of “${file.name}” failed: ${uploadError.message}` };
        }
        const result = await addFileSourceAction(notebookId, {
          fileName: file.name,
          storagePath,
          fileSize: file.size,
        });
        if (result.error) {
          return result;
        }
      }
      return {};
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          reset();
        }
      }}
    >
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add sources</DialogTitle>
          <DialogDescription>
            Sources ground the chat: answers cite the exact passages they came
            from.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="upload">
          <TabsList className="w-full">
            <TabsTrigger value="upload">Upload files</TabsTrigger>
            <TabsTrigger value="url">Website URL</TabsTrigger>
            <TabsTrigger value="text">Copied text</TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-3 pt-2">
            <p className="text-sm text-muted-foreground">
              PDF, TXT or Markdown, up to 20 MB per file.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={ACCEPTED_FILES}
              className="hidden"
              onChange={(event) => {
                if (event.target.files?.length) {
                  void uploadFiles(event.target.files);
                  event.target.value = "";
                }
              }}
            />
            <Button
              className="w-full"
              disabled={busy}
              onClick={() => fileInputRef.current?.click()}
            >
              {busy ? <Loader2 className="animate-spin" /> : null}
              Choose files
            </Button>
          </TabsContent>

          <TabsContent value="url" className="space-y-3 pt-2">
            <div className="space-y-2">
              <Label htmlFor="source-url">Page URL</Label>
              <Input
                id="source-url"
                type="url"
                placeholder="https://example.com/article"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
              />
            </div>
            <Button
              className="w-full"
              disabled={busy || url.trim() === ""}
              onClick={() => submit(() => addUrlSourceAction(notebookId, url))}
            >
              {busy ? <Loader2 className="animate-spin" /> : null}
              Add website
            </Button>
          </TabsContent>

          <TabsContent value="text" className="space-y-3 pt-2">
            <div className="space-y-2">
              <Label htmlFor="source-title">Title (optional)</Label>
              <Input
                id="source-title"
                placeholder="Pasted text"
                value={textTitle}
                onChange={(event) => setTextTitle(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="source-text">Text</Label>
              <Textarea
                id="source-text"
                rows={8}
                placeholder="Paste or type the source text…"
                value={text}
                onChange={(event) => setText(event.target.value)}
              />
            </div>
            <Button
              className="w-full"
              disabled={busy || text.trim() === ""}
              onClick={() =>
                submit(() =>
                  addTextSourceAction(notebookId, { title: textTitle, content: text }),
                )
              }
            >
              {busy ? <Loader2 className="animate-spin" /> : null}
              Add text
            </Button>
          </TabsContent>
        </Tabs>

        {error && <p className="text-sm text-destructive">{error}</p>}
      </DialogContent>
    </Dialog>
  );
}
