import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";

// Styled 404 — reached via unknown URLs and by notFound() from the notebook
// page (which owner-scopes lookups, so a foreign notebook lands here too and
// leaks nothing about existence).
export default function NotFoundPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        <FileQuestion className="size-6 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <h1 className="text-lg font-semibold">Page not found</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          This page doesn’t exist — the notebook may have been deleted, or the
          link is wrong.
        </p>
      </div>
      <Button render={<Link href="/" />} nativeButton={false}>
        Back to library
      </Button>
    </main>
  );
}
