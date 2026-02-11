# Plan: Publish Vault to GitHub Pages via Astro

## Context

Publish galaxy-brain vault as a static site at `jmchilton.github.io/galaxy-brain`. Earlier Quartz plan was rejected because: (1) can't implement custom dataview rendering, (2) vendors entire Quartz framework into repo. Astro gives full control — custom dataview-to-HTML at build time, standard npm project, no framework clone.

## Approach

Create a minimal Astro project in `site/`. Use Astro Content Collections with `glob()` loader pointing directly at `../../vault` (no symlink needed). Build custom homepage that replaces Dashboard.md dataview queries with real collection queries. Deploy via GitHub Actions.

## Key Design Decisions

- **No symlink**: `glob({ base: "../../vault" })` reads vault directly — works locally and in CI
- **Dashboard.md excluded** from site; homepage (`index.astro`) replaces it with real collection queries
- **Wiki links** only appear in frontmatter (not body text) — resolved in page templates, not remark
- **Slug format**: `research/component-backend-dependency-management` (slugified from filename)
- **GitHub links**: `github_issue`/`github_pr` fields rendered as links to `github.com/galaxyproject/galaxy`

## Steps

### 1. Scaffold Astro project

```sh
npm create astro@latest site -- --template minimal --no-install --no-git
cd site && npm install
```

### 2. Configure Astro — `site/astro.config.mjs`

```js
import { defineConfig } from 'astro/config';
export default defineConfig({
  site: 'https://jmchilton.github.io',
  base: '/galaxy-brain',
});
```

### 3. Content Collection — `site/src/content.config.ts`

```ts
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const vault = defineCollection({
  loader: glob({
    pattern: ['**/*.md', '!Dashboard.md', '!.obsidian/**', '!templates/**'],
    base: '../../vault',
    generateId({ entry }) {
      return entry.replace(/\.md$/, '').split('/')
        .map(s => s.toLowerCase().replace(/\s+-\s+/g, '-').replace(/\s+/g, '-')
          .replace(/[^a-z0-9\-]/g, '').replace(/-+/g, '-'))
        .join('/');
    }
  }),
  schema: z.object({
    type: z.string(),
    tags: z.array(z.string()),
    status: z.string(),
    created: z.coerce.date(),
    revised: z.coerce.date(),
    revision: z.number(),
    ai_generated: z.boolean(),
    // Optional fields
    subtype: z.string().optional(),
    title: z.string().optional(),
    component: z.string().optional(),
    galaxy_areas: z.array(z.string()).optional(),
    github_issue: z.union([z.number(), z.array(z.number())]).optional(),
    github_pr: z.number().optional(),
    github_repo: z.string().optional(),
    related_issues: z.array(z.string()).optional(),
    related_notes: z.array(z.string()).optional(),
    related_prs: z.array(z.union([z.string(), z.number()])).optional(),
    parent_plan: z.string().optional(),
    parent_feature: z.string().optional(),
    section: z.string().optional(),
    aliases: z.array(z.string()).optional(),
    branch: z.string().optional(),
    unresolved_questions: z.number().optional(),
    resolves_question: z.number().optional(),
  })
});

export const collections = { vault };
```

### 4. Wiki link utility — `site/src/lib/wiki-links.ts`

Builds map from slugified note basename → full entry ID. Resolves `[[Note Title]]` to href via prefix matching (e.g. `[[Issue 17506]]` matches `research/issue-17506-convert-workflow-...`). Returns null href for dangling links.

### 5. Base layout — `site/src/layouts/Base.astro`

Minimal: system-ui font, 900px max-width, nav link home, basic table/tag/status styles. No framework.

### 6. Homepage — `site/src/pages/index.astro`

Replaces Dashboard.md dataview queries with 4 `getCollection()` calls:
- `tags.includes('research/component')` → Components table
- `tags.includes('research/pr')` → PR Research table
- `tags.includes('research/issue')` → Issues table
- `tags.includes('plan')` → Plans table

All filter `status !== 'archived'`, sort by `revised` desc. Each row links to the note page.

### 7. Note pages — `site/src/pages/[...slug].astro`

Catch-all dynamic route. Renders:
- Frontmatter metadata: status badge, revised date, revision, tags
- GitHub links from `github_issue`/`github_pr` fields
- Wiki links from `related_issues`/`related_notes` as resolved links or dangling spans
- Full markdown content via `render()`

### 8. Update `.gitignore`

```
site/node_modules/
site/dist/
site/.astro/
```

### 9. Update Makefile

```makefile
site-dev:
	cd site && npm run dev

site-build:
	cd site && npm run build

site-preview:
	cd site && npm run preview
```

### 10. GitHub Actions — `.github/workflows/deploy.yml`

```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
permissions:
  contents: read
  pages: write
  id-token: write
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: withastro/action@v3
        with:
          path: site
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

### 11. Enable GitHub Pages (manual)

Repo Settings → Pages → Source → "GitHub Actions".

## Files

| File | Action |
|------|--------|
| `site/` | New Astro project |
| `site/astro.config.mjs` | Config with base URL |
| `site/src/content.config.ts` | Content collection w/ glob loader |
| `site/src/lib/wiki-links.ts` | Wiki link resolution |
| `site/src/layouts/Base.astro` | Base layout |
| `site/src/pages/index.astro` | Homepage (dashboard replacement) |
| `site/src/pages/[...slug].astro` | Note detail pages |
| `.github/workflows/deploy.yml` | New |
| `.gitignore` | Add site build artifacts |
| `Makefile` | Add site-dev, site-build, site-preview |

## Verification

1. `make site-dev` — homepage loads with 4 tables, correct note counts
2. Click note links — full markdown renders with code blocks, tables
3. Wiki links in frontmatter resolve to correct pages (or dangling style)
4. `github_issue`/`github_pr` link to correct GitHub URLs
5. Dashboard.md, `.obsidian/`, `templates/` excluded
6. `make site-build` — clean build, no errors
7. Push to main → Actions succeeds → site live at `jmchilton.github.io/galaxy-brain`

## Unresolved Questions

- Run `make validate` in CI before deploy?
- Exclude `status: archived` notes entirely or just from homepage tables?
- Custom styling beyond minimal, or fine for now?
