# Galaxy style

A poster theme in Galaxy's own look, taken from the Galaxy client and the Galaxy Hub. It sets tokens, type and surfaces. The poster's concept, metaphor and layout come from its plan, not from this guide.

Sources (read them to re-check a token):
- **G**: `galaxyproject/galaxy`, `client/src/style/scss/theme/blue.scss` and `client/packages/ui/src/styles/tokens.css`.
- **H**: `galaxy-hub/astro`, `DESIGN.md` and `src/styles/global.css`.
- **BT**: `@galaxyproject/brand-tokens` `theme.css`, the package the Hub imports in `global.css`. Read it from unpkg if it isn't installed.

## Palette

| Token | Hex | Role | Source |
|---|---|---|---|
| `gx-dark` | `#2c3143` | Masthead band, headings, body ink | G `blue.scss` (`$brand-dark`), G `tokens.css` (`blue-700`), BT `--color-galaxy-dark` |
| `gx-deep` | `#1a1f2e` | Footer band, darkest ink | H `DESIGN.md` |
| `gx-primary` | `#25537b` | Annotations, links, diagram spines, filled nodes, table heads | G `blue.scss`, G `tokens.css` (`blue-600`), BT `--color-galaxy-primary` |
| `gx-info` | `#197cd2` | Secondary accent: diagram lines, numbered badges | G `tokens.css` (`blue-500`) |
| `gx-gold` | `#ffd700` | The one accent: masthead bar, hero word, featured-card bars | G `tokens.css` (`yellow-500`), BT `--color-galaxy-gold` |
| `gx-gold-dark` | `#d19e00` | Gold as a line on light ground | BT `--color-galaxy-gold-dark` |
| `gx-hl` | `#fff489` | Highlighter fill | G `tokens.css` (`yellow-300`) |
| `gx-page` | `#edf4fa` | Poster background | BT `--color-light-bg`, H `DESIGN.md` |
| `gx-slip` | `#ffffff` | Cards and panels | H `DESIGN.md` (`bg-white` cards) |
| `gx-tint` | `#f1f9fe` | Inner boxes in diagrams | G `tokens.css` (`blue-100`) |
| `gx-tape` | `#cde0f0` | Pale accent fill: chips, tags, tape | BT `--color-bay-of-many-200` |
| `gx-grid` | `#daecf8` | Background grid, minor lines | G `tokens.css` (`blue-200`) |
| `gx-grid-major` | `#aecce7` | Background grid major lines, edges of pale fills | BT `--color-bay-of-many-300` |
| `gx-rule` | `#dee2e6` | Dividers, dot leaders, hairlines | G `tokens.css`, G `blue.scss` (`$brand-secondary`) |
| `gx-grey` | `#58585a` | Secondary ink: affiliations, captions, references | BT `--color-galaxy-grey` (the logo's grey) |
| `gx-shadow` | `#c9d6e3` | Card shadow | Derived: `gx-page` darkened about 10% |
| `gx-danger` | `#e31a1e` | Failure or negative status | G `blue.scss`, G `tokens.css` |
| `gx-ok` | `#006f50` | Success or positive status | G `tokens.css` (`green-700`). Brand green `#66cc66` is too light to print. |

## Canvas and size floors

- The floors assume a 44 in square print canvas: all text ≥ 24 pt, body ≥ 28 pt, hero ≥ 100 pt. On another canvas, scale them with its width.
- Check the render at the size people will see it, as well as full size. A poster in a PR description is read as a downscaled image, so the hero and section heads must survive that.
- Atkinson sets slightly wide. Check every text box for overflow on each render.

## Contrast and greyscale

- **Contrast.**
  - `gx-dark` on `gx-page` is about 12:1, and `gx-primary` on white about 7.8:1. Both are safe for body text.
  - `gx-gold` on white is only about 1.4:1. Never set text in it on a light ground. Use `gx-gold-dark` for lines only, and set any text in `gx-dark`.
  - On `gx-dark`, gold is about 9:1 and works well for hero text.
- **Pairs that collapse in greyscale.**
  - `gx-dark` and `gx-primary` become one grey. Annotations keep their difference through the handwritten font, not their color.
  - `gx-danger` and `gx-ok` are both mid-grey. Status marks carry their word (PASS, FAIL), not just their color.
  - `gx-hl`, `gx-tape` and `gx-page` all read as near-white. The highlighter only shows on white, and pale fills need a 1.2 pt `gx-grid-major` edge.
  - `gx-gold` sits at about 80% luminance and reads as light grey, so it can't be the only thing marking an element.
- **If printing.** `#ffd700` is at the edge of CMYK gamut and prints slightly duller; ask the printer for a proof.

## Type

| Use | Font | License |
|---|---|---|
| Title and body | **Atkinson Hyperlegible**, 400 and 700. Galaxy's UI font and the Hub's only font. | OFL 1.1, Google Fonts or `@fontsource/atkinson-hyperlegible` |
| Mono | **Atkinson Hyperlegible Mono**, IBM Plex Mono as fallback. Galaxy's own Monaco/Menlo stack is proprietary. | OFL 1.1, Google Fonts |
| Annotations | **Kalam**, inked in `gx-primary`. Galaxy has no handwriting face. | OFL, Google Fonts |

- The title is Atkinson 700 with tight tracking (−0.02em), as in the Hub's heroes.
- Bundle the font files the poster uses in its `fonts/`, with their OFL texts.

## Surfaces

- **Masthead band.** The Hub's signature move.
  - A full-bleed band with a 135° gradient from `gx-dark` to `gx-primary`.
  - A grid over it in 3% white: at poster scale, a 0.5 in grid of 1 pt lines.
  - A gold bar 0.25 in thick along its bottom edge.
  - The title in white. The hero word in `gx-gold`, unhighlighted. A short vertical gold accent bar before the title.
  - The thesis line under the title, white Atkinson 400 at ≥ 40 pt, or Kalam in `gx-gold` for a handwritten feel.
- **Footer band.** Flat `gx-deep`, references in white at ≥ 24 pt.
- **Cards.**
  - White, 0.25 in radius, a soft `gx-shadow` offset 0.08 in.
  - No outline, or 1 pt `gx-rule`.
  - Featured cards get a 0.12 in gold left bar.
  - Card titles in `gx-dark` Atkinson 700.
- **Corner radii.** Cards and panels 0.25 in (the Hub's `rounded-lg`). Small boxes and badges 0.08 in.
- **Background.** `gx-page` with a 0.25 in grid in `gx-grid`, major lines in `gx-grid-major`.
- **Icons.** Lucide-style line icons, 2 pt stroke, round caps, and only where an icon already exists for the idea.
- **Galaxy logo.** Once, small, in the masthead or author block.
  - White wordmark: `galaxy-hub/content/images/galaxy_logo_white.svg`. On light ground: `galaxy_logo.svg`.
  - Copy it into the poster's `assets/` and embed it as vector.
  - Don't recolor, stretch, rasterize or repeat it, and don't let it outweigh the title.

## Elements

- **Annotations.** Kalam in `gx-primary`, with leader arrows in the same color at 2.5 pt.
- **Highlighter.** `gx-hl` fill, on white only. On the masthead, color the word in `gx-gold` instead.
- **Status marks** (badges, stamps, check marks). `gx-ok` for success, `gx-danger` for failure, always with the word. Never gold.
- **Numbered badges.** A `gx-primary` circle with white Atkinson 700 numerals.
- **Diagrams.**
  - Spines and flow lines `gx-primary` at 4 pt.
  - Open nodes white with a `gx-primary` ring. Key nodes (gates, decisions) filled `gx-dark`, ringed in gold.
  - Boxes `gx-tint` with a 0.08 in radius. At most one key box in `gx-gold` with `gx-dark` text.
- **Author block.** Authors in `gx-dark` Atkinson 700, affiliations in `gx-grey` 400. Inside the masthead in white if there's room, otherwise on `gx-page` under the gold bar.
- **QR codes.** Black modules on a white tile, 0.25 in radius, 4-module quiet zone, caption in `gx-dark` at ≥ 24 pt. Never in brand colors.
- **Paper motifs**, only if the concept uses them:
  - Slips and receipts: white, square corners, torn or zig-zag edges, a 0.06 in `gx-primary` strip along the top, `gx-shadow`, ink `gx-dark`, dot leaders `gx-rule`.
  - Tape: `gx-tape`, fully opaque, with a 1.2 pt `gx-grid-major` edge.
  - Stamps: status marks, rotated, with a double border.

## Typst tokens

```typst
// ---------- Galaxy style tokens ----------
#let paper        = rgb("#edf4fa")   // gx-page
#let grid-minor   = rgb("#daecf8")
#let grid-major   = rgb("#aecce7")
#let slip         = rgb("#ffffff")
#let tint         = rgb("#f1f9fe")
#let ink          = rgb("#2c3143")   // gx-dark
#let ink-deep     = rgb("#1a1f2e")
#let ink-soft     = rgb("#58585a")   // gx-grey
#let pen          = rgb("#25537b")   // gx-primary
#let info         = rgb("#197cd2")
#let gold         = rgb("#ffd700")
#let gold-dark    = rgb("#d19e00")
#let hl-col       = rgb("#fff489")
#let tape-col     = rgb("#cde0f0")
#let tape-edge    = rgb("#aecce7")
#let rule-col     = rgb("#dee2e6")
#let shadow-col   = rgb("#c9d6e3")
#let danger       = rgb("#e31a1e")
#let ok           = rgb("#006f50")
#let mast-grad    = gradient.linear(ink, pen, angle: 45deg) // CSS 135°
#let mast-grid    = rgb(255, 255, 255, 8)

#let sans    = ("Atkinson Hyperlegible", "IBM Plex Sans")
#let display = sans                  // weight: "bold", tracking: -0.02em
#let mono    = ("Atkinson Hyperlegible Mono", "IBM Plex Mono")
#let hand    = "Kalam"

#let r-card  = 0.25in
#let r-small = 0.08in
#let hl(body, top: "x-height") = highlight(fill: hl-col, extent: 3pt,
  top-edge: top, bottom-edge: "descender", body)
```

CSS 135° runs top-left to bottom-right. Typst's `angle` is measured clockwise from left-to-right, so `45deg` should match; confirm it on one render.

## CSS tokens

For HTML or SVG posters.

```css
:root {
  --gx-dark: #2c3143;  --gx-deep: #1a1f2e;  --gx-primary: #25537b;  --gx-info: #197cd2;
  --gx-gold: #ffd700;  --gx-gold-dark: #d19e00;  --gx-hl: #fff489;
  --gx-page: #edf4fa;  --gx-slip: #ffffff;  --gx-tint: #f1f9fe;  --gx-tape: #cde0f0;
  --gx-grid: #daecf8;  --gx-grid-major: #aecce7;  --gx-rule: #dee2e6;
  --gx-grey: #58585a;  --gx-shadow: #c9d6e3;  --gx-danger: #e31a1e;  --gx-ok: #006f50;

  --gx-mast: linear-gradient(135deg, var(--gx-dark) 0%, var(--gx-primary) 100%);
  --gx-sans: "Atkinson Hyperlegible", "IBM Plex Sans", sans-serif;
  --gx-mono: "Atkinson Hyperlegible Mono", "IBM Plex Mono", monospace;
  --gx-hand: "Kalam", cursive;
  --gx-r-card: 0.25in;  --gx-r-small: 0.08in;
}
```

## Do and don't

- **Do** use gold only on the masthead bar, the hero word, featured-card bars and key-node rings: about 3 per region.
- **Do** use Atkinson everywhere except annotations.
- **Do** check overflow on every render.
- **Don't** set gold text on a light ground.
- **Don't** use `#66cc66` green or gold for status marks.
- **Don't** use the Hub's shadcn OKLch greys. Brand tokens only.
- **Don't** use semi-transparent fills outside the masthead grid. Keep every token opaque for print.
- **Don't** depend on color alone to tell annotations from body text, or success from failure.
