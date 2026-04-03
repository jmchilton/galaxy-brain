# Galaxy Hub (galaxyproject.org) - Design & Styling Report

Research date: 2026-04-03
Source: https://github.com/galaxyproject/galaxy-hub (main branch)

---

## Build Tooling & Stack

| Layer | Technology |
|-------|-----------|
| Framework | **Astro 6** (static site generator) |
| Interactive islands | **Vue 3** (`@astrojs/vue`, `client:load` hydration) |
| CSS framework | **Tailwind CSS v4** via `@tailwindcss/vite` plugin |
| Typography plugin | `@tailwindcss/typography` (prose classes) |
| Animation | `tw-animate-css` |
| Component variants | `class-variance-authority` (CVA) for button variants etc. |
| Content | Markdown + MDX (`@astrojs/mdx`) with remark/rehype plugins |
| Package manager | pnpm 10.26.1, Node 22+ |
| Markdown processing | rehype-slug, rehype-autolink-headings |
| Sitemap | `@astrojs/sitemap` |
| Data viz | Vega / Vega-Lite |
| Citations | citation.js |

---

## Color Palette

### Galaxy Brand Colors (CSS custom properties via `@theme`)

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-galaxy-primary` | `#25537b` | Primary brand blue, links, buttons, table headers |
| `--color-galaxy-dark` | `#2c3143` | Dark navy, sidebar bg, header bg, prose headings |
| `--color-galaxy-gold` | `#ffd700` | Accent/highlight, hover states, blockquote borders, CTA |
| `--color-galaxy-gold-dark` | `#d19e00` | Darker gold variant |
| `--color-galaxy-grey` | `#58585a` | Neutral grey |

### Background Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-dark-bg` | `#2c3143` | Dark sections, sidebar |
| `--color-medium-bg` | `#3c435c` | Medium dark panels |
| `--color-light-bg` | `#edf4fa` | Light blue tinted background |
| `--color-card-bg` | `#5d678d` | Card backgrounds on dark sections |

### Accent Colors

| Token | Hex |
|-------|-----|
| `--color-accent` | `#ffd700` |
| `--color-accent-hover` | `#ffe60d` |

### Button Colors (Bootstrap compat layer)

| Variant | Normal | Hover |
|---------|--------|-------|
| Primary | `#25537b` | `#1d4263` |
| Secondary | `#6c757d` | `#5a6268` |
| Success | `#28a745` | `#218838` |
| Danger | `#dc3545` | `#c82333` |
| Warning | `#ffc107` | `#e0a800` |
| Info | `#117a8b` | `#0d5f6c` |
| Light | `#f8f9fa` | `#e2e6ea` |
| Dark | `#343a40` | `#23272b` |

### Galaxy-Specific Community Colors

**SIG (Special Interest Groups):**

| SIG | Hex |
|-----|-----|
| Field | `#006b15` |
| Method | `#630177` |
| Service | `#77072f` |
| Region | `#cc4d00` |
| Projects | `#150276` |

**Working Groups:**

| WG | Hex |
|----|-----|
| Primary | `#6286a6` |
| GOATS | `#61ad90` |
| Applied | `#8886b3` |
| All | `#d87e55` |

---

## Dark Mode

Full dark mode support using **class-based toggle** (`dark` class on root).

Custom variant defined: `@custom-variant dark (&:is(.dark *));`

### Light Mode (`:root`) -- oklch values

| Token | Value | Approx Description |
|-------|-------|-------------------|
| `--background` | `oklch(1 0 0)` | White |
| `--foreground` | `oklch(0.145 0 0)` | Near-black |
| `--card` | `oklch(1 0 0)` | White |
| `--primary` | `oklch(0.205 0 0)` | Very dark |
| `--primary-foreground` | `oklch(0.985 0 0)` | Near-white |
| `--secondary` | `oklch(0.97 0 0)` | Very light grey |
| `--muted-foreground` | `oklch(0.556 0 0)` | Medium grey |
| `--destructive` | `oklch(0.577 0.245 27.325)` | Red |
| `--border` | `oklch(0.922 0 0)` | Light grey |

### Dark Mode (`.dark`) -- oklch values

| Token | Value | Approx Description |
|-------|-------|-------------------|
| `--background` | `oklch(0.145 0 0)` | Near-black |
| `--foreground` | `oklch(0.985 0 0)` | Near-white |
| `--card` | `oklch(0.205 0 0)` | Very dark grey |
| `--primary` | `oklch(0.922 0 0)` | Light grey |
| `--secondary` | `oklch(0.269 0 0)` | Dark grey |
| `--muted-foreground` | `oklch(0.708 0 0)` | Medium-light grey |
| `--border` | `oklch(1 0 0 / 10%)` | Translucent white |
| `--input` | `oklch(1 0 0 / 15%)` | Translucent white |

Both modes also define `--chart-1` through `--chart-5` and full `--sidebar-*` token sets.

---

## Typography

### Font Stack

**Primary font:** Atkinson Hyperlegible (loaded via `@fontsource`, weights 400 and 700)

```css
--font-sans: 'Atkinson Hyperlegible', system-ui, -apple-system, BlinkMacSystemFont,
  'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
```

Atkinson Hyperlegible is an accessibility-focused font designed by the Braille Institute for maximum legibility.

### Heading Scale

- **Page titles:** `text-3xl sm:text-4xl font-bold` with tight letter-spacing
- **Section headings:** Standard prose heading hierarchy
- **Metadata text:** `text-sm` at 70% opacity
- **Tags/labels:** `text-sm font-medium`

### Prose Styling (`.prose` / `.prose-galaxy`)

- Link color: `#25537b` with 40% opacity underline via `color-mix()`
- Link hover: turns `#ffd700` (gold)
- Heading color: `#2c3143` (galaxy-dark) or `#1f2937`
- `h2`: has `border-bottom: 2px solid #ffd70033` (translucent gold) + `padding-bottom: 0.5rem`
- `h3`: extra `margin-top: 2em`
- Inline code: `background-color: #f3f4f6`, `0.875em`, medium weight
- Code blocks: `background-color: #1f2937`, `border-radius: 0.5rem`
- Blockquotes: `border-left: 4px solid #ffd700`, gold-tinted background (`#ffd70008`), italic
- Tables: full width, `th` uses `bg: #25537b` with white text
- Images: `border-radius: 0.5rem`, auto-centered
- List item inline images: `display: inline`, no margin, no border-radius

---

## Layout Architecture

### Page Shell (BaseLayout)

- Two-column responsive layout
- **Sidebar** (desktop `lg:` breakpoint): fixed left, `w-64` (256px), `bg-galaxy-dark`
- **Main content**: `lg:ml-64` offset, `bg-grid` subtle pattern overlay
- **Mobile header**: fixed position with logo + hamburger menu (Vue component)
- Full-viewport minimum height: `min-h-screen`
- View transitions: sidebar uses `transition:persist` across page navigations

### Content Layouts

| Layout | Purpose | Key Features |
|--------|---------|-------------|
| `BaseLayout` | Page shell | Sidebar, mobile header, footer |
| `HomeLayout` | Homepage | Transparent header that solidifies on scroll (gradient `#2c3143` to `#25537b`), full-bleed hero |
| `ArticleLayout` | Standard content | PageHeader + ContentWithToc + footer nav |
| `ConferenceLayout` | Event pages | Dark overlay header, metadata grid, subnav pills |
| `PlatformLayout` | Galaxy servers | Instance metadata table, CTA buttons |
| `ESGLayout` | EuroScienceGateway subsite | Standalone or integrated mode, `bg-gray-800` nav |
| `BareArticleLayout` | Minimal | Stripped-down content wrapper |
| `EmbedLayout` | Embeddable | For iframe/embed contexts |

### Content Width

- Max content width: `max-w-6xl` (72rem / 1152px) centered with `mx-auto`
- Platform pages: `max-w-4xl` (56rem / 896px)
- Table of contents sidebar: `w-56` (224px) on desktop, collapsible `<details>` on mobile
- Content padding: `px-6 sm:px-8`

### Grid Background Pattern

```css
.bg-grid {
  background-image:
    linear-gradient(to right, rgba(37, 83, 123, 0.06) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(37, 83, 123, 0.06) 1px, transparent 1px);
  background-size: 24px 24px;
}
```

Dark variant (`.bg-grid-dark`) uses `rgba(255, 255, 255, 0.03)`. This evokes a workflow editor mesh aesthetic.

---

## Component Patterns

### UI Component Library (`components/ui/`)

Shadcn-style component system using CVA (class-variance-authority):

- `accordion/`
- `badge/`
- `button/` -- 6 style variants (default, destructive, outline, secondary, ghost, link) x 6 sizes
- `card/`
- `collapsible/`
- `input/`
- `select/`
- `sheet/`
- `tabs/`
- `Icon.astro`

### Sidebar Navigation

- Fixed left panel, `bg-galaxy-dark`, white text
- Logo with gold drop-shadow glow on hover (scale 1.05)
- Search input with gold focus ring
- Collapsible nav sections (Vue `SidebarNav`)
- Social links (GitHub, YouTube, Mastodon, LinkedIn) with gold hover + 1.15x scale
- Archive notice banner with localStorage-based dismissal

### Page Headers (PageHeader)

- Gradient background: `galaxy-dark` to `galaxy-primary` at 135 degrees
- Subtle 24x24px grid overlay (white at 3% opacity)
- Gold vertical accent bar (1px wide, 8 units tall) beside title
- 4px solid gold bottom border
- Tags as bordered pills with gold hover state
- White text, descriptions at 80% opacity, metadata at 70%

### Hero Section

- Carousel with auto-rotation (5s default), dot indicators
- Fade transitions (500ms opacity)
- Gold dot indicators for active slide
- Semi-transparent white borders (`rgba(255,255,255, 0.15)`)
- Shadow: `0_8px_32px_rgba(0,0,0,0.3)`
- Respects `prefers-reduced-motion`

### Conference Subnav

- Pill-shaped buttons (`border-radius: 999px`)
- Semi-transparent borders (`rgba(255, 255, 255, 0.35)`)
- Active state: gold border + gold-tinted background (`rgba(244, 208, 63, 0.2)`)

### Linkbox (Legacy Content Pattern)

- Floated right sidebar box (200px) for article cross-references
- `background: #f8fafc`, `border: 1px solid #e2e8f0`
- Responsive: full-width below 768px

### Heading Anchors

- Hidden by default (`opacity: 0`), visible on heading hover
- `#` character via `::before` pseudo-element
- Gold on hover, primary blue focus ring
- Touch devices: always at 50% opacity

---

## Bootstrap Compatibility Layer

Legacy Bootstrap 4.x styles scoped under `.bs-compat` class for migrated content:

- Card, alert, button, table, and grid components
- Full spacing utility set (margin/padding 0-5)
- Display utilities (flex, block, none)
- Font Awesome icon fallbacks using Unicode symbols
- Responsive grid at `md` (768px) and `lg` (992px) breakpoints

This is a migration bridge -- new content uses Tailwind directly.

---

## Design Principles (Inferred)

1. **Galaxy brand identity**: Consistent dark navy + gold accent across all layouts
2. **Accessibility first**: Atkinson Hyperlegible font, focus rings, aria labels, reduced-motion support, keyboard-navigable heading anchors
3. **Progressive enhancement**: Astro islands (Vue) only where interactivity needed; most pages are static HTML
4. **Content-first**: Clean prose styling, generous whitespace, max-width constraints
5. **Workflow editor aesthetic**: Subtle grid background pattern echoing Galaxy's visual language
6. **Gradual migration**: Bootstrap compat layer preserves existing content while new pages use Tailwind
7. **Dark mode ready**: Full oklch-based token system for light/dark themes
8. **Responsive**: Mobile-first with sidebar collapsing to hamburger menu, TOC collapsing to `<details>`

---

## Key Design Tokens Summary

```
Brand primary:    #25537b  (deep blue)
Brand dark:       #2c3143  (dark navy)
Brand gold:       #ffd700  (accent/highlight)
Light background: #edf4fa  (blue-tinted white)
Medium background: #3c435c (medium navy)
Card background:  #5d678d  (muted blue-grey)
Grid pattern:     24px spacing, 6% primary blue opacity
Border radius:    0.625rem (base), pill: 999px for nav items
Font:             Atkinson Hyperlegible 400/700
Max content:      max-w-6xl (1152px)
Sidebar width:    w-64 (256px)
TOC width:        w-56 (224px)
```
