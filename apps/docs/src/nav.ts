import { getCollection, type CollectionEntry } from "astro:content";

export const repo = "https://github.com/DonHeidi/notebooklm-clone";

export interface NavItem {
  href: string;
  label: string;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

/**
 * A session handover, with title and date recovered from the document itself
 * (the files have no frontmatter; their H1 is `# Session X — Topic (date)`).
 */
export interface SessionEntry {
  entry: CollectionEntry<"handovers">;
  href: string;
  title: string;
  shortTitle: string;
  date: string;
}

export async function getSessions(): Promise<SessionEntry[]> {
  const entries = await getCollection("handovers");
  return entries
    .map((entry) => {
      const heading = entry.body?.match(/^# (.+)$/m)?.[1] ?? entry.id;
      const title = heading.replace(/\s*\((\d{4}-\d{2}-\d{2})\)\s*$/, "");
      const date = entry.id.match(/^(\d{4}-\d{2}-\d{2})/)?.[1] ?? "";
      return {
        entry,
        href: `/sessions/${entry.id}/`,
        title,
        shortTitle: title.replace(/^Session\s+/, ""),
        date,
      };
    })
    .sort((a, b) => a.entry.id.localeCompare(b.entry.id));
}

/**
 * The history pages in `product/history/`, in reading order (one per
 * package, process last). Labels are maintained here because the canonical
 * files have no frontmatter.
 */
export const historyPages: { id: string; label: string; text: string }[] = [
  {
    id: "webapp",
    label: "Webapp",
    text: "Schema and the vector(2000) decision, auth, the ingestion pipeline — and the bugs met along the way.",
  },
  {
    id: "supabase",
    label: "Supabase",
    text: "The schema-ownership split, one migration timeline, pgvector/HNSW, storage RLS, and the local-dev flow.",
  },
  {
    id: "infrastructure",
    label: "Infrastructure",
    text: "The SSE spike verdict with its measurements, Terraform state bootstrap, Containers API drift, CI and deploys.",
  },
  {
    id: "marketing",
    label: "Marketing site",
    text: "The Marginalia identity, the self-citing page, honest-copy constraints, and the legal pages.",
  },
  {
    id: "docs",
    label: "Docs site",
    text: "Render-don't-copy, provenance cards, and the choices behind this very site.",
  },
  {
    id: "process",
    label: "Process",
    text: "The cross-cutting story: tooling, the foreman and parallel lanes, what the parallelism delivered and where it rubbed.",
  },
];

export async function getNavGroups(): Promise<NavGroup[]> {
  const sessions = await getSessions();
  return [
    {
      label: "Start",
      items: [{ href: "/", label: "Overview" }],
    },
    {
      label: "Product",
      items: [
        { href: "/product/scope/", label: "Scope" },
        { href: "/product/ui-research/", label: "UI research" },
      ],
    },
    {
      label: "Decisions",
      items: [{ href: "/decisions/", label: "Feasibility study" }],
    },
    {
      label: "Roadmap",
      items: [{ href: "/roadmap/", label: "7-day prototype" }],
    },
    {
      label: "History",
      items: [
        { href: "/history/", label: "Overview" },
        ...historyPages.map((p) => ({ href: `/history/${p.id}/`, label: p.label })),
      ],
    },
    {
      label: "Sessions",
      items: [
        { href: "/sessions/", label: "Session log" },
        ...sessions.map((s) => ({ href: s.href, label: s.shortTitle })),
      ],
    },
  ];
}
