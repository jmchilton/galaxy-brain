// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import pagefind from 'astro-pagefind';
import remarkWikiLinks from './src/lib/remark-wiki-links.ts';
import remarkMermaid from './src/lib/remark-mermaid.ts';
import remarkMdLinks from './src/lib/remark-md-links.ts';
import remarkMissingImages from './src/lib/remark-missing-images.ts';
import remarkPaperCitations from './src/lib/remark-paper-citations.ts';
import remarkPaperCrossrefs from './src/lib/remark-paper-crossrefs.ts';
import remarkGithubAlerts from './src/lib/remark-github-alerts.ts';

export default defineConfig({
  site: 'https://galaxy-brain.jmchilton.net',
  base: '/',
  integrations: [pagefind()],
  markdown: {
    remarkPlugins: [
      [remarkWikiLinks, { vaultDir: '../vault', base: '/' }],
      [remarkMdLinks, { vaultDir: '../vault', base: '/' }],
      remarkMissingImages,
      remarkPaperCitations,
      remarkPaperCrossrefs,
      remarkMermaid,
      remarkGithubAlerts,
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
