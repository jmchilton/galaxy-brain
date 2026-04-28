// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import pagefind from 'astro-pagefind';
import remarkWikiLinks from './src/lib/remark-wiki-links.ts';

export default defineConfig({
  site: 'https://jmchilton.github.io',
  base: '/galaxy-brain',
  integrations: [pagefind()],
  markdown: {
    remarkPlugins: [[remarkWikiLinks, { vaultDir: '../vault', base: '/galaxy-brain' }]],
  },
  vite: {
    plugins: [tailwindcss()],
    server: {
      watch: {
        ignored: ['**/.obsidian/**', '**/vault/log.md'],
      },
    },
  },
});
