# Slides render polish 1 — workflow-step-params deck

Walked all 15 slides at 1280x933 (Playwright, `#/N`, 1.1s settle). Checked per slide: image size/legibility, overflow (offsetHeight vs scrollHeight, all <= 644 of 700), spacing, list formatting, heading wraps, notes hidden (all `display:none`).

## Per slide

| # (0-based) | Slide | Result |
|---|-------|--------|
| 0 | Cover | OK |
| 1 | Problem (cards + callout) | OK; heading wraps to 2 balanced lines |
| 2 | Proposal (flow) | OK |
| 3 | Tree picker | OK; text legible, fills to ref-link |
| 4 | Row details (2 crops) | **Fixed** — see below |
| 5 | Cards | OK; 2-line heading, image at 1:1, ends ~25px above bottom |
| 6 | Rerun (2 crops) | **Fixed** right image |
| 7 | Graph picker | Left: right-hand param list is ~8px at slide size (image 1246px wide, scaled 0.74x). Width-limited; empty canvas sits in the middle so sips can't crop it out without losing Close/Apply |
| 8 | Subworkflow lock | OK |
| 9 | Comparison | **Fixed** bullets missing; note leaves orphan "apart." (left) |
| 10 | Recommendation | **Fixed** list not centered, bullets missing, "G2 / + G4" break |
| 11 | Divider | OK |
| 12 | Payload code | OK; code-block-sm fits |
| 13 | API gaps | OK |
| 14 | Tests | OK |

## Changes

- **Bullets** (`SlideLayout.astro`): Tailwind preflight sets `list-style: none`, so every `ul.tight` lost its markers (slides 9, 10). Added rule scoped to `[data-deck='workflow-step-params']`: `list-style: disc`, gold-ink marker. Prettier run.
- **Slide 10 list**: `ul.tight` has `margin: 0` at higher specificity than `.measure`, so the list hugged the left edge. Wrapped it in `<div class="body measure">` and left the `ul` as plain `tight`. Callout: `G2&nbsp;+&nbsp;G4` so the PR grouping doesn't split.
- **Slide 4 crops**: old crops cut the "Query" row mid-glyph (left) and had a blank strip + half-hidden row (right). Re-cropped from `rerun_picker_help.png` (300x106 @ 196,360: Step 2 header through Column) and `rerun_picker_locked_conditional.png` (500x78 @ 195,582: tooltip through Minimum value). Switched to `split split-wide-right` (matches the 3:5 widths) and `fig-fill` so both fill their columns (were rendering at natural size, ~460px).
- **Slide 6 right crop**: `rerun-row-action.png` was 565 wide with the right half empty. Re-cropped to 385x200 @ 405,785 (ends just past the rerun icons) and added `fig-fill`; the table now renders ~1.15x and matches the left image's height.

## Left

- Slide 7 graph picker small text (above). A tighter re-capture of the modal (narrower viewport or smaller graph pane) would fix it; not a crop job.
- Slide 9/12 `.note` orphans ("apart.", "the expanded form."). `.note` has no `text-wrap`; would need an inline style or a class change.
- Slide 4 left crop is upscaled ~1.2x, slightly soft. Tooltip/popover overlap of neighbouring rows is in the source captures.
