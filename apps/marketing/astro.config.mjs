// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  // English alias for the bilingual privacy page.
  redirects: {
    '/privacy': '/datenschutz/'
  },
  vite: {
    plugins: [tailwindcss()]
  }
});