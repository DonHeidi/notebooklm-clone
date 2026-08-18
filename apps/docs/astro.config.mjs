// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  // English alias for the bilingual privacy page.
  redirects: {
    '/privacy': '/datenschutz/'
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
