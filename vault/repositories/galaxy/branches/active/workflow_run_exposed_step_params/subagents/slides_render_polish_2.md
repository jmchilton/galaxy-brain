# Slides render polish 2 — workflow-step-params deck

Walked all 18 slides at 1280x933 (1-based numbers from the `{/* SLIDE N */}` comments; extras counted on: 12 divider, 13 scope, 14 links, 15 fallback, 16 payload, 17 API gaps, 18 tests). All scrollHeights ≤ 655 of 700 before, ≤ 644 after; notes all hidden. Screenshots: `/private/tmp/claude-503/-Users-jxc755-projects-repositories-galaxy-brain-vault-agents-gx-spike/bf29b5cf-2616-4226-bc10-fdc18e54dd9a/scratchpad/render2/` (`sN.png` before, `bN.png` after).

## Changes

| Slide | Change | Why |
|---|---|---|
| 5 rows | Re-cropped `row-locked-conditional.png` from `rerun_picker_locked_conditional.png`: 500x94 @ 567,195 (was 500x78 @ 582,195) | Old crop started mid-glyph on the "Query 2" label above the tooltip. Now shows the whole label |
| 15 fallback | Re-cropped `rerun-unrecorded-legacy.png` from `rerun_unrecorded_expanded.png`: 570x240 @ 95,400 (alert + History Options) instead of the full 580x665 form. Layout `split` → `split split-wide-left`, image `fig-tall` → `fig-fill`. Alt text says "Top of the legacy form" | The tall crop was height-capped, so the alert (the point of the slide) rendered at ~10px. Now ~14px and the slide drops from 653 to 386px. The rest of the form was boilerplate; the note already says the capture doesn't show form length |
| 13 scope | `data input&nbsp;is&nbsp;set` | Orphan "set" on its own line |
| 18 tests | `for the&nbsp;graph` | Orphan "graph" |

Slides 2, 3, 4, 6, 7, 8, 9, 10, 11, 14, 16, 17 checked: no overflow, bullets render, headings balanced, images legible. `npx prettier --check` passes on the .mdx (and SlideLayout.astro, untouched this pass). Nothing committed.

## Left

- Slide 5 has ~200px of empty space under the body and both crops are upscaled (left 1.6x, soft). Making them bigger means more blur; a higher-DPI capture would fix it.
- Slide 5 right: the tooltip covers the Column name row in the source capture.
- Slide 8 graph picker: right-hand parameter list still ~8px (pass 1 leftover; needs re-capture).
- Slide 14: the inline `<code>` link string fills a whole line, so the sentence starts on line 2. Readable; a reword would change the slide's content.
