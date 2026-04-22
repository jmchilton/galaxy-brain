// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import pagefind from 'astro-pagefind';

export default defineConfig({
  site: 'https://jmchilton.github.io',
  base: '/galaxy-brain',
  integrations: [pagefind()],
  vite: {
    plugins: [tailwindcss()],
  },
});
