// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import pagefind from 'astro-pagefind';
import remarkWikiLinks from './src/lib/remark-wiki-links.ts';
import remarkMermaid from './src/lib/remark-mermaid.ts';
import remarkMdLinks from './src/lib/remark-md-links.ts';

export default defineConfig({
  site: 'https://jmchilton.github.io',
  base: '/galaxy-brain',
  integrations: [pagefind()],
  markdown: {
    remarkPlugins: [
      [remarkWikiLinks, { vaultDir: '../vault', base: '/galaxy-brain' }],
      [remarkMdLinks, { vaultDir: '../vault', base: '/galaxy-brain' }],
      remarkMermaid,
    ],
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
