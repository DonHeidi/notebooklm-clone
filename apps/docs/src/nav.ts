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
      label: "Sessions",
      items: [
        { href: "/sessions/", label: "Session log" },
        ...sessions.map((s) => ({ href: s.href, label: s.shortTitle })),
      ],
    },
  ];
}
