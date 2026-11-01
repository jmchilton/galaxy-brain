# Old school: theme guide for the round-5 posters

## Concept

The poster is a shoebox of thermal receipts found ten years later. The paper has yellowed and the black has faded to a warm charcoal. The edges have gone brown where hands held them, and the whole sheet sits under a 2011 phone filter: lifted blacks, warm highlights, a soft vignette and a faint cyan-in-the-shadows cross-process. There is no colour accent apart from one faded stamp red and the highlighter, which is now a sun-bleached amber. Content, geometry, receipts and tape stay; only tokens, fonts and surfaces change. Navy pen becomes graphite-brown ink, and the grid becomes faint ledger ruling.

**Feel: faded, analog, kept.**

## Palette

| Token | Hex | Role |
|---|---|---|
| `os-page` | `#e9dfc4` | Poster ground (aged manila) |
| `os-page-edge` | `#cdbd96` | Vignette outer stop |
| `os-slip` | `#f4ebcf` | Receipts, cards, title slip (yellowed thermal) |
| `os-slip-burn` | `#e6d6a8` | Receipt foot/edge fade gradient stop |
| `os-ink` | `#2b2722` | All primary text: lifted black, never `#000` |
| `os-ink-soft` | `#5e574c` | Captions, affiliations, refs, dot leaders |
| `os-ink-fade` | `#8a8070` | Thermal "fade" text: timestamps, `SIGNED` label, dashed future stations |
| `os-pen` | `#3d3a4a` | Pen notes: graphite with a cold cast (the cross-process) |
| `os-rule` | `#bfb293` | Dividers, ledger ruling major |
| `os-rule-minor` | `#d9cdaf` | Ledger ruling minor |
| `os-hl` | `#e8c76a` | Highlighter (sun-faded amber) |
| `os-tape` | `#d8cba4` | Tape body (old masking tape) |
| `os-tape-edge` | `#c4b58a` | Tape end darkening |
| `os-shadow` | `#c2b38e` | Drop shadow under slips |
| `os-stamp` | `#8e3b32` | The one colour: faded rubber-stamp red (PASS, VOID, PROMOTED) |
| `os-cyan` | `#6f8a88` | Cross-process tint: vignette inner shadow, route-line tint only |
| `os-qr-ground` | `#fbf6e6` | Light panel behind QR codes |

### Print and greyscale

- `os-ink` on `os-slip` is about 12:1; `os-ink-soft` on `os-slip` about 6:1 (fine at 24 pt); `os-ink-fade` about 3.4:1, so only ≥ 28 pt bold or non-essential text.
- The whole palette is warm and near-neutral, so a greyscale proof shows little change. Check that `os-hl` (L ≈ 81) still separates from `os-slip` (L ≈ 93). It does, at about 12 L*.
- Large-format inkjet over-saturates yellows. Proof one 6×6 in swatch strip before the full run. If the ground goes mustard, drop `os-page` toward `#ebe4cf`.
- Don't use anything below `#2b2722` darkness except the QR modules, which use `os-ink` on `os-qr-ground`.

## Type

| Role | Stack | Source / licence |
|---|---|---|
| Title, hero (≥ 100 pt) | `("Courier Prime", "IBM Plex Mono")` bold, or `"Special Elite"` for the kicker only | Courier Prime: Google Fonts, OFL. Special Elite: Google Fonts, Apache 2.0 |
| Section heads, stamps | `("Oswald", "Archivo Narrow")` 600, letterspaced 0.06em | Google Fonts, OFL |
| Body (≥ 28 pt) | `("IBM Plex Serif", "Libre Caslon Text")` | Google Fonts / IBM GitHub, OFL |
| Mono / receipts (≥ 24 pt) | `("VT323", "IBM Plex Mono")`. VT323 is set about 1.25× size because its x-height is small, so use 34 pt for a 28 pt visual. Plex Mono stays the fallback for dense tables. | Google Fonts, OFL |
| Pen notes | `("Homemade Apple", "Kalam")`, or `"Reenie Beanie"` for a looser hand | Google Fonts, Apache 2.0 / OFL |

All of these are embeddable (OFL or Apache). Download them from fonts.google.com into `fonts/` and build with `typst compile --font-path fonts`.
If VT323 feels too pixel-y at poster scale, keep `IBM Plex Mono` and rely on the fade effects instead; this is the safest choice. Minimums are unchanged: text ≥ 24 pt, body ≥ 28 pt, hero ≥ 100 pt.

## Texture and effects (all vector)

1. **Vignette:** a radial gradient on the page background, from clear in the centre to `os-page-edge`, plus a faint cyan inner ring for the cross-process.
2. **Lifted blacks:** handled by the tokens; never use `black`.
3. **Thermal fade:** a vertical gradient on each slip, from `os-slip` to `os-slip-burn` at the foot, so receipts look as if they faded from the bottom.
4. **Halftone:** a `tiling` of small dots used as fills (bar charts, shadows, the hero mark backing). Keep dots ≥ 0.04 in so the RIP doesn't drop them.
5. **Grain:** a seeded set of about 600 tiny `os-ink` specks at 6% luminance difference, scattered once per slip. It is vector, deterministic and cheap.
6. **Ruling:** ledger lines replace the square grid (horizontal only, minor and major).

```typst
// 1 vignette (page background layer, add before content)
#let vignette(W) = {
  place(rect(width: W, height: W, fill: gradient.radial(
    (os-page, 0%), (os-page, 55%), (os-page-edge, 100%), radius: 75%)))
  place(rect(width: W, height: W, fill: gradient.radial(
    (os-cyan.transparentize(100%), 70%), (os-cyan.transparentize(88%), 100%), radius: 72%)))
}
// 3 thermal fade fill for slips
#let slip-fill = gradient.linear((os-slip, 0%), (os-slip, 70%), (os-slip-burn, 100%), angle: 90deg)
// 4 halftone tiling
#let halftone(c: os-ink-soft, s: 0.12in, r: 0.025in) = tiling(size: (s, s),
  place(dx: s/2 - r, dy: s/2 - r, circle(radius: r, fill: c)))
// 5 grain specks (seeded LCG; vector)
#let grain(w, h, n: 600, seed: 7) = {
  let x = seed
  for i in range(n) {
    x = calc.rem(x * 1103515245 + 12345, 2147483648)
    let px = calc.rem(x, 10000) / 10000
    x = calc.rem(x * 1103515245 + 12345, 2147483648)
    let py = calc.rem(x, 10000) / 10000
    place(dx: px * w, dy: py * h, circle(radius: 0.6pt, fill: os-ink.transparentize(90%)))
  }
}
// 6 ledger ruling
#let ruling(W, step: 0.5in) = for i in range(int(W / step)) {
  place(dy: i * step, line(length: W, stroke: if calc.rem(i, 4) == 0 { 0.8pt + os-rule } else { 0.5pt + os-rule-minor }))
}
```

Transparency is used only in the vignette and grain. If the print shop flattens badly, swap both for opaque mixes, e.g. a `color.mix((os-page, 90%), (os-cyan, 10%))` ring.

## Element mapping

- **Receipts:** `slip-fill` gradient, grain overlay, and `os-ink` VT323/Plex Mono text. Headers stay bold. Timestamps and the `SIGNED` label use `os-ink-fade`. Keep the torn zig edge, but use a finer, irregular tooth: alternate the step between 0.18 and 0.24 in, fill it with `os-slip-burn`, and give it a 1 pt `os-shadow` hairline below.
- **Tape:** an `os-tape` rect with a horizontal gradient to `os-tape-edge` at both ends. Rotation stays. Add a 0.5 pt `os-rule` outline at 40% so it reads as paper tape. Optionally, add halftone at 8% for texture.
- **Pen notes:** `os-pen` in Homemade Apple/Kalam. Keep the arrows, at 3 pt `os-pen` with round caps. Numbered circles are hand-drawn: `os-pen` stroke with no fill.
- **`hl()`:** the fill becomes `os-hl`, with `top-edge: "x-height"` and `bottom-edge: "descender"` kept. Hero mark: `os-hl` over a `halftone(c: os-stamp.lighten(60%))` backing for an aged-marker feel.
- **Stamps:** `os-stamp` Oswald 600, 3 pt double border (an outer and an inner rect, 4 pt apart), rotated as now. Optionally, a white halftone knockout over it for worn ink.
- **Title slip:** the largest receipt. Title in Courier Prime bold, `os-ink`, kicker in Special Elite `os-ink-soft` letterspaced, and a dotted rule beneath. Thermal fade at its foot.
- **Author block:** Plex Serif `os-ink`, affiliations `os-ink-soft`, set straight on the page (no slip), with a thin `os-rule` above.
- **QR codes:** modules `os-ink`, quiet zone `os-qr-ground` (opaque, no grain, no vignette over them), ≥ 2.5 in code, and a 1 pt `os-rule` frame. Test-scan them from a printed proof.
- **Boxes and cards:** an `os-slip` fill with a 1.5 pt `os-ink-soft` stroke, square corners, and an offset shadow `os-shadow` (0.12 in) instead of soft shadow. Inner diagram boxes use `os-page` fill.
- **Route lines and diagrams:** a 4 pt line in `color.mix((os-ink, 80%), (os-cyan, 20%))`. Filled (gate) stations use an `os-ink` fill with `os-slip` numerals. Open stations use an `os-slip` fill with an `os-ink` stroke. Future or dashed parts use `os-ink-fade`. Bar charts are filled with `halftone(c: os-ink)`.

## Token block

```typst
// ---------- old-school tokens ----------
#let os-page       = rgb("#e9dfc4")
#let os-page-edge  = rgb("#cdbd96")
#let os-slip       = rgb("#f4ebcf")
#let os-slip-burn  = rgb("#e6d6a8")
#let os-ink        = rgb("#2b2722")
#let os-ink-soft   = rgb("#5e574c")
#let os-ink-fade   = rgb("#8a8070")
#let os-pen        = rgb("#3d3a4a")
#let os-rule       = rgb("#bfb293")
#let os-rule-minor = rgb("#d9cdaf")
#let os-hl         = rgb("#e8c76a")
#let os-tape       = rgb("#d8cba4")
#let os-tape-edge  = rgb("#c4b58a")
#let os-shadow     = rgb("#c2b38e")
#let os-stamp      = rgb("#8e3b32")
#let os-cyan       = rgb("#6f8a88")
#let os-qr-ground  = rgb("#fbf6e6")

// drop-in aliases for the existing poster.typ names
#let paper      = os-page
#let slip       = os-slip
#let ink        = os-ink
#let ink-soft   = os-ink-soft
#let ink-faint  = os-ink-fade
#let pen        = os-pen
#let stamp-ink  = os-stamp
#let hl-col     = os-hl
#let tape-col   = os-tape
#let shadow-col = os-shadow
#let grid-minor = os-rule-minor
#let grid-major = os-rule
#let box-col    = os-page
#let ochre      = os-ink-fade   // placeholder dashes

#let display = "Courier Prime"
#let head    = "Oswald"
#let serif   = "IBM Plex Serif"
#let mono    = "IBM Plex Mono"   // or "VT323" at ~1.25x size
#let hand    = "Homemade Apple"  // fallback "Kalam"
#let tape-grad = gradient.linear((os-tape-edge, 0%), (os-tape, 15%), (os-tape, 85%), (os-tape-edge, 100%))
```

## Ranking (best fit to worst)

1. **receipts-spike-r4:** receipts hanging off a route line is the purest paper trail, and the faded slips carry the whole poster.
2. **known-unknowns-receipt-r4:** one huge statement receipt with a burn-down. The halftone bars and thermal fade suit it perfectly.
3. **receipts-side-by-side-r4:** two big receipts with stamps (NEVER HAND-EDITED, TYPED, VOID) show off the worn-stamp treatment.
4. **receipts-trad-header-footer:** taped cards around a chain of receipts reads like a scrapbook. The bands give the vignette a frame.
5. **skills-are-binaries-receipt-r4:** it is receipt-led, but its diagram-heavy right panel gains little from aging.
6. **typed-not-guessed-receipt-r4:** a good receipt, but the dense column text in serif-on-manila risks feeling muddy.
7. **receipts-trad-three-col:** the academic column grid fights the found-object feel. The style becomes a mere tint.
8. **receipts-trad-columns:** it has the most conventional boxes and diagrams, so old-school reads as "beige" rather than "aged".

**Most want to see:** spike-r4, known-unknowns-receipt-r4, side-by-side-r4, trad-header-footer.
