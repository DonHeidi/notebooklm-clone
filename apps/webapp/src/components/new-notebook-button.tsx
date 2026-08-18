"use client";

import { useState, useTransition } from "react";
import { Loader2, Plus } from "lucide-react";
import { createNotebookAction } from "@/app/notebooks/actions";
import { Button } from "@/components/ui/button";

// "New notebook" with a visible quota rejection (SF-11): a plain form action
// cannot show the ActionResult error, so creation runs in a transition and
// the message renders inline under the button.
export function NewNotebookButton({
  align = "end",
}: {
  align?: "center" | "end";
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function create() {
    startTransition(async () => {
      setError(null);
      const result = await createNotebookAction();
      // On success the action redirects and never resolves with a value.
      if (result?.error) {
        setError(result.error);
      }
    });
  }

  return (
    <div
      className={`flex flex-col gap-1 ${
        align === "center" ? "items-center" : "items-end"
      }`}
    >
      <Button onClick={create} disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : <Plus />}
        New notebook
      </Button>
      {error && (
        <p
          role="alert"
          className={`max-w-xs text-xs text-destructive ${
            align === "center" ? "text-center" : "text-right"
          }`}
        >
          {error}
        </p>
      )}
    </div>
  );
}
