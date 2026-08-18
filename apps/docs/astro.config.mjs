// @ts-check
import { defineConfig, passthroughImageService } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

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
  },
  vite: {
    plugins: [tailwindcss()]
  }
});
