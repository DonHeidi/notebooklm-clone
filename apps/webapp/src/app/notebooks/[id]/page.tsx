import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { signOut } from "@/app/(auth)/actions";
import { listSourcesAction } from "@/app/notebooks/[id]/sources/actions";
import { listArtifactsAction } from "@/app/notebooks/[id]/studio/actions";
import { NotebookTitle } from "@/components/notebook-title";
import { NotebookWorkspace } from "@/components/chat/notebook-workspace";
import { StudioPanel } from "@/components/studio/studio-panel";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/server/auth";
import { DEFAULT_VOICE, VOICE_OPTIONS } from "@/server/audio/voices";
import { loadConversation, toUIMessages } from "@/server/services/chat-service";
import { getNotebook } from "@/server/services/notebook-service";

export const metadata = { title: "Notebook — Marginalia" };

// Notebook workspace shell (ui-research §1 shell, §2 three-column layout).
// Sources + Chat are live (A3/A4); Studio hosts generated artifacts (D2);
// notes join the Studio column in A5.
export default async function NotebookPage(props: PageProps<"/notebooks/[id]">) {
  const { id } = await props.params;
  const user = await requireUser();

  // Ownership check: findById is owner-scoped, so a foreign notebook renders
  // the same 404 as a missing one — no existence leak.
  const notebook = await getNotebook(id, user.id);
  if (!notebook) {
    notFound();
  }

  // Chat history loads with the workspace (CF-08); citations arrive with
  // their source context so chips render immediately.
  const conversation = await loadConversation(notebook.id, user.id);

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex shrink-0 items-center gap-3 border-b px-4 py-2">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Back to library"
          render={<Link href="/" />}
          nativeButton={false}
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
        <NotebookWorkspace
          notebookId={notebook.id}
          userId={user.id}
          initialSources={await listSourcesAction(notebook.id)}
          initialMessages={toUIMessages(conversation?.messages ?? [])}
        >
          <section
            aria-label="Studio"
            className="flex w-72 shrink-0 flex-col rounded-xl border bg-card"
          >
            <h2 className="border-b px-4 py-2.5 text-sm font-medium">Studio</h2>
            <StudioPanel
              notebookId={notebook.id}
              voices={{ options: VOICE_OPTIONS, defaults: DEFAULT_VOICE }}
              initialArtifacts={await listArtifactsAction(notebook.id)}
            />
          </section>
        </NotebookWorkspace>
      </div>
    </div>
  );
}
