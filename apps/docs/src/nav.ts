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

/**
 * The 4+1 architectural views in `product/architecture/`, in Kruchten's
 * canonical order. Labels are maintained here because the canonical files
 * have no frontmatter (same reasoning as the history pages).
 */
export const architecturePages: { id: string; label: string; text: string }[] = [
  {
    id: "logical",
    label: "Logical view",
    text: "The notebook aggregate as implemented: sources → chunks, conversations → citations, ownership scoping, hybrid retrieval, the grounding contract.",
  },
  {
    id: "process",
    label: "Process view",
    text: "Runtime dynamics: the grounded-chat request end to end, the ingestion pipeline, token refresh, and the concurrency realities.",
  },
  {
    id: "development",
    label: "Development view",
    text: "The monorepo, the DDD layer rule and where it's enforced, testing strategy, toolchain, conventions, and CI.",
  },
  {
    id: "physical",
    label: "Physical view",
    text: "Deployment topology: the Scaleway container and buckets, Supabase, the model APIs, deploy workflows, and the secrets flow.",
  },
  {
    id: "scenarios",
    label: "Scenarios",
    text: "The +1: four use cases traced through the other views, each backed by a recorded end-to-end verification run.",
  },
];

export async function getNavGroups(): Promise<NavGroup[]> {
  const sessions = await getSessions();
  return [
    {
      label: "Start",
      items: [
        { href: "/", label: "Overview" },
        { href: "/faq/", label: "Quick answers" },
      ],
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
      label: "Architecture",
      items: [
        { href: "/architecture/", label: "Overview" },
        ...architecturePages.map((p) => ({
          href: `/architecture/${p.id}/`,
          label: p.label,
        })),
      ],
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
