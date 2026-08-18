import { BookOpen } from "lucide-react";
import { signOut } from "@/app/(auth)/actions";
import { NewNotebookButton } from "@/components/new-notebook-button";
import { NotebookCard } from "@/components/notebook-card";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/server/auth";
import { listNotebooks } from "@/server/services/notebook-service";

export const metadata = { title: "Marginalia" };

// Notebook library — the authenticated home screen (CF-01, SF-02).
export default async function LibraryPage() {
  const user = await requireUser();
  const notebooks = await listNotebooks(user.id);

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b px-6 py-3">
        <span className="text-lg font-semibold tracking-tight">Marginalia</span>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">{user.email}</span>
          <form action={signOut}>
            <Button type="submit" variant="outline" size="sm">
              Sign out
            </Button>
          </form>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">Notebooks</h1>
          <NewNotebookButton />
        </div>

        {notebooks.length === 0 ? (
          <div className="mt-12 flex flex-col items-center gap-4 rounded-xl border border-dashed px-6 py-16 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted">
              <BookOpen className="size-6 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <p className="text-lg font-medium">Create your first notebook</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                A notebook collects sources — PDFs, websites, pasted text — and
                answers questions grounded in them, with citations you can
                trace. You can rename it any time.
              </p>
            </div>
            <NewNotebookButton align="center" />
          </div>
        ) : (
          <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {notebooks.map((notebook) => (
              <li key={notebook.id}>
                <NotebookCard
                  id={notebook.id}
                  title={notebook.title}
                  updatedAt={notebook.updatedAt.toISOString()}
                />
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
