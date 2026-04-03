# Galaxy Core Client Design System

Research into the styling pipeline, design tokens, typography, color palette, and CSS architecture of the Galaxy client at `client/` in the galaxyproject/galaxy repository.

## Build Tooling

- **Bundler**: Vite 7.x (migrated from Webpack)
- **CSS Preprocessor**: Sass (dart-sass 1.94.x via `sass` npm package)
- **SCSS config** in `vite.config.mjs`: `includePaths: ["src/style", "src/style/scss", "node_modules"]`, with `quietDeps: true` and silenced deprecations for legacy `@import`, `color-functions`, `global-builtin`
- **CSS code splitting disabled** -- all CSS combined into a single `base.css` output
- **PostCSS**: peer dependency on postcss 8.x; autoprefixer 10.x in devDeps
- **Test runner**: Vitest 4.x
- **Vue**: Vue 2.7.16 via `@vitejs/plugin-vue2`
- **TypeScript**: 5.7.x with `vue-tsc`

### Entry Points

Three Rollup inputs:
1. `src/entry/libs.js` -- jQuery globals, Buffer polyfill (must load first)
2. `src/entry/analysis/index.ts` -- main SPA (Vue + Pinia + Vue Router)
3. `src/entry/generic.js` -- lightweight non-SPA pages

## CSS Framework

**Bootstrap 4.6** + **BootstrapVue 2.23** form the foundation. The entire Bootstrap SCSS is imported in `src/style/scss/base.scss`:

```scss
@import "bootstrap/scss/_functions.scss";
@import "@/style/scss/theme/blue.scss";   // Galaxy overrides BEFORE bootstrap
@import "bootstrap/scss/bootstrap.scss";
@import "bootstrap-vue/src/index.scss";
```

Galaxy heavily customizes Bootstrap by overriding its `$theme-colors` map and many base variables before importing the framework. This is the standard Bootstrap 4 theming approach.

## Color Palette

### Brand Colors (SCSS -- `src/style/scss/theme/blue.scss`)

| Variable | Value | Usage |
|---|---|---|
| `$brand-primary` | `#25537b` | Primary actions, links, selected states |
| `$brand-secondary` | `#dee2e6` | Secondary buttons, default badge bg |
| `$brand-success` | `#66cc66` | Success states, "ok" datasets |
| `$brand-info` | `#2077b3` | Info alerts, focus indicators, portlet focus |
| `$brand-warning` | `#fe7f02` | Warnings, running state derived backgrounds |
| `$brand-danger` | `#e31a1e` | Error states |
| `$brand-light` | `#f8f9fa` | Panel backgrounds, light UI surfaces |
| `$brand-dark` | `#2c3143` | Masthead background, text color base, "dark" |
| `$brand-toggle` | `gold` | Masthead hover text |

### CSS Custom Properties (Design Tokens -- `src/style/scss/custom_theme_variables.scss`)

A growing set of CSS custom properties set on `html`. These are the newer design token layer intended to eventually replace raw SCSS variables.

**Blues**:
```
--color-blue-900: #040b21    --color-blue-500: #197cd2
--color-blue-800: #191f33    --color-blue-400: #48a1dd
--color-blue-700: #2c3143    --color-blue-300: #80c3ea
--color-blue-600: #25537b    --color-blue-200: #daecf8
                              --color-blue-100: #f1f9fe
```

**Greys**:
```
--color-grey-900: #191919    --color-grey-500: #63656d
--color-grey-800: #23262f    --color-grey-400: #8f9199
--color-grey-700: #35373f    --color-grey-300: #aab0b4
--color-grey-600: #484a52    --color-grey-200: #dee2e6
                              --color-grey-100: #f8f9fa
```

**Greens**:
```
--color-green-900: #002a1f   --color-green-500: #66cc66
--color-green-800: #003f2e   --color-green-400: #98e192
--color-green-700: #006f50   --color-green-300: #c8edc8
--color-green-600: #25a35b   --color-green-200: #e0f7df
                              --color-green-100: #f3fbf2
```

**Yellows**:
```
--color-yellow-900: #362100  --color-yellow-500: #ffd700
--color-yellow-800: #462b00  --color-yellow-400: #ffe848
--color-yellow-700: #7f5102  --color-yellow-300: #fff489
--color-yellow-600: #f0aa02  --color-yellow-200: #fefbc5
                              --color-yellow-100: #fefeea
```

**Oranges**:
```
--color-orange-900: #391100  --color-orange-500: #ff9b2f
--color-orange-800: #461500  --color-orange-400: #ffae52
--color-orange-700: #9b3a00  --color-orange-300: #ffc985
--color-orange-600: #fe7e03  --color-orange-200: #ffedd5
                              --color-orange-100: #fffaf1
```

**Reds**:
```
--color-red-900: #430111    --color-red-500: #f33b36
--color-red-800: #63021a    --color-red-400: #ff817b
--color-red-700: #91081b    --color-red-300: #f4a3a5
--color-red-600: #e31a1e    --color-red-200: #fdd4d5
                             --color-red-100: #fff3f3
```

### Gray Scale (SCSS -- derived from brand colors)

```scss
$white:    lighten($brand-light, 15%)    // body background
$gray-100: $brand-light                  // #f8f9fa
$gray-200: darken($brand-light, 5%)      // welcome background
$gray-300: darken($brand-light, 10%)
$gray-400: $border-color                 // darken($brand-light, 20%)
$gray-500: darken($brand-light, 30%)
$gray-600 - $gray-700: $text-muted       // lighten($text-color, 10%)
$gray-800: $text-muted
$gray-900: $text-color                   // $brand-dark
$black:    $brand-dark                   // #2c3143
```

### Dataset/Job State Colors

Mapped as SCSS maps `$galaxy-state-bg` and `$galaxy-state-border` in `base.scss`:

| State | Background | Border |
|---|---|---|
| new | `$state-default-bg` (`$gray-200`) | `$state-default-border` (`$border-color`) |
| upload | `$state-info-bg` (lighten info 50%) | `$state-info-border` |
| waiting/queued | `$state-default-bg` | `$state-default-border` |
| running | `$state-running-bg` (lighten warning 40%) | `$state-running-border` |
| ok | `$state-success-bg` | `$state-success-border` |
| error | `$state-danger-bg` | `$state-danger-border` |
| deleted | darken default 30% | darken default border 30% (dotted) |
| hidden | `$state-default-bg` (dotted) | `$state-default-border` |
| setting_metadata | `$state-warning-bg` | `$state-warning-border` |

State colors are derived using Bootstrap 4's `theme-color-level()` function at configured alert levels (`$alert-bg-level: -12`, `$alert-border-level: -6`, `$alert-color-level: 16`).

## Typography

### Fonts

**Primary (sans-serif)**:
```scss
$font-family-sans-serif:
    "Atkinson Hyperlegible",
    -apple-system, BlinkMacSystemFont,
    "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif,
    "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
```

Atkinson Hyperlegible is loaded via `@fontsource/atkinson-hyperlegible` (npm package, self-hosted font files -- not Google Fonts CDN).

**Monospace**:
```scss
$font-family-monospace: Monaco, Menlo, Consolas, "Courier New", monospace;
```

**Masthead brand text**: `Verdana, sans-serif` (bold, 1rem)
**Navbar brand**: `Verdana, sans-serif` (bold, 160%)

### Font Sizes

```scss
$font-size-base: 0.85rem   // smaller than Bootstrap default of 1rem
$h1-font-size: 1.7rem      // base * 2
$h2-font-size: 1.4875rem   // base * 1.75
$h3-font-size: 1.275rem    // base * 1.5
$h4-font-size: 1.0625rem   // base * 1.25
$h5-font-size: 0.85rem     // same as base
$h6-font-size: 0.7225rem   // base * 0.85
$line-height-base: 1.5
```

### CSS Custom Property Font Sizes

```scss
--font-size-small:  0.75rem
--font-size-medium: 0.85rem
--font-size-large:  1rem
```

## Spacing System

### SCSS Variables

```scss
$spacer: 1rem
$margin-v: 1.5rem     // $spacer * 1.5
$margin-h: 1rem       // $spacer
```

### CSS Custom Properties

```scss
--spacing:   0.25rem
--spacing-1: 0.25rem (var(--spacing))
--spacing-2: 0.50rem
--spacing-3: 0.75rem
--spacing-4: 1.00rem
--spacing-5: 1.25rem
--spacing-6: 1.50rem
--spacing-7: 1.75rem
--spacing-8: 2.00rem
```

Plus standard Bootstrap 4 spacing utilities (`m-*`, `p-*`, etc.) used extensively via `@extend`.

## Masthead (Top Navigation)

### Dimensions
```scss
$masthead-height: 2.5rem
$masthead-logo-height: 2rem   // height - 0.5rem
```

### Colors
```scss
$masthead-color:         $brand-dark        // #2c3143
$masthead-text-color:    $brand-light       // #f8f9fa
$masthead-text-active:   lighten(#f8f9fa, 15%)
$masthead-text-hover:    gold
$masthead-link-color:    transparent
$masthead-link-hover:    transparent
$masthead-link-active:   darken(#2c3143, 10%)
```

These are also exposed as CSS custom properties (`--masthead-color`, `--masthead-text-color`, etc.) and can be overridden by server-side theme configuration.

## Theme System

Galaxy supports server-configurable themes via `config/themes_conf.yml`. Themes are delivered to the client as CSS custom property maps and applied as inline `style` on the root `#app` element.

### Shipped Theme Presets

| Theme | Masthead Color | Text Hover | Notes |
|---|---|---|---|
| blue (default) | `#2c3143` | `gold` | Standard Galaxy |
| lightblue | `#384E77` | `#E6F9AF` | Lighter masthead |
| pride | Rainbow gradient | `gold` | Progress flag with chevron |
| smoky | `#0C0F0A` | `#FBFF12` | Dark, neon accents |
| anvil | `#012840` | `#e0dd10` | AnVIL branded, taller masthead (3rem) |

Themes currently only control **masthead styling** (color, text colors, logo, height). There is no full-application dark mode or light/dark theme toggle -- only masthead branding varies.

### Theme Application Flow

1. Server reads `themes_conf.yml` and converts to CSS property map
2. Config sent to client via Galaxy config API
3. `App.vue` computes `theme` from `config.themes[currentTheme]`
4. Applied as `:style="theme"` on `<div id="app">`
5. User preference stored in `userStore.currentTheme`

## Dark Mode

**Galaxy does not have dark mode support.** There is no `prefers-color-scheme` media query handling, no dark theme CSS custom properties, and no theme toggle for light/dark. The theme system only varies the masthead appearance.

## Component Styling Patterns

### Vue Component Styles

Components use a mix of:
- **Scoped SCSS** (`<style scoped lang="scss">`) for component-specific styles
- **Unscoped SCSS** for global overrides
- **Bootstrap utility classes** heavily via template (`class="d-flex flex-column w-100"`)
- **SCSS `@extend`** of Bootstrap classes in stylesheets
- **Direct theme import**: many components import `@import "@/style/scss/theme/blue.scss"` in their scoped styles to access SCSS variables

### Pattern: Bootstrap-Vue Components

Galaxy uses BootstrapVue components (`BNavbar`, `BButton`, `BModal`, `BAlert`, `BFormInput`, etc.) as the primary component library. Custom components wrap or compose these.

### Pattern: Card-based Nodes

Workflow editor nodes use Bootstrap `.card` as base, with custom header/body patterns:

```scss
.workflow-node.card {
    .node-header { background: $brand-primary; color: $white; }
    // selection states via box-shadow rings
    &.node-highlight { box-shadow: 0 0 0 2px $brand-primary; }
}
```

### Pattern: State-driven Styling

Many components use data attributes or classes to drive state-dependent styling:
- `[data-state="running"]` selectors in `base.scss`
- `.state-color-*` classes generated from SCSS maps
- `.has-job-state-mixin` in `dataset.scss` for dataset state backgrounds

### Pattern: Panel Layout

Three-column layout using flexbox:
- `#everything` -- flex column container
- `#columns` -- flex row with overflow hidden
- Side panels (`FlexPanel.vue`) -- resizable via draggable separator, collapsible
- `$panel-width: 18rem` default, user-adjustable (stored in localStorage)

### Panel Variables
```scss
$panel-bg-color:         $brand-light   // #f8f9fa
$panel-text-color:       $text-color    // $brand-dark
$panel-header-text-color: $text-color
$panel-bg-header-color:  $panel-bg-color
$panel-footer-bg-color:  $panel-bg-color
$panel-message-height:   2.5rem
$panel-width:            18rem
$panel_header_height:    2.5rem
```

## Border Tokens

```scss
$border-radius-base:       0.1875rem  // 3px
$border-radius-large:      0.3125rem  // 5px
$border-radius-extralarge: 0.7rem
$border-color:             darken($brand-light, 20%)
$border-default:           1px solid $border-color
```

## Workflow Editor Variables

```scss
$workflow-editor-bg:              $white
$workflow-editor-grid-color:      lighten($brand-primary, 65%)
$workflow-editor-grid-color-landmark: lighten($brand-primary, 60%)
$workflow-overview-bg:            $panel-bg-color
$workflow-node-width:             12.5rem
```

## Icon System

- **FontAwesome 5 Free** (`@fortawesome/fontawesome-free` SCSS + webfonts) -- primary icon set
- **FontAwesome 6** selective import (`font-awesome-6` npm alias for `@fortawesome/free-solid-svg-icons@6`) -- used for specific newer icons (e.g., `faGear`)
- **Vue FontAwesome** (`@fortawesome/vue-fontawesome@2`) -- `<FontAwesomeIcon>` component
- **Lucide Vue** (`lucide-vue@0.344`) -- secondary icon library
- **Legacy sprite sheets** -- `sprite-fugue.scss` with 16x16 image sprites for old icon buttons (being phased out)

## Portlet/Card Variables

```scss
$portlet-bg-color:    $gray-200    // darken(#f8f9fa, 5%)
$portlet-focus-color: $brand-info  // #2077b3
```

Section portlets get a 3px left border that turns `$portlet-focus-color` on `:focus-within`.

## Form Styling

```scss
$form-heading-bg: $panel-bg-color
$form-border:     darken($form-heading-bg, 20%)
$input-color:     $text-color
$input-color-placeholder: $text-muted
```

## Button Defaults

```scss
$btn-default-color:  $text-color
$btn-default-bg:     $gray-200
$btn-default-border: transparent
```

All `<button>` elements are globally styled as `.btn .btn-secondary` via `@extend`.

## Dropdown Overrides

```scss
$dropdown-link-hover-color: $brand-light  // white text on hover
$dropdown-link-hover-bg:    $brand-primary // dark blue background
```

## Window (WinBox) Styles

Floating windows use the WinBox library with Galaxy theming:
- Header: `$brand-primary` background
- Body: `$body-bg` background
- Title: `$font-family-sans-serif`, `$font-size-base`, bold
- Border: `$border-default` with `$border-radius-base`
- Positioned below masthead: `margin-top: calc($masthead-height + 1px)`

## Toast Notifications

Custom toastr styles in `toastr.scss` with dedicated colors:
```scss
$green:  #51a351  // success
$red:    #bd362f  // error
$blue:   #2f96b4  // info
$orange: #f89406  // warning
```

## SCSS Mixins (`mixins.scss`)

| Mixin | Purpose |
|---|---|
| `user-select($select)` | Cross-browser user-select |
| `border-radius($radius)` | Cross-browser border-radius (legacy) |
| `fill()` | `position: relative; top/left: 0; width/height: 100%` |
| `absfill()` | Absolute positioning filling parent |
| `absCenter()` | Absolute centering via translate |
| `shutterFade($boxHeight)` | Animated max-height reveal/hide |
| `scrollMe()` | Overflow scroll with hidden scrollbar |
| `scrollingListLayout($fixedTop, $listRegion)` | Fixed header + scrolling list |
| `list_reset()` | Remove list styling |
| `fontawesome($icon)` | FA icon as pseudo-element |

## File Organization

```
client/
  vite.config.mjs
  package.json
  src/
    style/
      scss/
        base.scss                    # Main stylesheet entry
        theme/
          blue.scss                  # Default theme variables (SCSS)
        custom_theme_variables.scss  # CSS custom properties / design tokens
        overrides.scss               # Bootstrap override rules
        mixins.scss                  # Galaxy SCSS mixins
        ui.scss                      # Form, portlet, input component styles
        panels.scss                  # Unified panel layout styles
        flex.scss                    # Flexbox layout utilities
        windows.scss                 # WinBox floating window styles
        upload.scss                  # Upload dialog styles
        toastr.scss                  # Toast notification styles
        tour.scss                    # Tour/walkthrough styles
        charts.scss                  # Charting/visualization styles
        dataset.scss                 # Dataset state + display styles
        list-item.scss               # Generic list item patterns
        icon-btn.scss                # Icon button component
        message.scss                 # Message box styles
        multiselect.scss             # Vue-multiselect overrides
        library.scss                 # Data library styles
        select2.scss                 # Select2 legacy dropdown styles
        unsorted.scss                # Legacy tool form, grid, message styles
        reports.scss                 # Reports webapp styles
        peek-columns.scss            # Peek column selector
        sprite-fugue.scss            # Legacy icon sprite sheet
        sprite-history-states.scss   # History state sprites
        sprite-history-buttons.scss  # History button sprites
    entry/
      libs.js                        # jQuery + Buffer globals
      analysis/
        index.ts                     # Main SPA entry
        App.vue                      # Root component (theme application)
      generic.js                     # Non-SPA entry
    components/
      Masthead/
        Masthead.vue                 # Top navigation bar
      Panels/
        FlexPanel.vue                # Resizable side panels
      Workflow/
        Editor/
          Node.vue                   # Workflow node styling example
      History/
        CurrentHistory/
          HistoryPanel.vue           # History panel
```

## Key Design Decisions Summary

1. **Bootstrap 4 foundation** -- not upgraded to Bootstrap 5; BootstrapVue is Vue 2 only
2. **Vue 2.7** -- not yet migrated to Vue 3
3. **Smaller base font** (0.85rem vs 1rem) -- Galaxy is information-dense
4. **Accessibility font**: Atkinson Hyperlegible as primary typeface (designed for low-vision readability)
5. **No dark mode** -- only masthead theming via server config
6. **Dual token system**: legacy SCSS variables + emerging CSS custom properties; both coexist
7. **Heavy use of `@extend`** from Bootstrap classes inside SCSS -- tightly couples styles to Bootstrap 4
8. **Global button styling**: all `<button>` elements become `.btn .btn-secondary` via global `@extend`
9. **State-driven design**: dataset/job states are a first-class design concept with dedicated color maps
10. **Single CSS bundle**: all styles combined into one `base.css` file (no code splitting)
