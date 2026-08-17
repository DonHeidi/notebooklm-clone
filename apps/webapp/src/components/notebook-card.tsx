"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MoreVertical } from "lucide-react";
import {
  deleteNotebookAction,
  renameNotebookAction,
} from "@/app/notebooks/actions";
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
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";

const updatedAtFormat = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
});

// One notebook in the library grid: open on click, rename inline, delete
// behind a confirmation dialog.
export function NotebookCard({
  id,
  title,
  updatedAt,
}: {
  id: string;
  title: string;
  updatedAt: string;
}) {
  const router = useRouter();
  const [isRenaming, setIsRenaming] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [, startTransition] = useTransition();
  const submittedRef = useRef(false);

  function submitRename(value: string) {
    // blur fires after Enter's submission; guard against renaming twice.
    if (submittedRef.current) return;
    submittedRef.current = true;
    setIsRenaming(false);
    if (value.trim() !== "" && value.trim() !== title) {
      startTransition(() => renameNotebookAction(id, value));
    }
  }

  return (
    <>
      <Card
        role="link"
        tabIndex={0}
        aria-label={`Open notebook ${title}`}
        onClick={() => {
          if (!isRenaming) router.push(`/notebooks/${id}`);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !isRenaming) {
            router.push(`/notebooks/${id}`);
          }
        }}
        className="cursor-pointer transition-colors hover:border-foreground/20"
      >
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            {isRenaming ? (
              <Input
                autoFocus
                defaultValue={title}
                aria-label="Notebook title"
                onClick={(event) => event.stopPropagation()}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    submitRename(event.currentTarget.value);
                  } else if (event.key === "Escape") {
                    submittedRef.current = true;
                    setIsRenaming(false);
                  }
                }}
                onBlur={(event) => submitRename(event.currentTarget.value)}
              />
            ) : (
              <CardTitle className="truncate text-base">{title}</CardTitle>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Notebook ${title} actions`}
                    onClick={(event) => event.stopPropagation()}
                  >
                    <MoreVertical />
                  </Button>
                }
              />
              <DropdownMenuContent
                align="end"
                onClick={(event) => event.stopPropagation()}
              >
                <DropdownMenuItem
                  onClick={() => {
                    submittedRef.current = false;
                    setIsRenaming(true);
                  }}
                >
                  Rename
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => setIsConfirmingDelete(true)}
                >
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <CardDescription>
            Updated {updatedAtFormat.format(new Date(updatedAt))}
          </CardDescription>
        </CardHeader>
      </Card>

      <AlertDialog
        open={isConfirmingDelete}
        onOpenChange={setIsConfirmingDelete}
      >
        <AlertDialogContent onClick={(event) => event.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{title}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the notebook with all of its sources,
              conversations and notes. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                setIsConfirmingDelete(false);
                startTransition(() => deleteNotebookAction(id));
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
