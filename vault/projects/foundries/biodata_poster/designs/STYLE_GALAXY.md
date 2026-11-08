# Galaxy style: theme guide for the round-5 posters

This guide re-themes the 8 round-5 drafts from the **Claude style** (warm paper, navy pen, red stamp, cream tape) to Galaxy's own look. Content, geometry, receipts and tape stay. Only tokens, fonts and surface treatments change.

Sources:
- **G**: `galaxy/client` at `1e6125acd93` (2026-10-20).
- **H**: `galaxy-hub/astro` at `ef2206269` (2026-10-29).
- **BT**: `@galaxyproject/brand-tokens@0.1.0` `theme.css`, the package the Hub imports at `H src/styles/global.css:6`. It is not installed locally, so it was read from unpkg.

## Palette

| Token           | Hex       | Role                                                            | Source                                                                                          |
| --------------- | --------- | --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `gx-dark`       | `#2c3143` | Masthead band, headings, receipt ink                            | G `theme/blue.scss:9` (`$brand-dark`); G `tokens.css:22` (`blue-700`); BT `--color-galaxy-dark` |
| `gx-deep`       | `#1a1f2e` | Footer band, darkest ink                                        | H `DESIGN.md:492`                                                                               |
| `gx-primary`    | `#25537b` | Pen notes, links, filled route stations, table heads            | G `blue.scss:2`; G `tokens.css:23` (`blue-600`); BT `--color-galaxy-primary`                    |
| `gx-info`       | `#197cd2` | Secondary accent for route lines and numbered badges            | G `tokens.css:24` (`blue-500`)                                                                  |
| `gx-gold`       | `#ffd700` | The one accent: masthead underline, hero mark, card accent bars | G `tokens.css:54` (`yellow-500`); BT `--color-galaxy-gold`; H `DESIGN.md:28`                    |
| `gx-gold-dark`  | `#d19e00` | Gold used as a line or text on light ground                     | BT `--color-galaxy-gold-dark`                                                                   |
| `gx-hl`         | `#fff489` | Highlighter fill for `hl()`                                     | G `tokens.css:56` (`yellow-300`)                                                                |
| `gx-page`       | `#edf4fa` | Poster background                                               | BT `--color-light-bg`; H `DESIGN.md:513`                                                        |
| `gx-slip`       | `#ffffff` | Receipts and cards                                              | H `DESIGN.md:515` (`bg-white` cards)                                                            |
| `gx-tint`       | `#f1f9fe` | Inner boxes in diagrams                                         | G `tokens.css:28` (`blue-100`)                                                                  |
| `gx-tape`       | `#cde0f0` | Tape strips                                                     | BT `--color-bay-of-many-200`                                                                    |
| `gx-grid`       | `#daecf8` | Background grid, minor lines                                    | G `tokens.css:27` (`blue-200`)                                                                  |
| `gx-grid-major` | `#aecce7` | Background grid, major lines                                    | BT `--color-bay-of-many-300`                                                                    |
| `gx-rule`       | `#dee2e6` | Receipt dot leaders and dividers                                | G `tokens.css:37`; G `blue.scss:3` (`$brand-secondary`)                                         |
| `gx-grey`       | `#58585a` | Secondary ink: affiliations, captions, references               | BT `--color-galaxy-grey`; the logo's grey, `#58595B`                                            |
| `gx-shadow`     | `#c9d6e3` | Card and receipt drop shadow                                    | Derived: `gx-page` darkened by about 10%, in the spirit of `blue.scss:30-32`                    |
| `gx-danger`     | `#e31a1e` | Stamp ink for FAIL and REFUSED                                  | G `blue.scss:7`; G `tokens.css:72`                                                              |
| `gx-ok`         | `#006f50` | Stamp ink for PASS and VALIDATED                                | G `tokens.css:42` (`green-700`). The brand green `#66cc66` is too light to print.               |

### Print and greyscale

- **Contrast.**
  - `gx-dark` on `gx-page` gives about 12:1, and `gx-primary` on white about 7.8:1, so both are safe for 24 pt text.
  - `gx-gold` on white gives only about 1.4:1. Never set text in it on a light ground. On light grounds, use `gx-gold-dark` for lines only, and set any text in `gx-dark`.
  - On `gx-dark`, gold gives about 9:1 and works well for hero text.
- **Pairs that collapse in greyscale.**
  - `gx-dark` and `gx-primary`: the pen note and the body ink become one grey. Pen notes keep their difference through the handwritten font, not their color.
  - `gx-danger` and `gx-ok`: the stamps are mid-grey either way. Keep the stamp's word (PASS or FAIL) and its double border.
  - `gx-hl`, `gx-tape` and `gx-page`: all read as near-white. The highlighter only shows on a white slip, and tape needs its 1.2 pt `gx-grid-major` edge stroke.
  - `gx-gold` and `gx-ok`: the brand gold sits at about 80% luminance.
- **Saturation.** `#ffd700` sits at the edge of CMYK gamut and prints slightly duller. Ask the printer for a proof.

## Type

| Use | Font | License | Get it |
|---|---|---|---|
| Title and body | **Atkinson Hyperlegible**, weights 400 and 700 | OFL 1.1, embeddable | Google Fonts or `@fontsource/atkinson-hyperlegible`. It is Galaxy's UI font (G `blue.scss:87`) and the Hub's only font (H `global.css:4-5`, `DESIGN.md:547`). |
| Mono (receipts) | **Atkinson Hyperlegible Mono**, with IBM Plex Mono as fallback | OFL 1.1 | Google Fonts. Galaxy's own mono stack is Monaco and Menlo (G `blue.scss:99`), which are proprietary, so they are not used. |
| Pen notes | **Kalam**, as now | OFL | Already in each poster's `fonts/`. Galaxy has no handwriting face, so keep Kalam and ink it in `gx-primary`. |

- **Weights.** Archivo Black goes. The Hub's heroes are Atkinson 700 with tight tracking (`tracking-tight`, H `DESIGN.md:87`). For the title, use `weight: "bold"` with `tracking: -0.02em`.
- **Fonts folder.** Add `AtkinsonHyperlegible-{Regular,Bold,Italic,BoldItalic}.ttf` and `AtkinsonHyperlegibleMono-{Regular,Bold}.ttf` to each poster's `fonts/`, with their OFL texts.
- **Size floors.** These are unchanged: all text ≥ 24 pt, body ≥ 28 pt, hero ≥ 100 pt. Atkinson sets slightly wider than Plex Sans, so re-run each poster's overflow guards after the swap.

## Motifs and shapes

- **Masthead band.** This is the signature Hub move: H `DESIGN.md:147-148` and `:618`.
  - The title area is a full-bleed band with a 135° gradient from `gx-dark` to `gx-primary`.
  - Lay a 24 px grid over it in 3% white (H `global.css:157-161`). At poster scale, that is a 0.5 in grid of 1 pt lines in `rgb(255,255,255,8)`.
  - Close the band with a gold bar 0.25 in thick along its bottom edge.
  - The title is white. The hero mark ("receipts") is in `gx-gold`, unhighlighted (H `DESIGN.md:622`). A short vertical gold accent bar sits before the title.
- **Footer band.** A flat `gx-deep` band carries the references in white at 24 pt.
- **Cards** (the trad posters):
  - white, with a 0.25 in radius;
  - a soft shadow offset 0.08 in, in `gx-shadow`;
  - no outline, or 1 pt in `gx-rule`;
  - featured cards get a 0.12 in gold left bar, `border-l-4` (H `DESIGN.md:620`);
  - card titles are `gx-dark` in Atkinson 700.
- **Corner radii.** Cards and slips use 0.25 in (Hub `rounded-lg`, H `DESIGN.md:462`). Small boxes and badges use 0.08 in (G `blue.scss:148-150`). Receipts stay square, because they are paper.
- **Icons.** Use Lucide-style line icons with a 2 pt stroke and round caps (H `DESIGN.md:30`), and only where an icon already exists.
- **Galaxy logo.** Use it once, small, in the masthead or the author block.
  - The white wordmark is at `galaxy-hub/content/images/galaxy_logo_white.svg`; the color one, on light ground, is `galaxy_logo.svg`.
  - Copy it into `assets/` and embed it with `image("assets/galaxy_logo_white.svg")` so it stays vector.
  - Don't recolor or stretch it, and don't let it outweigh the title.

## Element mapping

- **Receipts.**
  - Keep the torn and zig-zag edges and the square corners.
  - The fill becomes `gx-slip`, the ink `gx-dark`, the dot leaders `gx-rule`, and the header word `gx-dark` in Atkinson Mono Bold.
  - Add a 0.06 in `gx-primary` strip along the top edge of the slip, under the tear, as a "Galaxy receipt printer" mark.
  - The shadow becomes `gx-shadow`.
- **Tape.** Keep the strips, angles and placement. Fill them with `gx-tape` at full opacity and give them a 1.2 pt `gx-grid-major` edge. Optionally, cut a few saw-tooth notches at the ends.
- **Pen notes.** Keep Kalam, inked in `gx-primary`. Leader arrows use the same color at 2.5 pt.
- **`hl()`.** The fill becomes `gx-hl`. On the dark masthead, use no highlight; color the word in `gx-gold` instead.
- **Stamps.**
  - Keep the rotation, the double border and the size.
  - The ink is `gx-ok` for PASS, VALIDATED and SIGNED, and `gx-danger` for FAIL and REFUSED.
  - Don't use gold for stamps.
- **Title slip.** It becomes the masthead band (see Motifs). The thesis line sits under the title in white Atkinson 400 at 40 pt or more, or in Kalam `gx-gold` for a pen feel.
- **Author block.**
  - Authors are `gx-dark` Atkinson 700; affiliations are `gx-grey` 400.
  - It goes inside the masthead in white if there is room; otherwise it goes on `gx-page` directly under the gold bar.
- **QR codes.** Black modules on a white tile with a 0.25 in radius and a quiet zone of 4 modules. Captions are `gx-dark` at 24 pt or more. Don't print the QR in brand colors.
- **Numbered section badges.** A `gx-primary` circle with white Atkinson 700 numerals.
- **Route lines and diagrams.**
  - The spine is `gx-primary` at 4 pt.
  - Open stations are white with a `gx-primary` ring. Filled stations, the gates, are `gx-dark`, ringed in gold.
  - Boxes are `gx-tint` with a 0.08 in radius. The "Workflow brief" box is `gx-gold` with `gx-dark` text.
- **Background.** `gx-page` with the 0.25 in grid in `gx-grid` and `gx-grid-major`, as now.

## Typst token block

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
#let stamp-ink    = rgb("#e31a1e")   // FAIL / REFUSED
#let stamp-ok     = rgb("#006f50")   // PASS / VALIDATED
#let ochre        = gold-dark        // legacy alias
#let mast-grad    = gradient.linear(ink, pen, angle: 45deg) // 135° CSS, top-left to bottom-right
#let mast-grid    = rgb(255, 255, 255, 8)

#let sans    = ("Atkinson Hyperlegible", "IBM Plex Sans")
#let display = sans                  // use weight: "bold", tracking: -0.02em
#let mono    = ("Atkinson Hyperlegible Mono", "IBM Plex Mono")
#let hand    = "Kalam"

#let r-card  = 0.25in
#let r-small = 0.08in
```

The gradient's angle needs a check. CSS 135° runs from top-left to bottom-right, and Typst's `angle` is measured clockwise from left to right, so `45deg` should match. Confirm it on one render.

## Do and don't

- **Do** put gold only on the masthead bar, the hero mark, featured-card bars and gate rings: about 3 per region (H `DESIGN.md:632`).
- **Do** keep receipts square and torn, and keep tape on every slip.
- **Do** use Atkinson everywhere except the pen notes.
- **Do** re-run the overflow guards after the font swap.
- **Don't** set gold text on a light ground.
- **Don't** use `#66cc66` green or `#ffd700` gold as stamp ink.
- **Don't** use the Hub's shadcn OKLch greys. Brand tokens only (H `DESIGN.md:39-46`).
- **Don't** recolor, rasterize or repeat the Galaxy logo.
- **Don't** use semi-transparent fills outside the masthead grid. Keep every token opaque for print.
- **Don't** depend on color alone to separate the pen notes from the body.
