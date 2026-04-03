# Design Overhaul Plan

## Current State Assessment

The galaxy-brain site is a minimal, functional Astro 5 static site with:

**Stack**: Astro 5 + Tailwind CSS v4 (via `@tailwindcss/vite`) + `@tailwindcss/typography`. No interactive framework (no Vue/React), no component variant library, no icon library. Zero npm dependencies beyond core three.

**Layout**: Single-column, `max-w-4xl`, centered. One layout file (`Base.astro`) with inline nav (breadcrumb-style: "Galaxy Brain | Tags / Page Title"). No header/footer distinction, no sidebar.

**Color System**: GitHub-inspired token set -- blue links (`#0969da`), neutral greys, white/dark surfaces. Full dark mode via class-based toggle with OS auto-detect. Status badges (draft/reviewed/revised/stale/archived) with semantic colors. Tags use neutral grey chips.

**Typography**: System font stack (`ui-sans-serif, system-ui`). No custom font. Prose via `prose-slate` with `dark:prose-invert`.

**Components**: `FileTree.astro` (recursive project file browser), `.badge` / `.tag` / `.data-table` / `.meta` CSS classes in `global.css`. All inline Tailwind otherwise.

**Pages**: Dashboard (`index.astro`), note detail (`[...slug].astro`), project sub-files, tag index, tag detail, raw markdown endpoints.

**What works well**: Clean, fast, functional. Dark mode is solid. Badge system, data tables, wiki link resolution, project file trees all work. The site is content-first and information-dense.

**What needs to change for Galaxy ecosystem alignment**: Color palette, typography, header/footer, page chrome, component polish, brand identity. The site currently looks like a generic GitHub-style notes site rather than something in the Galaxy ecosystem.

---

## Galaxy Ecosystem Common Design Patterns

Across Hub, IWC, and Core, these patterns are consistent:

| Element | Shared Pattern |
|---------|---------------|
| Primary blue | `#25537b` |
| Dark navy | `#2c3143` |
| Gold accent | `#ffd700` (Hub/Core) / `#d0bd2a` (IWC) |
| Grey neutral | `#58585a` |
| Font | Atkinson Hyperlegible (all three) |
| Header/masthead | Dark navy bg (`#2c3143`), white text, gold hover |
| Footer | Dark navy bg, white text |
| Grid background | 24px spacing, translucent primary blue lines (Hub/IWC) |
| Code blocks | Dark bg (`#1f2937` or `#2c3143`) |
| Component variants | CVA-based (Hub/IWC) |
| Tailwind v4 | Hub and IWC; Core still on Bootstrap 4 |
| Typography plugin | Hub and IWC both use `@tailwindcss/typography` |
| Accessibility | Atkinson Hyperlegible across the board |

---

## Design Token Mapping

### New Color Tokens (replacing GitHub-inspired tokens)

```css
@theme {
  /* Galaxy brand */
  --color-galaxy-primary: #25537b;
  --color-galaxy-dark: #2c3143;
  --color-galaxy-gold: #ffd700;
  --color-galaxy-gold-dark: #d0bd2a;
  --color-galaxy-grey: #58585a;

  /* Semantic surfaces */
  --color-surface: #ffffff;
  --color-surface-raised: #f6f8fa;
  --color-surface-hover: #edf4fa;       /* was neutral grey, now blue-tinted */
  --color-surface-dark: #2c3143;
  --color-surface-dark-medium: #3c435c;

  /* Text */
  --color-text-primary: #2c3143;        /* was #1a1a1a, now galaxy-dark */
  --color-text-secondary: #58585a;      /* was #555555, now galaxy-grey */
  --color-text-muted: #8b949e;
  --color-text-on-dark: #f8f9fa;

  /* Links */
  --color-link: #25537b;               /* was #0969da */
  --color-link-hover: #ffd700;          /* was #0550ae, now gold like Hub/IWC */

  /* Borders */
  --color-border: #d1d5db;
  --color-border-subtle: #e1e4e8;

  /* Accents */
  --color-accent: #ffd700;
  --color-accent-hover: #ffe60d;

  /* Badges (keep existing semantic colors, minor alignment) */
  /* ... keep current badge tokens, they're fine ... */

  /* Tags */
  --color-tag-bg: #edf4fa;             /* was grey, now light-blue tinted */
  --color-tag-bg-hover: #cde0f0;

  /* Font */
  --font-sans: 'Atkinson Hyperlegible', ui-sans-serif, system-ui, -apple-system, sans-serif;
  --font-mono: Monaco, Menlo, Consolas, 'Courier New', monospace;
}
```

### Dark Mode Adjustments

```css
.dark {
  --color-surface: #0d1117;
  --color-surface-raised: #161b22;
  --color-surface-hover: #21262d;
  --color-text-primary: #e6edf3;
  --color-text-secondary: #8b949e;
  --color-link: #6fa5d4;               /* lighter blue for dark bg */
  --color-link-hover: #ffd700;          /* gold stays gold */
  --color-tag-bg: #21262d;
  --color-tag-bg-hover: #30363d;
  /* rest of dark tokens stay similar to current */
}
```

---

## Implementation Plan

### Phase 1: Foundation (do first)

These changes are low-risk, affect everything, and set the stage for the rest.

#### 1a. Install Atkinson Hyperlegible font

**File**: `site/package.json`
- Add `@fontsource/atkinson-hyperlegible` dependency

**File**: `site/src/styles/global.css`
- Add font import at top: `@import "@fontsource/atkinson-hyperlegible/400.css"` and `@import "@fontsource/atkinson-hyperlegible/700.css"`
- Update `--font-sans` token to include Atkinson Hyperlegible first

#### 1b. Replace color tokens

**File**: `site/src/styles/global.css`
- Replace the `@theme` block with Galaxy-aligned tokens (see token mapping above)
- Update dark mode overrides
- Keep badge tokens as-is (they're semantically correct already)
- Update tag tokens from grey to blue-tinted

#### 1c. Update prose styling

**File**: `site/src/styles/global.css`
- Add custom prose overrides after the component classes:
  - Link color: `--color-link` with gold hover
  - Heading color: `--color-galaxy-dark`
  - `h2` gets translucent gold bottom border (matching Hub: `border-bottom: 2px solid #ffd70033`)
  - Blockquote: gold left border (`4px solid #ffd700`), faint gold-tinted bg
  - Table headers: `bg-galaxy-primary text-white` (matching Hub table headers)
  - Inline code: light blue-tinted bg (`#edf4fa`)
  - Code blocks: dark bg (`#2c3143`)

---

### Phase 2: Page Chrome (header + footer)

#### 2a. Add header component

**New file**: `site/src/components/Header.astro`

Replace the inline `<nav>` in Base.astro with a proper header:
- Dark navy gradient background (`#2c3143` to `#25537b` at 135deg)
- Subtle 24px grid overlay (white at 3% opacity) matching Hub/IWC
- Gold bottom border (4px solid)
- "Galaxy Brain" as site title in white, bold
- Nav links (Dashboard, Tags) in white with gold hover
- Dark mode toggle button (sun/moon icon)
- Breadcrumb trail integrated into header or just below it
- Mobile-responsive: hamburger not needed yet (few nav items), but ensure wrapping works

#### 2b. Add footer component

**New file**: `site/src/components/Footer.astro`

- Dark navy bg (`#2c3143`)
- White text, muted secondary text
- Links to GitHub repo
- Gold left-border accent on a section (matching IWC footer pattern)
- Minimal: just a copyright/attribution line and GitHub link

#### 2c. Update Base layout

**File**: `site/src/layouts/Base.astro`
- Import and use Header + Footer components
- Change body: remove inline nav, add `min-h-screen flex flex-col`
- Main content area: `flex-1`, keep `max-w-4xl mx-auto px-4 py-6`
- Add subtle grid background pattern on main content area (optional but on-brand)

---

### Phase 3: Component Polish

#### 3a. Page header for note detail pages

**File**: `site/src/pages/[...slug].astro`
- Add a styled page header block (below site header, above metadata):
  - Gradient bg from galaxy-dark to galaxy-primary
  - White text title
  - Gold vertical accent bar beside title (1px wide, matching Hub PageHeader)
  - Status badge and tags displayed as pills in the header
  - This replaces the current plain `<h1>` + `<dl class="meta">`

#### 3b. Dashboard cards instead of plain tables

**File**: `site/src/pages/index.astro`
- Keep data tables for now but style them with galaxy-primary header row
- OR convert sections to card-based layout with white cards, subtle border, hover shadow
- Section headings get gold bottom border accent
- This can be incremental -- tables first, cards later

#### 3c. Tag pills

**File**: `site/src/styles/global.css`
- Update `.tag` to use blue-tinted bg with hover animation
- Add hover gold accent (matching IWC badge hover: `hover:bg-hokey-pokey-500`)
- Consider pill-shaped (`rounded-full`) for consistency with Hub/IWC

#### 3d. Improved data tables

**File**: `site/src/styles/global.css`
- `.data-table th`: `bg-galaxy-primary text-white` (matching Hub table headers)
- Add subtle row hover state
- Rounded corners on table container

---

### Phase 4: Nice-to-haves (can wait)

#### 4a. Grid background pattern

**File**: `site/src/styles/global.css`

Add utility class:
```css
.bg-grid {
  background-image:
    linear-gradient(to right, rgba(37, 83, 123, 0.06) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(37, 83, 123, 0.06) 1px, transparent 1px);
  background-size: 24px 24px;
}
```
Apply to body or main content area. Dark variant with white at 3% opacity.

#### 4b. CVA + component variant system

- Add `class-variance-authority` and `clsx` + `tailwind-merge` to deps
- Create `site/src/lib/utils.ts` with `cn()` helper
- Extract button, badge, card as CVA-driven components in `site/src/components/ui/`
- This makes future component work much cleaner but is not urgent

#### 4c. View transitions

- Add Astro `<ViewTransitions />` for smooth page navigations
- Header persists across transitions (`transition:persist`)

#### 4d. Heading anchors

- Add rehype-slug + rehype-autolink-headings to markdown pipeline
- Style anchors: hidden by default, visible on hover, gold on hover (matching Hub)

#### 4e. Icon library

- Add `lucide-astro` or similar for sun/moon toggle, external link indicators, etc.

#### 4f. Table of contents sidebar

- For long note pages, add a TOC sidebar on desktop (`w-56`, sticky)
- Collapse to `<details>` on mobile
- This requires layout changes (two-column on lg+)

---

## File Change Summary

| File | Phase | Change |
|------|-------|--------|
| `site/package.json` | 1a | Add `@fontsource/atkinson-hyperlegible` |
| `site/src/styles/global.css` | 1b, 1c, 3c, 3d | Replace color tokens, add prose overrides, update tag/table styles |
| `site/src/components/Header.astro` | 2a | New file -- site header |
| `site/src/components/Footer.astro` | 2b | New file -- site footer |
| `site/src/layouts/Base.astro` | 2c | Use Header/Footer, update body structure |
| `site/src/pages/[...slug].astro` | 3a | Add styled page header, restructure metadata |
| `site/src/pages/index.astro` | 3b | Style section headings, optionally convert to cards |
| `site/src/styles/global.css` | 4a | Add `.bg-grid` utility |
| `site/package.json` | 4b | Add CVA, clsx, tailwind-merge (optional) |
| `site/astro.config.mjs` | 4d | Add rehype plugins for heading anchors |

---

## Design Principles to Follow

1. **Galaxy brand identity**: Navy + gold + primary blue, consistent across all page chrome
2. **Accessibility**: Atkinson Hyperlegible font, focus rings, sufficient contrast ratios
3. **Content-first**: Don't over-decorate; this is a working notes site, not a marketing page
4. **Progressive enhancement**: Keep the site static HTML, add interactivity only where needed
5. **Incremental delivery**: Each phase is independently deployable and improves the site
6. **Ecosystem coherence**: Someone visiting from galaxyproject.org or iwc.galaxyproject.org should feel visual kinship
7. **Dark mode parity**: Every new element needs both light and dark mode tokens

---

## Unresolved Questions

- Use pure gold (`#ffd700`) or IWC's muted gold (`#d0bd2a`) for primary accent? Hub uses pure gold, IWC uses muted. Recommend pure gold for link hover but muted gold for button/CTA backgrounds.
- Should the header be full-width or constrained to `max-w-4xl` like content? Hub uses full-width header with constrained content; recommend same.
- Should we increase `max-w` from `4xl` to `6xl`? Hub uses `6xl`. If TOC sidebar is added later, wider makes sense. Could defer this to Phase 4.
- Add search? Both Hub and IWC have search. Fuse.js (client-side) would match IWC's approach. Low priority but worth noting.
- Should the site eventually adopt Vue islands for interactive components (dark mode toggle, search)? Both Hub and IWC use `@astrojs/vue`. For now, vanilla JS `<script>` blocks suffice.
