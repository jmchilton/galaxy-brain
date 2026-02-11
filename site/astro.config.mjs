// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://jmchilton.github.io',
  base: '/galaxy-brain',
  vite: {
    plugins: [tailwindcss()],
  },
});
