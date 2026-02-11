# Tailwind CSS Theme & Integration Plan

## 1. Installation & Astro Integration

Tailwind CSS v4 uses a Vite plugin instead of the deprecated `@astrojs/tailwind` integration. No `tailwind.config.mjs` file needed -- all theme config lives in CSS.

**Install packages:**

```sh
cd site && npm install tailwindcss @tailwindcss/vite @tailwindcss/typography
```

**Update `site/astro.config.mjs`:**

```js
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://jmchilton.github.io',
  base: '/galaxy-brain',
  vite: {
    plugins: [tailwindcss()],
  },
});
```

**Create `site/src/styles/global.css`:**

```css
@import "tailwindcss";
@plugin "@tailwindcss/typography";
```

This file holds the Tailwind import, typography plugin, theme overrides, dark mode config, and `@apply`-based component classes. It gets imported once in `Base.astro`.

**Update `site/src/layouts/Base.astro`** to import the stylesheet:

```astro
---
import '../styles/global.css';
// ... rest of frontmatter
---
```

Remove the entire `<style>` block from `Base.astro` -- all styles move to either utility classes or `global.css`.

## 2. Theme Definition -- Color Palette

Design rationale: technical documentation dashboard. Cool grays for structure, blue for links/accents, semantic colors for status badges. The palette uses Tailwind's built-in `slate` and `blue` scales where possible to minimize custom tokens.

Add to `global.css` after imports:

```css
@theme {
  /* Semantic link color matching current #0969da */
  --color-link: #0969da;
  --color-link-hover: #0550ae;

  /* Surface colors (light mode defaults) */
  --color-surface: #ffffff;
  --color-surface-raised: #f6f8fa;
  --color-surface-hover: #e1e4e8;

  /* Border */
  --color-border: #d1d5db;
  --color-border-subtle: #e1e4e8;

  /* Text */
  --color-text-primary: #1a1a1a;
  --color-text-secondary: #555555;
  --color-text-muted: #999999;

  /* Status badge colors */
  --color-badge-draft-bg: #fff3cd;
  --color-badge-draft-text: #856404;
  --color-badge-reviewed-bg: #d4edda;
  --color-badge-reviewed-text: #155724;
  --color-badge-revised-bg: #cce5ff;
  --color-badge-revised-text: #004085;
  --color-badge-stale-bg: #f8d7da;
  --color-badge-stale-text: #721c24;
  --color-badge-archived-bg: #d6d8db;
  --color-badge-archived-text: #383d41;

  /* Tag pill */
  --color-tag-bg: #e1e4e8;
  --color-tag-bg-hover: #c8ccd0;

  /* Font stack */
  --font-sans: ui-sans-serif, system-ui, -apple-system, sans-serif;
  --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}
```

## 3. Dark Mode

Use class-based dark mode so a toggle can be added later. Default to OS preference via a small inline script.

Add to `global.css`:

```css
@custom-variant dark (&:where(.dark, .dark *));
```

Add dark overrides as CSS custom properties scoped to `.dark`:

```css
.dark {
  --color-link: #58a6ff;
  --color-link-hover: #79b8ff;

  --color-surface: #0d1117;
  --color-surface-raised: #161b22;
  --color-surface-hover: #21262d;

  --color-border: #30363d;
  --color-border-subtle: #21262d;

  --color-text-primary: #e6edf3;
  --color-text-secondary: #8b949e;
  --color-text-muted: #6e7681;

  --color-badge-draft-bg: #3d2e00;
  --color-badge-draft-text: #f0c000;
  --color-badge-reviewed-bg: #0f2d16;
  --color-badge-reviewed-text: #56d364;
  --color-badge-revised-bg: #0c2d6b;
  --color-badge-revised-text: #79b8ff;
  --color-badge-stale-bg: #3d1418;
  --color-badge-stale-text: #f85149;
  --color-badge-archived-bg: #21262d;
  --color-badge-archived-text: #8b949e;

  --color-tag-bg: #21262d;
  --color-tag-bg-hover: #30363d;
}
```

Add dark mode initialization script in `Base.astro` `<head>` (inline, before body renders to prevent flash):

```html
<script is:inline>
  document.documentElement.classList.toggle(
    'dark',
    localStorage.theme === 'dark' ||
      (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)
  );
</script>
```

## 4. Component Classes via @apply

These go in `global.css`. Use `@apply` for patterns repeated across multiple templates. Keep the list small -- prefer inline utilities.

```css
/* Status badges */
.badge {
  @apply inline-block px-2 py-0.5 rounded-full text-xs font-medium;
}
.badge-draft     { background-color: var(--color-badge-draft-bg);    color: var(--color-badge-draft-text); }
.badge-reviewed  { background-color: var(--color-badge-reviewed-bg); color: var(--color-badge-reviewed-text); }
.badge-revised   { background-color: var(--color-badge-revised-bg);  color: var(--color-badge-revised-text); }
.badge-stale     { background-color: var(--color-badge-stale-bg);    color: var(--color-badge-stale-text); }
.badge-archived  { background-color: var(--color-badge-archived-bg); color: var(--color-badge-archived-text); }

/* Tag pills */
.tag {
  @apply inline-block px-1.5 py-0.5 rounded text-xs;
  background-color: var(--color-tag-bg);
}
a:hover .tag {
  background-color: var(--color-tag-bg-hover);
}

/* Dangling wiki links */
.dangling {
  color: var(--color-text-muted);
  @apply italic;
}
```

Badges and tags use `@apply` because they are referenced via dynamic class strings (`badge badge-${status}`) across index, tag pages, and detail pages. CSS custom properties handle dark mode automatically without `dark:` variants.

## 5. Page-by-Page Migration

### 5a. `site/src/layouts/Base.astro`

**Current**: 65 lines of `<style>` with reset, body, nav, headings, tables, badges, tags, meta, prose.

**New structure**:

```astro
---
import '../styles/global.css';
interface Props { title: string; pageTitle?: string; }
const { title, pageTitle } = Astro.props;
const base = import.meta.env.BASE_URL.replace(/\/$/, '');
---
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{title} - Galaxy Brain</title>
  <script is:inline>
    document.documentElement.classList.toggle('dark',
      localStorage.theme === 'dark' ||
        (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)
    );
  </script>
</head>
<body class="max-w-4xl mx-auto px-4 py-4 leading-relaxed bg-(--color-surface) text-(--color-text-primary)">
  <nav class="mb-8 pb-2 border-b border-(--color-border-subtle)">
    <a href={`${base}/`} class="text-(--color-link) font-semibold no-underline hover:underline">Galaxy Brain</a>
    <span class="text-(--color-text-muted)"> | </span>
    <a href={`${base}/tags/`} class="text-(--color-link) font-semibold no-underline hover:underline">Tags</a>
    {pageTitle && (
      <>
        <span class="text-(--color-text-muted)"> / </span>
        <span class="text-(--color-text-secondary)">{pageTitle}</span>
      </>
    )}
  </nav>
  <slot />
</body>
</html>
```

Key mappings from old CSS:

| Old CSS | Tailwind |
|---------|----------|
| `* { box-sizing: border-box; margin: 0; padding: 0; }` | Tailwind preflight (included by default) |
| `body { max-width: 900px; margin: 0 auto; padding: 1rem }` | `max-w-4xl mx-auto px-4 py-4` |
| `body { line-height: 1.6 }` | `leading-relaxed` |
| `body { color: #1a1a1a }` | `text-(--color-text-primary)` |
| `body { font-family: system-ui }` | Default via `--font-sans` in theme |
| `nav { margin-bottom: 2rem; border-bottom: 1px solid #ddd }` | `mb-8 pb-2 border-b border-(--color-border-subtle)` |
| `nav a { color: #0969da; font-weight: 600 }` | `text-(--color-link) font-semibold` |
| `.nav-sep { color: #999 }` | `text-(--color-text-muted)` inline |
| `.nav-page { color: #555 }` | `text-(--color-text-secondary)` inline |

### 5b. `site/src/pages/index.astro` (Dashboard)

All tables share the same structure. Use a `.data-table` component class in `global.css`:

```css
.data-table {
  @apply w-full border-collapse my-2 mb-6;
}
.data-table th {
  @apply text-left px-3 py-1.5 font-semibold border-b;
  background-color: var(--color-surface-raised);
  border-color: var(--color-border-subtle);
}
.data-table td {
  @apply px-3 py-1.5 border-b;
  border-color: var(--color-border-subtle);
}
.data-table a {
  color: var(--color-link);
  @apply hover:underline;
}
```

Then every table just uses `<table class="data-table">` and cells need no classes.

### 5c. `site/src/pages/[...slug].astro` (Note Detail)

**Raw/Copy links** -- replace scoped `<style>` with utilities:

```astro
<div class="mb-4 flex gap-2 items-center">
  <a href={...}
     class="text-xs px-2.5 py-1 rounded border border-(--color-border) bg-(--color-surface-raised) text-(--color-link) no-underline hover:bg-(--color-surface-hover)">
    Raw
  </a>
  <button id="copy-raw" ...
     class="text-xs px-2.5 py-1 rounded border border-(--color-border) bg-(--color-surface-raised) text-(--color-link) cursor-pointer hover:bg-(--color-surface-hover)">
    Copy
  </button>
</div>
```

**Meta block** (`<dl class="meta">`):

```css
/* global.css */
.meta dt { @apply font-semibold inline; }
.meta dd { @apply inline mr-4; }
```

**Rendered markdown** -- use `@tailwindcss/typography`:

```astro
<article class="prose prose-slate max-w-none dark:prose-invert">
  <Content />
</article>
```

Remove the scoped `<style>` block entirely.

### 5d. `site/src/pages/tags/index.astro` (Tag Listing)

Replace scoped `<style>` with utilities:

```astro
<ul class="list-none my-2 mb-6 p-0 flex flex-wrap gap-2">
  {tags.map(([tag, count]) => (
    <li class="flex items-center gap-1">
      <a href={...} class="no-underline"><span class="tag">{tag}</span></a>
      <span class="text-xs text-(--color-text-secondary)">({count})</span>
    </li>
  ))}
</ul>
```

### 5e. `site/src/pages/tags/[...tag].astro` & `raw/[...slug].md.ts`

Tag filter page: add `data-table` class to `<table>`, utility classes for headings. Raw endpoint: no styles needed.

## 6. Complete `global.css`

```css
@import "tailwindcss";
@plugin "@tailwindcss/typography";
@custom-variant dark (&:where(.dark, .dark *));

@theme {
  --color-link: #0969da;
  --color-link-hover: #0550ae;
  --color-surface: #ffffff;
  --color-surface-raised: #f6f8fa;
  --color-surface-hover: #e1e4e8;
  --color-border: #d1d5db;
  --color-border-subtle: #e1e4e8;
  --color-text-primary: #1a1a1a;
  --color-text-secondary: #555555;
  --color-text-muted: #999999;
  --color-badge-draft-bg: #fff3cd;
  --color-badge-draft-text: #856404;
  --color-badge-reviewed-bg: #d4edda;
  --color-badge-reviewed-text: #155724;
  --color-badge-revised-bg: #cce5ff;
  --color-badge-revised-text: #004085;
  --color-badge-stale-bg: #f8d7da;
  --color-badge-stale-text: #721c24;
  --color-badge-archived-bg: #d6d8db;
  --color-badge-archived-text: #383d41;
  --color-tag-bg: #e1e4e8;
  --color-tag-bg-hover: #c8ccd0;
  --font-sans: ui-sans-serif, system-ui, -apple-system, sans-serif;
  --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

/* Dark mode overrides */
.dark {
  --color-link: #58a6ff;
  --color-link-hover: #79b8ff;
  --color-surface: #0d1117;
  --color-surface-raised: #161b22;
  --color-surface-hover: #21262d;
  --color-border: #30363d;
  --color-border-subtle: #21262d;
  --color-text-primary: #e6edf3;
  --color-text-secondary: #8b949e;
  --color-text-muted: #6e7681;
  --color-badge-draft-bg: #3d2e00;
  --color-badge-draft-text: #f0c000;
  --color-badge-reviewed-bg: #0f2d16;
  --color-badge-reviewed-text: #56d364;
  --color-badge-revised-bg: #0c2d6b;
  --color-badge-revised-text: #79b8ff;
  --color-badge-stale-bg: #3d1418;
  --color-badge-stale-text: #f85149;
  --color-badge-archived-bg: #21262d;
  --color-badge-archived-text: #8b949e;
  --color-tag-bg: #21262d;
  --color-tag-bg-hover: #30363d;
}

/* --- Component classes --- */

.badge {
  @apply inline-block px-2 py-0.5 rounded-full text-xs font-medium;
}
.badge-draft     { background-color: var(--color-badge-draft-bg);    color: var(--color-badge-draft-text); }
.badge-reviewed  { background-color: var(--color-badge-reviewed-bg); color: var(--color-badge-reviewed-text); }
.badge-revised   { background-color: var(--color-badge-revised-bg);  color: var(--color-badge-revised-text); }
.badge-stale     { background-color: var(--color-badge-stale-bg);    color: var(--color-badge-stale-text); }
.badge-archived  { background-color: var(--color-badge-archived-bg); color: var(--color-badge-archived-text); }

.tag {
  @apply inline-block px-1.5 py-0.5 rounded text-xs;
  background-color: var(--color-tag-bg);
}
a:hover .tag {
  background-color: var(--color-tag-bg-hover);
}

.dangling {
  color: var(--color-text-muted);
  @apply italic;
}

.data-table {
  @apply w-full border-collapse my-2 mb-6;
}
.data-table th {
  @apply text-left px-3 py-1.5 font-semibold border-b;
  background-color: var(--color-surface-raised);
  border-color: var(--color-border-subtle);
}
.data-table td {
  @apply px-3 py-1.5 border-b;
  border-color: var(--color-border-subtle);
}
.data-table a {
  color: var(--color-link);
  @apply hover:underline;
}

.meta dt { @apply font-semibold inline; }
.meta dd { @apply inline mr-4; }
```

## 7. Implementation Order

1. `npm install tailwindcss @tailwindcss/vite @tailwindcss/typography`
2. Create `site/src/styles/global.css` with full content from section 6
3. Update `site/astro.config.mjs` to add Vite plugin
4. Update `site/src/layouts/Base.astro` -- import CSS, add dark mode script, replace `<style>` with utilities
5. Update `site/src/pages/index.astro` -- add `data-table` class to tables, utility classes to headings
6. Update `site/src/pages/[...slug].astro` -- remove `<style>`, add utilities, wrap `<Content />` in prose
7. Update `site/src/pages/tags/index.astro` -- remove `<style>`, replace with utilities
8. Update `site/src/pages/tags/[...tag].astro` -- add `data-table` class, utility headings
9. Visual verification: `npm run dev`, check each page light + dark
10. Build verification: `npm run build`

## 8. Verification Checklist

- [ ] `npm run dev` starts without errors
- [ ] Homepage: 4 tables render with correct header backgrounds, badge colors
- [ ] Note detail: meta block raised background, prose renders code/blockquote/lists
- [ ] Tags index: tag pills display as rounded boxes with counts
- [ ] Tag filter: table renders identically to homepage
- [ ] Raw/Copy buttons styled and functional
- [ ] Dark mode toggle (add `dark` class to `<html>` via devtools): all surfaces, text, badges invert
- [ ] `npm run build` completes cleanly
- [ ] No leftover `<style>` blocks in any `.astro` file (except `is:inline` script)

## Unresolved Questions

- Add visible dark mode toggle button to nav now or defer?
- `max-w-4xl` (896px) vs old `900px` -- close enough or `max-w-[900px]`?
- Extract `NoteTable.astro` component now or leave as follow-up?
- Customize `@tailwindcss/typography` prose colors to match custom palette, or accept defaults with `prose-slate` / `dark:prose-invert`?
- Preference on dark mode colors (currently GitHub-dark inspired)?
