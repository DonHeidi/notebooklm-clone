"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

// App-level error boundary: unexpected server/render failures land here
// instead of on Next's unstyled default. Error details stay in the console —
// the digest is enough to correlate with server logs without leaking
// internals into the UI.
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="size-6 text-destructive" />
      </div>
      <div className="space-y-1">
        <h1 className="text-lg font-semibold">Something went wrong</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          An unexpected error interrupted this page. Your notebooks and
          sources are safe — try again, or head back to the library.
          {error.digest && (
            <span className="mt-1 block text-xs">Error code: {error.digest}</span>
          )}
        </p>
      </div>
      <div className="flex gap-2">
        <Button onClick={reset}>Try again</Button>
        <Button variant="outline" render={<Link href="/" />} nativeButton={false}>
          Back to library
        </Button>
      </div>
    </main>
  );
}
