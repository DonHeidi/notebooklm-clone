/**
 * The canonical documents (product/, handovers/) link to each other with
 * repo-relative markdown links so they stay navigable on GitHub. This
 * Sätteri hast plugin rewrites those links to the routes this site renders
 * the same files at, so they also work here. Absolute URLs, site-absolute
 * paths, and pure-hash links are left untouched; a relative link with no
 * known route (e.g. a source-file path) is also left as-is.
 */

/** Maps a repo-relative .md path (hash stripped) to a site route, or null. */
function canonicalRoute(path) {
  const fixed = [
    [/(?:^|\/)feasibility\.md$/, "/decisions/"],
    [/(?:^|\/)scope\.md$/, "/product/scope/"],
    [/(?:^|\/)target-scope\.md$/, "/product/target-scope/"],
    [/(?:^|\/)ui-research\.md$/, "/product/ui-research/"],
    [/(?:^|\/)in-numbers\.md$/, "/product/in-numbers/"],
    [/(?:^|\/)roadmap\.md$/, "/roadmap/"],
    [/(?:^|\/)faq\.md$/, "/faq/"],
  ];
  for (const [re, route] of fixed) {
    if (re.test(path)) return route;
  }
  let m = path.match(/(?:^|\/)architecture\/([\w-]+)\.md$/);
  if (m) return m[1] === "index" ? "/architecture/" : `/architecture/${m[1]}/`;
  m = path.match(/(?:^|\/)history\/([\w-]+)\.md$/);
  if (m) return `/history/${m[1]}/`;
  m = path.match(/(?:^|\/)handovers\/([\w.-]+)\.md$/);
  if (m) return `/sessions/${m[1]}/`;
  return null;
}

export const canonicalLinks = {
  name: "canonical-links",
  element: {
    filter: ["a"],
    visit(node, ctx) {
      const href = node.properties?.href;
      // Relative links only: skip protocol URLs, site-absolute, and hashes.
      if (typeof href === "string" && !/^(?:[a-z][a-z0-9+.-]*:|\/|#)/i.test(href)) {
        const [path, hash] = href.split("#");
        const route = canonicalRoute(path);
        if (route) ctx.setProperty(node, "href", hash ? `${route}#${hash}` : route);
      }
    },
  },
};
