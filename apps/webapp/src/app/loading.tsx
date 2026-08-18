import { Skeleton } from "@/components/ui/skeleton";

// Library route skeleton: mirrors the header + card grid so navigation
// paints structure immediately instead of a blank screen.
export default function LibraryLoading() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b px-6 py-3">
        <span className="text-lg font-semibold tracking-tight">Marginalia</span>
        <Skeleton className="h-8 w-40" />
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">Notebooks</h1>
          <Skeleton className="h-9 w-36" />
        </div>
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-28 rounded-xl" />
          ))}
        </div>
      </main>
    </div>
  );
}
