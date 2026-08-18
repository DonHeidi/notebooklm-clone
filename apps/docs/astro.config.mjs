// @ts-check
import { defineConfig, passthroughImageService } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import { satteri } from '@astrojs/markdown-satteri';
import { canonicalLinks } from './src/canonical-links.mjs';

// https://astro.build/config
export default defineConfig({
  // English alias for the bilingual privacy page.
  redirects: {
    '/privacy': '/datenschutz/'
  },
  image: {
    // The only images are pre-rendered SVG diagrams (C5) — copied as-is,
    // no raster transforms, so the sharp dependency stays out of the tree.
    service: passthroughImageService()
  },
  markdown: {
    // Light code theme to match the single "paper" theme (see global.css).
    shikiConfig: {
      theme: 'github-light',
    },
    // Repo-relative links between canonical documents → the routes this
    // site renders them at (they stay GitHub-navigable in the files).
    processor: satteri({ hastPlugins: [canonicalLinks] }),
  },
  vite: {
    plugins: [tailwindcss()]
  }
});
