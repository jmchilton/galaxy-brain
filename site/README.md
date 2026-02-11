# Galaxy Brain Site

Astro static site rendering the vault notes for GitHub Pages.

## Stack

- [Astro](https://astro.build/) — static site generator
- [Tailwind CSS v4](https://tailwindcss.com/) — utility-first styling via `@tailwindcss/vite`
- [`@tailwindcss/typography`](https://github.com/tailwindlabs/tailwindcss-typography) — prose rendering for markdown content

## Development

```sh
npm install
npm run dev       # localhost:4321
npm run build     # production build to dist/
npm run preview   # preview production build
```

Or from the repo root: `make site-dev`, `make site-build`, `make site-preview`.

## Pages

| Route | Source | Description |
|-------|--------|-------------|
| `/` | `src/pages/index.astro` | Dashboard — tables grouped by note type |
| `/{slug}/` | `src/pages/[...slug].astro` | Note detail — metadata, wiki links, prose |
| `/tags/` | `src/pages/tags/index.astro` | Tag index — grouped with counts |
| `/tags/{tag}/` | `src/pages/tags/[...tag].astro` | Tag filter — notes with that tag |
| `/raw/{slug}.md` | `src/pages/raw/[...slug].md.ts` | Raw markdown body (plain text) |

## Theme

All theme tokens live in `src/styles/global.css`:
- Color palette (surfaces, text, links, badges, tags)
- Dark mode overrides (class-based, auto-detects OS preference)
- Component classes: `.badge-*`, `.tag`, `.data-table`, `.meta`

## Content

Notes loaded from `../vault/` via Astro content collections. Schema defined in `src/content.config.ts`. Wiki links (`[[...]]`) resolved to site URLs via `src/lib/wiki-links.ts`.
