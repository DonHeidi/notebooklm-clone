import { Skeleton } from "@/components/ui/skeleton";

// Workspace skeleton: the three-column shell (Sources · Chat · Studio) in
// outline while the server component loads conversation + sources.
export default function NotebookLoading() {
  return (
    <div className="flex h-dvh flex-col">
      <header className="flex shrink-0 items-center gap-3 border-b px-4 py-2">
        <Skeleton className="size-7 rounded-md" />
        <Skeleton className="h-6 w-48" />
        <Skeleton className="ml-auto h-8 w-40" />
      </header>
      <div className="flex min-h-0 flex-1 gap-3 p-3">
        <div className="flex w-80 shrink-0 flex-col gap-3 rounded-xl border bg-card p-4">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-2/3" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-3 rounded-xl border bg-card p-4">
          <Skeleton className="h-5 w-16" />
          <div className="flex-1" />
          <Skeleton className="h-9 w-full" />
        </div>
        <div className="flex w-72 shrink-0 flex-col gap-3 rounded-xl border bg-card p-4">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-11 w-full rounded-lg" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
    </div>
  );
}
