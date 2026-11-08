# Galaxy+ style: Galaxy, with a supernova

## Concept

Galaxy+ is [STYLE_GALAXY.md](STYLE_GALAXY.md) turned up a notch. Read that first: everything it says holds unless this guide overrides it.

- The navy-to-primary masthead becomes a deep-space band, lit from one corner by a vector nebula glow.
- One signature accent, **nova** (hot orange), runs alongside Galaxy gold, so the warm end of the palette reads as a star core.
- The shape language is the **orbit**, a nod to the Galaxy logo: thin elliptical rings sweep behind the masthead and section heads, and flow lines become arcs where the layout allows.
- Everything below the masthead stays calm Galaxy blue on pale paper, so the poster still reads as a scientific poster.
- The splash lives in three places: the masthead, the hero word, and one orbit swoosh per poster.

**Feel:** *luminous, orbital, confident.*

## Palette

Every Galaxy token keeps its hex value. Galaxy+ adds these:

| Token | Hex | Role |
|---|---|---|
| `gx-space` | `#121629` | Masthead base, darker than `gx-deep`; the nebula's night |
| **`gx-nova`** | `#ff6a2b` | **Signature accent.** Hero gradient end, the one swoosh, featured badges and bars |
| `gx-nova-dark` | `#c2410c` | Nova as text or a thin line on light ground (4.9:1 on white) |
| `gx-glow` | `#3b6fd6` | Nebula inner glow (radial centre) |
| `gx-orbit` | `#aecce7` | Orbit rings on `gx-page` (= `gx-grid-major`) |

`gx-info` (`#197cd2`) also takes on the nebula mid-glow.

## Contrast and greyscale

- Gold, nova and gold-dark all collapse to mid-light grey. The hero word keeps its weight (Atkinson 800 at ≥ 100 pt on the reference canvas), so it still dominates in greyscale.
- Never set nova text smaller than 40 pt on white; use `gx-nova-dark` for 24–40 pt.
- Nebula gradient stops must stay ≥ 3 stops apart in lightness.
- Nova accents and `gx-danger` status marks are both warm. Keep status marks double-bordered, labeled and rotated so they never read as an accent.
- Keep every fill opaque except the masthead stars, grid and orbit rings (alpha ≤ 25%, over a known ground).
- **If printing.** Nova (about 0/70/90/0 CMYK) is in gamut; gold is still at the edge, so ask for a proof. Typst writes vector PDF shadings, which RIPs handle well.

## Type

| Use | Stack | Source |
|---|---|---|
| Title and hero | `("Atkinson Hyperlegible Next", "Atkinson Hyperlegible")`, weight 800 (or 700), tracking −0.03em | OFL. Next: Braille Institute or Google Fonts (variable, 200–800). |
| Body | the same stack, 400 and 700 | as above |
| Kicker and section labels | `("Atkinson Hyperlegible Mono", "IBM Plex Mono")`, 700, tracking +0.18em, all caps | OFL, Google Fonts |
| Mono | `("Atkinson Hyperlegible Mono", "IBM Plex Mono")` | OFL, Google Fonts |
| Annotations | `"Kalam"` | OFL, Google Fonts |

The splash in type is the hero's extra weight (800) and the spaced mono kicker above it, usually the project or feature name. Without Next, classic Atkinson 700 is fine.

## Effects

All of these are vector. The Typst snippets need Typst ≥ 0.13 for `tiling` (earlier versions call it `pattern`). In HTML or SVG, build the same effects with radial gradients, SVG patterns and SVG ellipses.

**1. Nebula masthead.** A flat `gx-space` band, a radial glow from the top right, and a faint nova glow from the bottom left.
```typst
#let nebula(w, h) = {
  place(rect(width: w, height: h, fill: space))
  place(rect(width: w, height: h, fill: gradient.radial(
    glow, info.transparentize(60%), space.transparentize(100%),
    center: (85%, 15%), radius: 70%)))
  place(rect(width: w, height: h, fill: gradient.radial(
    nova.transparentize(70%), space.transparentize(100%),
    center: (5%, 100%), radius: 45%)))
}
```

**2. Star-dot halftone.** A tiling of dots in faint white, on the masthead only.
```typst
#let stars = tiling(size: (0.5in, 0.5in))[
  #place(dx: 0.1in, dy: 0.12in, circle(radius: 1.2pt, fill: rgb(255,255,255,30)))
  #place(dx: 0.36in, dy: 0.38in, circle(radius: 0.7pt, fill: rgb(255,255,255,20)))
]
// place(rect(width: w, height: h, fill: stars))
```

**3. Orbit rings.** Two or three rotated ellipses, stroked thin and clipped by the band. On light ground, once per poster, in `gx-orbit`.
```typst
#let orbit(w, h, col: rgb(255,255,255,40), angle: -12deg) = rotate(angle, reflow: false,
  ellipse(width: w, height: h, stroke: 1.5pt + col))
// one swoosh: an arc, as a curve with a nova stroke and round caps
#let swoosh(..pts) = curve(stroke: (paint: nova, thickness: 6pt, cap: "round"), ..pts)
```

**4. Hero gradient text.** Gold to nova across the whole word.
```typst
#let hero-grad = gradient.linear(gold, nova, relative: "parent")
#let hero-mark(body) = text(fill: hero-grad, weight: 800, body)
```
Without `relative: "parent"`, each glyph restarts the gradient.

**5. Vignette.** A faint radial darkening at the corners, applied once as the page fill. Skip it if the grid already gives enough texture.
```typst
#let page-fill = gradient.radial(paper, paper, rgb("#dde8f2"), center: (50%, 40%), radius: 85%)
```

**6. No grain.** Don't use noise. Galaxy+ adds no texture below the masthead beyond the Galaxy grid.

## Elements

Galaxy's elements apply, with these changes:

- **Masthead.** The nebula, full bleed, with stars and 2 orbit rings in white at 15%.
  - A 0.25 in gold bar at its foot that fades to nova over its last third.
  - The kicker in spaced mono, `gx-gold`.
  - The title in white Atkinson 800, with the hero word in `hero-mark()`.
  - The thesis line in Kalam, `gx-tape`, at ≥ 40 pt.
- **Author block.** Inside the masthead under the title: authors in white 700, affiliations in `gx-tape` 400. Otherwise on `gx-page` under the bar, in `gx-dark` and `gx-grey`.
- **Cards.** Section kickers in spaced mono, `gx-nova-dark`. Featured cards get a 0.12 in left bar with a vertical gold→nova gradient. At most 2 featured cards.
- **Annotations.** Numbered note circles are filled `gx-primary` discs with white numerals. The one featured note's disc is nova.
- **Diagrams.** Key nodes keep their gold ring. The one node or step the poster is about (the loop, the new piece) can get a nova orbit ring at 2.5 pt, or the one arrow that matters can be nova. Where the geometry allows, side lanes join the spine as arcs, not elbows.
- **QR codes.** As in Galaxy. The one QR the poster leads with can sit on a white tile with a 3 pt nova ring, the only colored ring. Never color the modules.
- **Status marks.** `gx-ok` and `gx-danger` only, never nova or gold.
- **Footer.** `gx-deep` with references in white. One orbit ring may mirror the masthead.
- **Paper motifs**, if the concept uses them: slips get a 0.08 in gold→nova "thermal" strip along the top in place of Galaxy's primary strip, and the one hero slip may carry a nova tape strip with a `gx-nova-dark` edge.

**Nova budget.** About 5 uses per poster: the hero gradient end, one swoosh, one featured card bar or badge, one featured note or node ring, and one hot tape strip or arrow. Repeated thermal strips count once. Gold keeps Galaxy's budget of about 3 per region.

## Typst tokens

Add to the Galaxy block, and swap in the Next stack:

```typst
// ---------- Galaxy+ additions ----------
#let space        = rgb("#121629")
#let glow         = rgb("#3b6fd6")
#let nova         = rgb("#ff6a2b")
#let nova-dark    = rgb("#c2410c")
#let tape-hot     = nova
#let orbit-col    = rgb("#aecce7")
#let hero-grad    = gradient.linear(gold, nova, relative: "parent")
#let thermal      = gradient.linear(gold, nova)
#let bar-grad     = gradient.linear(gold, gold, nova)
#let feat-bar     = gradient.linear(gold, nova, angle: 90deg)
#let mast-white   = rgb(255, 255, 255, 38)           // orbit rings, grid on masthead

#let sans    = ("Atkinson Hyperlegible Next", "Atkinson Hyperlegible", "IBM Plex Sans")
#let display = sans                                  // weight: 800, tracking: -0.03em

#let hero-mark(body) = text(fill: hero-grad, weight: 800, body)
```

## CSS tokens

Add to the Galaxy block:

```css
:root {
  --gx-space: #121629;  --gx-glow: #3b6fd6;  --gx-nova: #ff6a2b;  --gx-nova-dark: #c2410c;
  --gx-orbit: #aecce7;

  --gx-hero: linear-gradient(90deg, var(--gx-gold), var(--gx-nova)); /* background-clip: text */
  --gx-bar: linear-gradient(90deg, var(--gx-gold) 0%, var(--gx-gold) 66%, var(--gx-nova) 100%);
  --gx-feat-bar: linear-gradient(180deg, var(--gx-gold), var(--gx-nova));
  --gx-nebula:
    radial-gradient(circle at 85% 15%, var(--gx-glow), rgb(25 124 210 / 0.4) 35%, transparent 70%),
    radial-gradient(circle at 5% 100%, rgb(255 106 43 / 0.3), transparent 45%),
    var(--gx-space);
  --gx-sans: "Atkinson Hyperlegible Next", "Atkinson Hyperlegible", "IBM Plex Sans", sans-serif;
}
```
