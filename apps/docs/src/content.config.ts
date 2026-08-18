import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";

/**
 * The canonical documents live at the repository root (product/, handovers/)
 * and stay the single source of truth. These collections render them in
 * place — nothing is copied into apps/docs.
 */
const product = defineCollection({
  loader: glob({ pattern: "*.md", base: "../../product" }),
});

const handovers = defineCollection({
  loader: glob({ pattern: "*.md", base: "../../handovers" }),
});

const history = defineCollection({
  loader: glob({ pattern: "*.md", base: "../../product/history" }),
});

const architecture = defineCollection({
  loader: glob({ pattern: "*.md", base: "../../product/architecture" }),
});

export const collections = { product, handovers, history, architecture };
