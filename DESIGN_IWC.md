# IWC Website Design & CSS Architecture

Research of the IWC (Intergalactic Workflow Commission) website at https://iwc.galaxyproject.org/, source at `/Users/jxc755/projects/repositories/iwc/website`.

## Build Tooling

- **Framework**: Astro 5.x (static output)
- **UI Framework**: Vue 3 (via `@astrojs/vue`) for interactive components
- **CSS Framework**: Tailwind CSS v4 via `@tailwindcss/vite` plugin (not PostCSS)
- **Bundler**: Vite (Astro's built-in)
- **Component Library**: Radix Vue (headless primitives for Tabs, Tooltips, Dialogs, Combobox)
- **Variant System**: `class-variance-authority` (CVA) for component variants
- **Class Merging**: `clsx` + `tailwind-merge` via shared `cn()` utility at `src/lib/utils.ts`
- **Icons**: `lucide-vue-next`
- **Markdown**: `marked` library for runtime rendering
- **Diagrams**: Mermaid.js (theme: `neutral`)
- **Search**: Fuse.js (client-side fuzzy search)
- **State**: Nanostores (`nanostores` + `@nanostores/vue`)
- **Analytics**: Plausible (self-hosted at `plausible.galaxyproject.eu`)
- **Error Tracking**: Sentry (`@sentry/astro`)
- **Animations**: `tailwindcss-animate` (Radix-compatible enter/exit animations)
- **Typography Plugin**: `@tailwindcss/typography` for prose styling

## Color Palette

All custom colors defined as Tailwind v4 `@theme` tokens in `src/styles/global.css`. Five semantic palettes aligned with Galaxy project branding:

### Bay of Many (Galaxy Primary Blue)
| Token | Hex | Usage |
|-------|-----|-------|
| `--color-bay-of-many-50` | `#fdfdfe` | List item alternating row tint |
| `--color-bay-of-many-100` | `#edf4fa` | |
| `--color-bay-of-many-200` | `#cde0f0` | "How to run" panel borders |
| `--color-bay-of-many-300` | `#aecce7` | |
| `--color-bay-of-many-400` | `#8fb9dd` | Clock icon color |
| `--color-bay-of-many-500` | `#6fa5d4` | Tag icon color |
| `--color-bay-of-many-600` | `#5091ca` | |
| `--color-bay-of-many-700` | `#387dba` | Default badge bg, link color, focus rings |
| `--color-bay-of-many-800` | `#2e689a` | Badge hover bg |
| `--color-bay-of-many-900` | `#25537b` | |
| `--color-bay-of-many-950` | `#1f4465` | |
| `--color-bay-of-many` | `#25537b` | Base alias (= 900) |

### Ebony Clay (Galaxy Dark / Navy)
| Token | Hex | Usage |
|-------|-----|-------|
| `--color-ebony-clay-50` | `#dfe2ea` | CLI section background, card/list borders |
| `--color-ebony-clay-100` | `#d3d6e2` | Dividers, card borders, list borders |
| `--color-ebony-clay-200` | `#bbc0d2` | Outline button borders |
| `--color-ebony-clay-300` | `#a2a9c2` | |
| `--color-ebony-clay-400` | `#8992b2` | |
| `--color-ebony-clay-500` | `#717ba2` | |
| `--color-ebony-clay-600` | `#5d678d` | Code block button borders |
| `--color-ebony-clay-700` | `#4c5574` | Metadata text, code block button hover |
| `--color-ebony-clay-800` | `#3c435c` | Code block button bg |
| `--color-ebony-clay-900` | `#2c3143` | Headings, sidebar titles, code block bg |
| `--color-ebony-clay-950` | `#212532` | View toggle active text |
| `--color-ebony-clay` | `#2c3143` | Base alias (= 900), footer bg, CTA button bg |

### Gold (Galaxy Bright Highlight)
| Token | Hex | Usage |
|-------|-----|-------|
| `--color-gold` | `#ffd700` | Hero headline accent ("reproducible science") |
| `--color-gold-400` | `#ffe60d` | |
| `--color-gold-500` | `#ffd700` | |

### Chicago (Galaxy Grey / Secondary)
| Token | Hex | Usage |
|-------|-----|-------|
| `--color-chicago-50` | `#f5f5f6` | Page background (`bg-chicago-50`), feature cards bg |
| `--color-chicago-100` | `#e6e6e7` | Hover backgrounds |
| `--color-chicago-200` | `#d0d0d1` | Search input border, sheet dividers |
| `--color-chicago-300` | `#afafb1` | Footer separator dots, sheet handle bar |
| `--color-chicago-400` | `#878789` | Category heading text, filter counts, footer text |
| `--color-chicago-500` | `#6c6c6e` | Workflow count text, metadata text |
| `--color-chicago-600` | `#58585a` | Description text, tab inactive text, view toggle inactive |
| `--color-chicago-700` | `#4f4e50` | Body text, step descriptions |
| `--color-chicago-800` | `#454446` | Sheet title, hover text |
| `--color-chicago-950` | `#262626` | |
| `--color-chicago` | `#58585a` | Base alias (= 600) |

### Hokey Pokey (Galaxy Gold-ish / Accent)
| Token | Hex | Usage |
|-------|-----|-------|
| `--color-hokey-pokey-300` | `#e1d36b` | Back link hover on dark bg |
| `--color-hokey-pokey-500` | `#d0bd2a` | **Primary accent**: active filter highlight, hover accent bars, active tab underline, view toggle pill, sidebar heading underline, footer border |
| `--color-hokey-pokey-600` | `#a19321` | Default button bg, card title hover |
| `--color-hokey-pokey-700` | `#736817` | Default button hover, external link color |
| `--color-hokey-pokey-900` | `#151304` | External link hover |
| `--color-hokey-pokey` | `#d0bd2a` | Base alias (= 500), header link hover |

### Tailwind Default Colors Also Used
- `gray-100` through `gray-900` for some UI primitives (Card borders, combobox items, about page text)
- `red-500`/`red-600` for destructive variants
- `amber-600` for warning text
- `blue-600` for inline links on about page

## Typography

### Font Family
- **Primary**: "Atkinson Hyperlegible" (loaded via `@fontsource/atkinson-hyperlegible`)
  - Weights: 400 (regular), 700 (bold), plus italic variants for both
  - Fallback stack: `ui-sans-serif, system-ui, sans-serif`
  - Applied globally via `font-sans` on `<body>`
- **Monospace**: `Monaco, Menlo, Consolas, "Courier New", monospace`
  - Used in code blocks

### Type Scale (Tailwind defaults)
| Context | Classes |
|---------|---------|
| Hero headline | `text-5xl font-bold` |
| Page titles (about) | `text-4xl md:text-5xl font-bold` |
| Section headings | `text-3xl md:text-4xl font-bold` |
| Workflow card title | `text-lg font-bold` (compact), `text-xl font-bold` (full) |
| Sidebar heading | `text-xs font-semibold uppercase tracking-wider` |
| Body text | `text-lg` (about), `text-sm` (descriptions), `text-base` (default) |
| Metadata | `text-xs`, `text-sm` |
| Badges | `text-xs font-semibold` |
| Nav links | `text-sm md:text-base` |
| Tab triggers | `text-base font-medium` |
| Code blocks | `text-sm` |

## Component Styling Patterns

### UI Component Library (shadcn/ui-style)
Components in `src/components/ui/` follow the shadcn/ui for Vue pattern:
- Headless behavior from **Radix Vue** (Tabs, Tooltip, Dialog, Combobox)
- Styling via CVA variant definitions in separate `*-variants.ts` files
- Class composition with `cn()` utility (clsx + tailwind-merge)
- Props accept `class` for override/extension

### Key UI Components

**Button** (`button-variants.ts`):
- `default`: `bg-hokey-pokey-600 text-white hover:bg-hokey-pokey-700` (gold accent)
- `outline`: `border-ebony-clay-200 bg-white text-ebony-clay-800`
- `secondary`: `bg-ebony-clay-100 text-ebony-clay-900`
- `ghost`: `hover:bg-ebony-clay-100`
- `link`: `text-bay-of-many-700 underline-offset-4`
- `destructive`: `bg-red-500 text-white`
- Sizes: default (`h-9 px-4`), sm (`h-8 px-3`), lg (`h-10 px-8`), icon (`h-9 w-9`)

**Badge** (`badge-variants.ts`):
- `default`: `bg-bay-of-many-700 text-white` (blue)
- `secondary`: `bg-gray-100 text-gray-900` (neutral chip)
- Badge hover on workflow cards: `hover:bg-hokey-pokey-500 hover:text-ebony-clay-950`

**Card**: `rounded-lg border border-gray-200 bg-white shadow`

**Tabs**:
- List: `border-b border-ebony-clay-100`
- Trigger: `border-b-4 border-transparent`, active: `border-hokey-pokey-500 text-ebony-clay-900`
- Focus ring: `ring-bay-of-many-700`

**CodeBlock**: `bg-ebony-clay-900 text-ebony-clay-100 rounded shadow-inner` with copy button overlay

### Workflow Cards
- White background with `hover:shadow-lg` transition
- Left accent bar on hover: `bg-hokey-pokey-500`, animated with `scale-x-0 -> scale-x-100`
- Title: `text-ebony-clay-900`, hover: `text-hokey-pokey-600`
- Footer divider: `border-ebony-clay-100`

### Workflow List Items
- Alternating rows: `odd:bg-bay-of-many-50/30`
- Hover: `bg-bay-of-many-50`
- Same left accent bar pattern as cards

## Header & Navigation

### Header Background
```css
background: linear-gradient(to bottom, #2c3143 0%, #1a1f2e 100%);
```
With a subtle grid overlay:
```css
background-image:
    linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px);
background-size: 24px 24px;
```

- White text, logo hover: `text-hokey-pokey`
- Nav links: `hover:text-hokey-pokey`

### Footer
- Background: `bg-ebony-clay` (#2c3143)
- White text
- Left border accent: `border-hokey-pokey-500` (4px)
- Links: `text-chicago-200 hover:text-hokey-pokey`

## Layout Patterns

### Page Structure
- `BaseLayout.astro` provides slot-based layout: header, hero (optional), left sidebar, content, right sidebar
- Body: `min-h-dvh flex flex-col bg-chicago-50 font-sans`
- Main: `flex-1 flex` with inner flex-row for sidebars
- Content area: `px-4 md:px-8 py-4`
- Max-width containers: `max-w-6xl mx-auto` (footer, popular workflows)

### Responsive Breakpoints
Standard Tailwind breakpoints: `sm`, `md`, `lg`, `xl`, `2xl`
- Mobile: single column, filter sheet (bottom drawer)
- `md`: two-column grid, sidebar visible, header text expanded
- `lg`: three-column workflow grid
- `xl`/`2xl`: wider workflow detail sidebar

### Sidebar Patterns
- **Filter sidebar** (left, homepage): `w-48 lg:w-56`, sticky, hidden below `md`
- **Workflow detail sidebar** (right): `lg:w-80 xl:w-96 2xl:w-1/4`, sticky

### Mobile Filter
- Bottom sheet dialog (Radix Dialog) with `rounded-t-2xl`
- Slide-in animation: `slide-in-from-bottom`
- Handle bar indicator: `w-10 h-1 bg-chicago-300 rounded-full`

## Animation & Transitions

### View Transitions
- Astro `<ClientRouter />` for client-side navigation with view transitions

### Vue Transitions
- **View switch** (list <-> grid): `opacity 0.2s, transform 0.2s` with Y-axis translate
- **List stagger**: `opacity 0.3s, translateX(-12px)` with CSS custom property `--stagger-delay`
- **Grid stagger**: `opacity 0.35s, scale(0.95) translateY(10px)` with stagger delay
- **Fade**: Simple `opacity 0.3s` for results count text

### Interactive Animations
- Hover accent bars: `transform origin-left scale-x-0 -> scale-x-100 duration-200`
- View toggle pill: `transition-all duration-300 ease-out` sliding indicator
- Card shadows: `hover:shadow-lg transition-all duration-200`
- Radix animations: `animate-in`/`animate-out` via `tailwindcss-animate`

## Dark Mode

**Not implemented at the page level.** The site has no dark mode toggle or class-based/media-query dark mode switching. The `<body>` always uses `bg-chicago-50` (light grey).

However, the `MarkdownRenderer.vue` has `:deep(.dark ...)` CSS rules for mermaid diagram containers, suggesting partial/future dark mode consideration for embedded content only.

## Design System Summary

The IWC site uses a **Galaxy-branded** design language:
1. **Light, neutral page background** (`#f5f5f6` chicago-50)
2. **Dark navy header/footer** (`#2c3143` ebony-clay with gradient to `#1a1f2e`)
3. **Gold accent** (`#d0bd2a` hokey-pokey) as the primary interactive color -- hover states, active indicators, CTA buttons, accent bars
4. **Blue** (`#387dba` bay-of-many-700) for links, badges, and focus rings
5. **Grey scale** (chicago palette) for text hierarchy and neutral UI elements
6. **White cards** with subtle borders and shadow elevation on hover
7. **Atkinson Hyperlegible** as the sole typeface -- chosen for readability/accessibility
8. **Consistent motion** -- short durations (150-300ms), ease timing, stagger patterns for lists

### Key Design Decisions
- No dark mode (light-only)
- Headless component primitives (Radix Vue) with Tailwind styling
- CVA for variant-driven component APIs
- Galaxy project color identity maintained throughout
- Accessibility-focused font choice (Atkinson Hyperlegible)
- Minimal custom CSS -- almost entirely Tailwind utility classes
- Scoped `<style>` blocks only for complex/non-utility patterns (mermaid zoom, author links)
