# transit-grounded v2: CSHL BioData 2026 poster (concept A, Grounded)

This is the second draft of the transit map. v1 is in `../transit-grounded/` and is left untouched.

The four source types are lines: Paper (M), Expert specification (E), Nextflow (N) and CWL (C). They merge into one
trunk of Mold stations, cross the deterministic interchanges (Tool Shed, gxwf and Planemo) and end at a "Galaxy
workflow" terminal.

One real journey is drawn on the map: the DengueSeq DENV3 run, as a pale band along the M line with its UTC timetable
in the station pills. The terminal opens into that journey's ticket at the bottom right: its pins, PASS stamps and
open-requirements ledger. Limitations are designed in:

- dashed track where no shown run cleared a stage;
- hollow CWL;
- numbered service notices for the E and N lines;
- the ledger's OPEN and CUT rows.

## Rebuild

Keep `node_modules` out of the vault, because the site globs `projects/**/*.md`:

```sh
DEPS=/private/tmp/claude-503/tg-v2-deps        # any directory outside vault/
mkdir -p "$DEPS" && cp package.json package-lock.json "$DEPS" && (cd "$DEPS" && npm ci)
ln -sfn "$DEPS/node_modules" node_modules
npm run build                                  # SHOW_ASK=0 npm run build hides every [[ASK]] slot
rm node_modules                                # removes the symlink only: no -r, no trailing slash
```

- `playwright-core` is pinned to 1.57.0, which uses chromium-1200. On a machine without that browser, run
  `npx playwright-core install chromium`.
- `pdftoppm` and `pdffonts` (poppler) must be on your `PATH`.
- To change text, edit `content.yml` and rebuild. Layout is in `style.css`.
- Map geometry is set by constants in `build.mjs`: `MAP`, `T`, `SRC_Y`, `X`, `ENTRY_X`, `SOLID_TO` and `LOOP`.

| Output | Description |
| - | - |
| `poster.pdf` | 3168 × 3168 pt (44 in, trim size), one page, vector, 0 raster images, only Overpass embedded |
| `poster-bleed.pdf` | 44.25 in: the same artwork with 0.125 in of paper tint on every side, for a shop that wants bleed |
| `preview.png` | 1500 px |
| `checks/preview-25.png` | 1056 px, the review's common distance check (25% of 44 in at 96 dpi) |
| `checks/preview-200.png` | 200 px thumbnail |
| `checks/preview-gray.png` | greyscale check |

### The build fails on purpose when

- **The run drifts from the text.** The DengueSeq run no longer has 19 ledger entries, 5 open and 2 dropped, 11
  phases, 7 draft rounds or 7 steps, or its gxwf or Planemo status is no longer pass. Update `journey.expect` and the
  text together.
- **A ledger gloss is missing.** An open entry has no plain-English gloss in `journey.gloss`.
- **Text is under 24 pt** (32 px). Labels at 24–28 pt are counted and printed.
- **A non-Overpass font is embedded**, according to `pdffonts`. This catches a glyph Overpass lacks falling back to a
  system font. Write `{->}` for an arrow and `{!=}` for "≠"; they render as inline SVG.

The build also prints `OVERFLOW:` (clipped boxes) and `OUTSIDE 1in SAFE AREA:` lists. Both are empty on this build.

## Changes from v1

**Content fixes (REVIEW_CONTENT, transit-grounded):**

1. **Hokken.** Fig. 6A is now **Fig. S4A** (MUST). It takes transit-vision's framing: "Checking it against the
   authors' data surfaced a modelling choice the methods never stated."
2. **MRSA + ATAC notice.** It now reads: "MRSA: draft validates in gxwf, full validation not reached. ATAC: gxwf
   result unverified (no run summary). Planemo never ran." The E track turns dashed at the draft loop, because the
   MRSA loop never finished.
3. **The track key** says "a shown run cleared this stage" instead of "a public demo".
4. **usegalaxy-tools #1791** is shown as merged (checked with `gh` on 2026-10-29). IUC #8808 is merged and galaxy
   #24435 is still open.
5. **DengueSeq** is "built from the paper **and its linked code** (DENV_pipeline v1.0)". The M line is now "Paper:
   methods text, plus any linked code".
6. **0 of 15** now says "in the companion Orbit study (open-weight models)".
7. **Entry stations** use plain English: "Summarize the paper / spec / pipeline / CWL". There is no
   `interview-to-…` slug.
8. **13 pipelines:** "Not all reach Galaxy: 2 emit CWL, 2 review."
9. **The BAQ ledger glosses** no longer say "unchecked on test sample", which the debug report contradicts (l.51–52).
   They now read "expert to rule", with no probe numbers (sign-off #12).
10. **EGAPx** drops "(fix on a branch)", because that branch is local only (sign-off #14).
11. **CI** shows 31 pattern workflows, up from 30. I re-counted them at `origin/main` `9f83fd55`, and each matches a
    pattern note by name.
12. **Added §3 ideas that v1 lacked:**
    - two provenances, at the terminal and in the ticket's execution line (planemo 0.75.47, Galaxy `b18269a1`);
    - "methods omit result-changing choices, so gaps are expected", in the key;
    - the iVar consensus example, in the band argument;
    - "Route ≠ journey", as the map legend;
    - "(an author)" on the expert review.
13. **The `[[ASK]]` rnaseq/atacseq slot** now says "atacseq partial".
14. **The Nextflow line's notices** are condensed into one card, so the supporting case no longer outweighs the
    methods-text lead.

**Design fixes (REVIEW_DESIGN, transit-grounded and cross-cutting):**

1. **Hero:** 150 px (112.5 pt) bold, on two lines. "knowledge problem" gets a vermilion M-line underline, which still
   reads in greyscale.
2. **The map is full width.** The bottom row is no longer three equal text panels. v1's depot counts and map key are
   now one strip under the hero, in specimen-vision's "Key to the plate" form: symbol, numeral and one line per entry.
   The track legend sits inside the map as "Route ≠ journey".
3. **The DengueSeq journey is drawn on the map,** in transit-vision's pale band. Real timestamps from both
   `foundry-run.yml` files appear in the station pills (15:10 … pass 00:33). v1's bottom-left record is now a short
   ticket under the terminal.
4. **Station labels are horizontal,** in two-line stacks at 48 px (36 pt). They were rotated −40°.
5. **The ×7 draft loop is a roundel.** It sits between the Tool Shed and the gxwf draft check, with the 7 pins (one
   tool per round, changesets truncated to 8 characters) listed under it.
6. **"0 of 15" hangs under the gxwf and Planemo interchanges** with a leader line. "31" CI workflows use the same
   stat grammar above Planemo.
7. **The header band is inset** to the 1 in margin with rounded corners. No element touches the trim. A bleed variant is
   exported as well.
8. **No system fonts.** →, ≠ and ● are inline SVG, and `pdffonts` must list Overpass only.
9. **QR codes** are 3 in for Code, Install and Preprint, and 3.33 in for the live-results slot, which is the largest
   and sits beside the hero. They have 4-module quiet zones and are pure black on white. Captions are ≥ 28 pt.
10. **Placeholders** use a dashed ochre outline with no fill; the hot pink is gone. `SHOW_ASK=0` hides `[[ASK]]` without
    leaving a hole. The live-results slot always renders.
11. **Checks** use the review's common names: `preview-25.png` at 1056 px, plus `preview-200.png` and the greyscale
    render.
12. **The ledger** now leads with plain-English glosses and shows the slugs second, at 24 pt. The prose is trimmed
    (see "not applied" for the word count).

## Review items deliberately not applied

- **The map key as a vertical legend down the left margin** (design #6). That column would take trunk width the
  horizontal station labels need. The key is merged into the strip under the hero instead, as hybrid Option A
  suggests.
- **The map at about 55% of the height** (design #1). The map body is about 39% of the page height across the full
  width; with the key strip that is about 46%. Going taller would push the DengueSeq ticket off the page.
- **Rich black for the header band.** Chromium writes RGB, so it can't be specified as a K-heavy black from here.
  Confirm it with the print shop, or ask for a proof.
- **Crop marks on the bleed file.** `poster-bleed.pdf` has bleed but no marks. Most shops add their own.
- **A 25% cut in body words** (cross-cutting #4). `pdftotext | wc -w` gives 886 words for v1 and 864 for v2. The
  cuts in prose were spent on what the content review asked for: the timetable, the 7 pins, "Route ≠ journey", two
  provenances, "methods omit choices", the iVar example, the Hokken framing and the 31 CI stat. Much of v2's text is
  now short map labels rather than paragraphs. Cutting further would mean dropping Grounded evidence.
- **The title.** "Conversations" stays (dossier option 1), although every label says "expert specification". This is
  John's call (content sign-off #4).

## Fonts

All fonts are SIL OFL, from `@fontsource`, in `fonts/`:

- **Overpass** (400–900, plus italics). It is derived from the US Highway Gothic signage face.
- **Overpass Mono** (400, 600, 700).

The CSS has no generic fallback family. Body is 38–42 px (28.5–31.5 pt). Labels, tags and references are 32–36 px
(24–27 pt). Headings are 96 px (72 pt). The hero is 150 px (112.5 pt) and the title 166 px (124.5 pt).

## Colours

| Token | Value | Use |
| - | - | - |
| M (Paper) | vermilion `#d2462e`, L* about 50 | line, underline, timetable pill outlines |
| E (Expert) | amber `#e3a21a`, L* about 72 | line |
| N (Nextflow) | navy `#17325e`, L* about 21 | line |
| C (CWL) | teal `#2f8f8c` | hollow line |
| `--band` | `#f3cdbf` | pale journey band |
| `--notice` | `#fbe6a2` | service notices and the ledger |
| `--ask` | ochre `#b07d12` | dashed placeholder outlines only |

- **Paper:** `#f5f1e6`, full bleed.
- **Greyscale:** every line carries a lettered roundel, and the lines sit at distinct lightnesses (see
  `checks/preview-gray.png`).
- **Saturated colour** appears only on strokes, roundels and pills.

## Data sources

- **DengueSeq run:** `~/projects/foundry-runs/dengueseq-denv3/`.
  - From `dengueseq-denv3-galaxy/`, the build reads `open-requirements.ledger.yml`, `galaxy-workflow.gxwf.yml`,
    `galaxy-workflow-validation-result.json`, `workflow-test-result.json` (planemo version, Galaxy HEAD, job states)
    and `foundry-run.yml` (phase times, draft rounds).
  - It also reads `dengueseq-denv3-brief/foundry-run.yml` (summarize and brief times).
  - Everything is snapshotted to `data/dengueseq-run.json`, which the build uses when the run directory is absent.
    Override the path with `DENGUE_RUN=…`.
- **Text-only facts from run files:**
  - "1 of 10 answers edited, by an author": `review.md`.
  - DENV_pipeline v1.0: `source-selection.md`.
  - The iVar consensus wrapper's missing `--reference`: the ledger's `two-pileup-settings` entry.
  - The test-sample BAQ probe: `workflow-debug-report.md` l.51–52.
- **Corpus counts:** dossier §4, as of `origin/main` on 2026-10-24.
  - Re-checked at `9f83fd55`: 13 pipelines (2 to CWL, 2 review or maturation), 31 `verification/workflows`, each
    named after a pattern note.
  - Re-count everything at print.
- **Recompile hash:** `git show 73af1f62`, `discover-shed-tool/_provenance.json`, `256e3861` → `2e5fa1f8`.
- **×7 meaning:** `advance-galaxy-draft-step` SKILL.md. Each invocation picks one step, resolves a wrapper (Tool Shed)
  and runs `gxwf draft-validate`.

### Evidence behind each solid track

| Line | Solid to | Run |
| - | - | - |
| M | terminal | DengueSeq DENV3 (all phases; gxwf `--strict` pass; planemo 1/1 green) |
| E | draft loop (dashed after) | MRSA expert-spec run: the draft validated, but the loop didn't finish (r2 §2) |
| N | draft loop (dashed after) | EGAPx: 8 draft steps, then an empty extraction (r2 §3.4). It doesn't depend on the `[[ASK]]` slot |
| C | none (hollow) | `cwl-to-galaxy` exists; its emulated runs stop at a template |

- **The brief + review station** is a capsule on the M line only. Only DengueSeq is shown using it; E and N pass it
  without stopping.
- **The interface, data-flow, template, draft-loop and test stations** span every line. Each route has its own Mold
  for those stages:
  - `freeform-summary-to-galaxy-*` (interview and paper routes);
  - `nextflow-summary-to-galaxy-*` (Nextflow);
  - `workflow-brief-to-galaxy-*` (brief routes).

  Checked against `content/pipelines/*/index.md` at `9f83fd55`.

## `[[ASK]]` and placeholder slots

1. **Notice 2, the Nextflow line: `[[ASK]] nf-core/rnaseq + atacseq`.**
   - It reads: "Foundry-validated rebuilds on pinned IUC tools; atacseq partial". It has no numbers.
   - With `SHOW_ASK=0` it disappears and the card shrinks.
   - The N track stays dashed after the draft loop either way.
2. **`[[QR: live results]]`.** This slot is beside the hero and always renders. Set `board.live.url` in `content.yml`
   once the URL exists.

## Open questions

1. **Title:** keep "Conversations" (dossier option), or use "Papers and Expert Specifications"?
2. **Upstream PRs:** IUC #8808 and usegalaxy-tools #1791 may come from Anton's rnaseq/ATAC work (content sign-off
   #18a). Are they OK to show beside an `[[ASK]]`-gated slot?
3. **DengueSeq run directories** are unpublished (`foundry_head: null`). They should be public before the QR codes
   point people at them.
4. **Rich black or a K-only black** for the header band and terminal? Check with the shop.
5. **The Karpathy eponym** (content sign-off #19). Keep "Karpathy's LLM wiki" with the gist citation, or drop the
   name? Neither repo cites him.
