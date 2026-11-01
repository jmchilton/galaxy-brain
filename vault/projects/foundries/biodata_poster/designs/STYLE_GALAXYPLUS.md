# Galaxy+ style: Galaxy, with a supernova

## Concept

Galaxy+ is `STYLE_GALAXY.md` turned up a notch. The Hub's navy-to-primary masthead becomes a deep-space band, lit from one corner by a vector nebula glow. A single signature accent, **nova** (hot orange), runs alongside Galaxy gold, so the warm end of the palette reads as a star core. The shape language is the **orbit**: thin elliptical rings sweep behind the masthead and section heads, a nod to the Galaxy logo and to the Orbit paper. Route spines become orbit arcs where the layout allows. Receipts stay white, square and torn, but each one now carries a gold-to-nova "thermal" strip. Everything below the masthead stays calm Galaxy blue on pale paper, so the poster still reads as a scientific poster. The splash lives in three places: the masthead, the hero word, and one orbit swoosh per poster.

**Feel:** *luminous, orbital, confident.*

## Palette

Every token in `STYLE_GALAXY.md` is kept with the same hex values. Galaxy+ adds or overrides these:

| Token | Hex | Role |
|---|---|---|
| `gx-space` | `#121629` | Masthead base, darker than `gx-deep`; the nebula's night |
| `gx-dark` | `#2c3143` | Body ink and headings (kept) |
| `gx-primary` | `#25537b` | Pen, links, route spine (kept) |
| `gx-info` | `#197cd2` | Nebula mid-glow, orbit rings on light ground |
| `gx-gold` | `#ffd700` | Hero word (gradient start), masthead bar, gate rings (kept) |
| **`gx-nova`** | `#ff6a2b` | **Signature accent.** Hero gradient end, receipt thermal strip, the one orbit swoosh, numbered badges on featured cards |
| `gx-nova-dark` | `#c2410c` | Nova as text or a thin line on light ground (4.9:1 on white) |
| `gx-glow` | `#3b6fd6` | Nebula inner glow (radial centre) |
| `gx-orbit` | `#aecce7` | Orbit rings on `gx-page` (= `gx-grid-major`) |
| `gx-page` | `#edf4fa` | Poster ground (kept) |
| `gx-slip` | `#ffffff` | Receipts and cards (kept) |
| `gx-danger` / `gx-ok` | `#e31a1e` / `#006f50` | Stamps (kept) |

**Print and greyscale**
- Gold, nova and gold-dark all collapse to mid-light grey. The hero word keeps its weight (Atkinson 700 at ≥ 100 pt), so it still dominates in greyscale.
- Never set nova text smaller than 40 pt on white; use `gx-nova-dark` for 24–40 pt.
- Nova (`#ff6a2b`) is inside CMYK gamut (about 0/70/90/0). Gold is still at the gamut edge, so ask for a proof.
- Nebula gradients must stay ≥ 3 stops apart in lightness. Typst writes PDF shading objects, which RIPs handle well; there is no raster.
- The nova strip and the `gx-danger` stamp are both warm. Keep stamps double-bordered and rotated so they never read as a strip.
- Keep every fill opaque except the masthead grid and orbit rings (alpha ≤ 25%, flattened over a known ground).

## Type

| Use | Stack | Source |
|---|---|---|
| Title / hero | `("Atkinson Hyperlegible Next", "Atkinson Hyperlegible")`, weight 800 (or 700), tracking −0.03em | OFL. Next: Braille Institute site or Google Fonts (variable, weights 200–800). Classic: Google Fonts. |
| Body | `("Atkinson Hyperlegible Next", "Atkinson Hyperlegible")`, 400 / 700 | as above |
| Kicker / section labels | `("Atkinson Hyperlegible Mono", "IBM Plex Mono")`, 700, tracking +0.18em, all caps | OFL, Google Fonts |
| Mono (receipts) | `("Atkinson Hyperlegible Mono", "IBM Plex Mono")` | OFL, Google Fonts |
| Pen notes | `"Kalam"` | OFL, already in `fonts/` |

The splash in type is the hero's extra weight (800) and the spaced mono kicker above it ("GALAXY WORKFLOW FOUNDRY"). If Next is missing, Typst falls back to classic Atkinson 700, which is fine. Floors are unchanged: text ≥ 24 pt, body ≥ 28 pt, hero ≥ 100 pt. Re-run the overflow guards.

## Texture and effects

All of these are vector. They need Typst ≥ 0.13 for `tiling` (earlier versions call it `pattern`).

**1. Nebula masthead.** A flat `gx-space` band, a radial glow from the top right, and a second faint nova glow from the bottom left.
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

**2. Star-dot halftone.** This is a tiling of dots, used only on the masthead, at 8% white.
```typst
#let stars = tiling(size: (0.5in, 0.5in))[
  #place(dx: 0.1in, dy: 0.12in, circle(radius: 1.2pt, fill: rgb(255,255,255,30)))
  #place(dx: 0.36in, dy: 0.38in, circle(radius: 0.7pt, fill: rgb(255,255,255,20)))
]
// place(rect(width: w, height: h, fill: stars))
```

**3. Orbit rings.** Two or three ellipses, rotated, stroked thin and clipped by the band. Use them on light ground once per poster, in `gx-orbit`.
```typst
#let orbit(w, h, col: rgb(255,255,255,40), angle: -12deg) = rotate(angle, reflow: false,
  ellipse(width: w, height: h, stroke: 1.5pt + col))
// one swoosh: an arc, as a curve with a nova stroke and round caps
#let swoosh(..pts) = curve(stroke: (paint: nova, thickness: 6pt, cap: "round"), ..pts)
```

**4. Hero gradient text.**
```typst
#let hero-grad = gradient.linear(gold, nova, angle: 0deg)
#let hero-mark(body) = text(fill: hero-grad, weight: 800, body)
```
Set the gradient relative to the parent box if each glyph starts the gradient again. Typst's default is `relative: "auto"`, which is per-glyph for text; pass `gradient.linear(..., relative: "parent")` instead.

**5. Receipt thermal strip.** This strip runs along the top edge of each slip.
```typst
#let thermal = gradient.linear(gold, nova)
// place(top, rect(width: 100%, height: 0.08in, fill: thermal))
```

**6. Vignette.** This is a faint radial darkening at the poster corners, `gx-page` to `#dde8f2`, applied once as the page fill. Skip it if the grid already gives enough texture.
```typst
#let page-fill = gradient.radial(paper, paper, rgb("#dde8f2"), center: (50%, 40%), radius: 85%)
```

**7. Grain.** Don't use noise. If the page feels flat, use the existing 0.25 in grid. Galaxy+ adds no extra texture below the masthead.

## Element mapping

- **Receipts.** White, square, with the same torn or zig-zag foot. Ink is `gx-dark`, leaders `gx-rule`. A 0.08 in gold→nova thermal strip replaces Galaxy's primary strip. The header word is Atkinson Mono 700. The shadow is `gx-shadow`, offset 0.08 in. The `SIGNED` line's highlight stays `gx-hl`.
- **Tape.** `gx-tape` with a `gx-grid-major` edge, as in Galaxy. Splash: **one** tape strip per poster, on the hero receipt, is nova at full opacity with a `gx-nova-dark` edge. That makes it the "this one matters" mark.
- **Pen notes.** Kalam in `gx-primary`. Numbered note circles become a filled `gx-primary` disc with white numerals. On the single featured note (for example "Rails, not reminders"), the disc is nova.
- **`hl()`.** `gx-hl` fill, `top-edge: "x-height"`, bottom edge as each poster has it now. On the masthead, there is no highlight; use `hero-mark()` instead.
- **Stamps.** `gx-ok` / `gx-danger`, double border, rotated. Never nova or gold.
- **Title slip.** It becomes the nebula masthead: full bleed, with stars, 2 orbit rings in white at 15%, and a 0.25 in gold bar at its foot that fades to nova over its last third (`gradient.linear(gold, gold, nova)`). The kicker is mono, spaced, in `gx-gold`. The title is white Atkinson 800; the hero word uses `hero-mark()`. The pen thesis is Kalam in `#cde0f0` (`gx-tape`) at ≥ 40 pt.
- **Author block.** Inside the masthead, under the title: authors in white 700, affiliations in `gx-tape` 400 at 24 pt. If it doesn't fit, put it on `gx-page` under the bar, in `gx-dark` / `gx-grey`.
- **QR codes.** Black on a white tile, 0.25 in radius, 4-module quiet zone. The `[[QR: live results]]` tile in the masthead is a white tile with a nova 3 pt ring: the only colored ring. Never color the modules.
- **Boxes and cards.** White, 0.25 in radius, `gx-shadow`. Section kickers are spaced mono in `gx-nova-dark`, and titles are Atkinson 700 in `gx-dark`. Featured cards get a 0.12 in left bar with a vertical gold→nova gradient. Use at most 2 featured cards.
- **Route lines and diagrams.** Spine `gx-primary`, 4 pt. Gates are filled `gx-dark` discs ringed in gold. The **loop station** (draft loop ×7) gets a nova orbit ring drawn around it, an ellipse at 2.5 pt. Where the geometry allows, the paper and Nextflow lanes join the spine as arcs, not elbows. The "Workflow brief" box is gold with `gx-dark` text, as in Galaxy.
- **Machine diagrams** (Notes → Mold → Cast → Skill). These are `gx-tint` boxes. The **cast** arrow is the one place a nova arrow appears in the body.
- **Footer.** `gx-deep` band with the references in white. Optionally, one orbit ring mirrors the masthead.

**Budget.** Use nova in about 5 places per poster: the hero gradient end, the thermal strips (these count once), one tape strip, one featured badge or card bar, and the loop ring or cast arrow. Gold keeps the Galaxy budget of about 3 per region.

## Typst token block

```typst
// ---------- Galaxy+ style tokens ----------
#let paper        = rgb("#edf4fa")
#let grid-minor   = rgb("#daecf8")
#let grid-major   = rgb("#aecce7")
#let slip         = rgb("#ffffff")
#let tint         = rgb("#f1f9fe")
#let ink          = rgb("#2c3143")
#let ink-deep     = rgb("#1a1f2e")
#let ink-soft     = rgb("#58585a")
#let space        = rgb("#121629")
#let pen          = rgb("#25537b")
#let info         = rgb("#197cd2")
#let glow         = rgb("#3b6fd6")
#let gold         = rgb("#ffd700")
#let gold-dark    = rgb("#d19e00")
#let nova         = rgb("#ff6a2b")
#let nova-dark    = rgb("#c2410c")
#let hl-col       = rgb("#fff489")
#let tape-col     = rgb("#cde0f0")
#let tape-edge    = rgb("#aecce7")
#let tape-hot     = nova
#let orbit-col    = rgb("#aecce7")
#let rule-col     = rgb("#dee2e6")
#let shadow-col   = rgb("#c9d6e3")
#let stamp-ink    = rgb("#e31a1e")
#let stamp-ok     = rgb("#006f50")
#let ochre        = gold-dark                        // legacy alias
#let hero-grad    = gradient.linear(gold, nova, relative: "parent")
#let thermal      = gradient.linear(gold, nova)
#let bar-grad     = gradient.linear(gold, gold, nova)
#let feat-bar     = gradient.linear(gold, nova, angle: 90deg)
#let mast-white   = rgb(255, 255, 255, 38)           // orbit rings, grid on masthead

#let sans    = ("Atkinson Hyperlegible Next", "Atkinson Hyperlegible", "IBM Plex Sans")
#let display = sans                                  // weight: 800, tracking: -0.03em
#let mono    = ("Atkinson Hyperlegible Mono", "IBM Plex Mono")
#let hand    = "Kalam"

#let r-card  = 0.25in
#let r-small = 0.08in
#let hl(body, top: "x-height") = highlight(fill: hl-col, extent: 3pt,
  top-edge: top, bottom-edge: "descender", body)
#let hero-mark(body) = text(fill: hero-grad, weight: 800, body)
```

## Ranking for Galaxy+

1. **receipts-spike-r4.** The diagonal route is already an orbit-ready arc, and the two-line hero ("Programs **sign off**.") is a perfect gradient word.
2. **receipts-trad-header-footer.** Its full-width route band is where an orbit spine and a nova loop ring pay off most. The header and footer card bands map directly onto the masthead and footer.
3. **skills-are-binaries-receipt-r4.** The 20-ray fan from one note reads as a starburst, which is the natural splash moment; "**binaries**" is a strong hero word.
4. **known-unknowns-receipt-r4.** The burn-down 31 → 0 and the route band suit a nebula masthead, and "Rails" makes a good featured note. It is dense, though, so the splash must stay in the masthead.
5. **receipts-side-by-side-r4.** It has a good hero word ("receipts"), but the machine row is a straight band with little room for orbit shapes.
6. **receipts-trad-columns.** It is clean and academic. Galaxy+ adds little beyond the masthead, and plain Galaxy suits it better.
7. **receipts-trad-three-col.** It has many cards competing, and nova would fragment into card bars.
8. **typed-not-guessed-receipt-r4.** Its thesis slip sits apart from the title, its embedded raster crops (the metro map and the editor graph) clash with the nebula, and its many stamps would compete with nova.

**Top 4 to see:** receipts-spike-r4, receipts-trad-header-footer, skills-are-binaries-receipt-r4, known-unknowns-receipt-r4.
