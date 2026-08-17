"use client";

import { useRef, useState, useTransition } from "react";
import { renameNotebookAction } from "@/app/notebooks/actions";
import { Input } from "@/components/ui/input";

// Editable notebook title in the workspace top bar (ui-research §1: the title
// lives in the chrome and is click-to-rename).
export function NotebookTitle({ id, title }: { id: string; title: string }) {
  const [isEditing, setIsEditing] = useState(false);
  const [, startTransition] = useTransition();
  const submittedRef = useRef(false);

  function submit(value: string) {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setIsEditing(false);
    if (value.trim() !== "" && value.trim() !== title) {
      startTransition(() => renameNotebookAction(id, value));
    }
  }

  if (isEditing) {
    return (
      <Input
        autoFocus
        defaultValue={title}
        aria-label="Notebook title"
        className="h-8 max-w-xs text-sm font-medium"
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            submit(event.currentTarget.value);
          } else if (event.key === "Escape") {
            submittedRef.current = true;
            setIsEditing(false);
          }
        }}
        onBlur={(event) => submit(event.currentTarget.value)}
      />
    );
  }

  return (
    <button
      type="button"
      title="Rename notebook"
      className="max-w-xs truncate rounded-md px-2 py-1 text-sm font-medium hover:bg-muted"
      onClick={() => {
        submittedRef.current = false;
        setIsEditing(true);
      }}
    >
      {title}
    </button>
  );
}
