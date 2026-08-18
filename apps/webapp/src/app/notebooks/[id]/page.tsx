import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { signOut } from "@/app/(auth)/actions";
import { listSourcesAction } from "@/app/notebooks/[id]/sources/actions";
import { NotebookTitle } from "@/components/notebook-title";
import { SourcesPanel } from "@/components/sources/sources-panel";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/server/auth";
import { getNotebook } from "@/server/services/notebook-service";

export const metadata = { title: "Notebook — Marginalia" };

// Notebook workspace shell (ui-research §1 shell, §2 three-column layout).
// The Chat / Studio panels are placeholders for sessions A4/A5/D2.
export default async function NotebookPage(props: PageProps<"/notebooks/[id]">) {
  const { id } = await props.params;
  const user = await requireUser();

  // Ownership check: findById is owner-scoped, so a foreign notebook renders
  // the same 404 as a missing one — no existence leak.
  const notebook = await getNotebook(id, user.id);
  if (!notebook) {
    notFound();
  }

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex shrink-0 items-center gap-3 border-b px-4 py-2">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Back to library"
          render={<Link href="/" />}
        >
          <ArrowLeft />
        </Button>
        <NotebookTitle id={notebook.id} title={notebook.title} />
        <div className="ml-auto flex items-center gap-4">
          <span className="text-sm text-muted-foreground">{user.email}</span>
          <form action={signOut}>
            <Button type="submit" variant="outline" size="sm">
              Sign out
            </Button>
          </form>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 gap-3 p-3">
        <section
          aria-label="Sources"
          className="flex w-80 shrink-0 flex-col rounded-xl border bg-card"
        >
          <h2 className="border-b px-4 py-2.5 text-sm font-medium">Sources</h2>
          <SourcesPanel
            notebookId={notebook.id}
            userId={user.id}
            initialSources={await listSourcesAction(notebook.id)}
          />
        </section>
        <WorkspacePanel title="Chat" className="flex-1">
          Grounded chat over your sources is coming in session A4.
        </WorkspacePanel>
        <WorkspacePanel title="Studio" className="w-72 shrink-0">
          Notes and generated artifacts will live here (sessions A5/D2).
        </WorkspacePanel>
      </div>
    </div>
  );
}

function WorkspacePanel({
  title,
  className,
  children,
}: {
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-label={title}
      className={`flex flex-col rounded-xl border bg-card ${className ?? ""}`}
    >
      <h2 className="border-b px-4 py-2.5 text-sm font-medium">{title}</h2>
      <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-muted-foreground">
        {children}
      </div>
    </section>
  );
}
