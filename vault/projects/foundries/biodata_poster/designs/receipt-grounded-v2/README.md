# receipt-grounded v2: run receipts, grounded stance

Second draft of concept B (run receipt / lab ledger), Grounded stance. v1 is in `../receipt-grounded/` and is left
untouched. 44″ × 44″, 1″ safe margin.

Two real run receipts on a counter, annotated from the left margin:

- **Left column.** The thesis kicker "A correct workflow is a knowledge problem, not a syntax problem." (72 pt), then
  the hero "The model drafts. / The tools decide. / The gaps are written down." (110 pt). Five numbered callouts point
  with arrows at the matching receipt sections: ① compiled wiki → build provenance, ② native and pinned → tools,
  ③ the tools decide (0/15) → checks, ④ two provenances → the EXECUTED line, ⑤ gaps are output (30 → 18) → the
  ledger. Below them is "Fix the knowledge, recompile", with a REPRINT slip for `73af1f62`, then PR #701, the
  upstream PRs and CI.
- **Centre: the DengueSeq DENV3 receipt, from a paper (dominant).** Five numbered chunks: build provenance (6 of 13
  stages shown, plus the expert-review row), 7 Tool Shed pins, checks with the PASS stamp, totals, the execution
  provenance line, and the tear-off open-requirements ledger (5 of 19 open, 2 cut).
- **Right.** The narrow nf-core/bacass receipt (gxwf PASS, Planemo FAIL, "The workflow was right; the test was
  wrong."), "Other routes" with drawn status glyphs, and the QR block: live results at 3.3 in, Code, Install and
  Preprint at 2.85 in.

## Rebuild (one command)

```sh
cd vault/projects/foundries/biodata_poster/designs/receipt-grounded-v2
uv run build.py              # refresh data from run dirs if present, QR codes, both PDFs, previews, checks
uv run build.py --no-extract # keep the checked-in data/*.json (use this without ~/projects/foundry-runs)
uv run build.py --hide-ask   # hide every [[ASK]] slot; the live-results QR slot always renders
```

- `build.py` uses the `typst` PyPI package, pinned to 0.15.0. Nothing is installed globally.
- Fonts are cached in `/private/tmp/claude-503/receipt-grounded-v2/fonts`, outside the vault. Override the location
  with `POSTER_FONTS=/some/dir`. They are downloaded from google/fonts on first run.
- You need `pdftoppm`, `pdfinfo` and `pdffonts` (poppler) on your `PATH`.
- To edit text, change `poster.typ`; all hand-written copy is there. Receipt rows come from `data/dengueseq.json`
  and `data/bacass.json`. Ledger glosses are in the `gloss` dictionary, keyed by real ledger ids.

### The build fails on purpose when

- **A column overflows.** `fit()` measures each column against the body height and panics with the overflow in
  inches. The header has the same check.
- **The PDF is not one page.**
- **Any font other than IBM Plex is embedded**, according to `pdffonts`. This catches silent fallback. Text uses
  `fallback: false`, `raw` is mapped to Plex Mono, and ✂, ✗ and the status glyphs are drawn shapes.

| Output | Description |
| - | - |
| `poster.pdf` | 3168 × 3168 pt (44 in, trim size), 1 page, vector, 0 raster images, Plex fonts only |
| `poster-bleed.pdf` | 44.25 in: the same artwork with 0.125 in of paper tint on every side |
| `preview.png` | 1500 px |
| `checks/preview-25.png` | 1056 px, the common distance check (25% of 44 in at 96 dpi) |
| `checks/preview-200.png` | 200 px thumbnail |
| `checks/preview-gray.png` | greyscale, 1056 px |

## Changes from v1

**Content fixes (REVIEW_CONTENT, receipt-grounded):**

1. **Hokken:** "Fig 6A" is now **Fig. S4A** (MUST). It takes transit-vision's framing: "Checking it against the
   authors' data surfaced a choice the methods never stated."
2. **The `parity vs paper's code … identical` line is gone from CHECKS** (MUST). It was a probe outside Galaxy. The
   fact now lives in the consensus-BAQ ledger gloss as "A probe outside Galaxy, after the entry was raised: 0
   consensus positions differ on the test sample. Entry not yet closed." (`workflow-debug-report.md` l.51).
3. **Expert spec:** "MRSA's draft validates in gxwf; full validation not reached. No ATAC run record. Planemo never
   ran." (corrected dossier).
4. **0/15:** "In the companion Orbit study (open-weight models)…", cited to p.18.
5. **usegalaxy-tools #1791** is shown as merged. galaxy #24435 is still open.
6. **EGAPx:** dropped "(fix on a branch)", since that branch is local only. It keeps the validator blind spot.
7. **Title:** now *From Papers and Conversations to Runnable Galaxy Workflows* (dossier option 1). This takes the
   Nextflow/CWL lead and the CWL promise off the title (see open questions).
8. **The BAQ glosses** are labelled as probe values measured after the entry was raised, with the entry still open.
9. **Karpathy reference:** now the gist URL.
10. **CI:** 31 workflows, up from 30, per the corrected dossier.
11. **13 pipelines:** the old "from a source to a Galaxy workflow" gloss is gone. The count line now says "13 pipelines
    (2 emit CWL, 2 review)".
12. **Added §3 ideas:**
    - two provenances: callout ④, plus an EXECUTED line with planemo 0.75.47 and disposable Galaxy @ `b18269a1`.
      `galaxy_head` was added to `extract.py`.
    - "methods omit result-changing choices, so gaps are expected", with the iVar no-reference-input example, in
      callout ⑤;
    - "native", in callout ②;
    - the knowledge-problem thesis, at headline size.
13. **Borrowed:** transit-vision's 30 → 18 (Orbit p.2), tied to "methods omit choices"; and a "Route ≠ journey" note
    on Other routes: "Each row is one run, not a sample."
    - Both 0/15 and 30 → 18 carry an "ORBIT STUDY" label at display size on the numeral, so the arrow into CHECKS
      doesn't read as this run's score.
14. **`[[ASK]]` rnaseq/atacseq** now reads "Foundry-validated rebuilds … atacseq partial".
15. **The model cost** ($37.26) is an `[[ASK]]` slot.
16. **Fewer words, though short of the 25% target.** `pdftotext | wc -w` gives 1343 words for v1 and 1220 for v2 (−9%),
    receipts included. The left-column prose is now short callouts, and SOURCE, the NOTE line and the bacass copy are
    shorter; the BioSample doubt is gone from the NOTE. The cut is smaller than asked because v2 adds content both
    reviews required: two provenances, "methods omit choices", 30 → 18, the Orbit labels and plain-English glosses.

**Design fixes (REVIEW_DESIGN, receipt-grounded and cross-cutting):**

1. **Receipt rhythm.**
   - Section heads are 44–48 pt bold and numbered ①–⑤, so the receipt reads as five chunks.
   - Totals are 44 pt.
   - The 13-row stage list is collapsed to 6 rows plus "+ 7 more skills".
2. **Callouts with arrows** (receipt-vision's device, in this poster's sans). The arrows are drawn in the page
   foreground from `locate()` anchors, so they follow copy edits and the `--hide-ask` reflow. Callouts run in receipt
   order, so no arrows cross.
3. **Header.**
   - Title leading is looser (0.5em in Typst's cap-to-baseline model).
   - The authors moved to the right of the title.
   - The QR codes moved out of the header.
4. **QR block, bottom right.**
   - Live results is 3.3 in, the largest code.
   - Code, Install and Preprint are 2.85 in, pure black (`#000000`) on white, with 4-module quiet zones.
   - Captions are ≥ 28 pt.
   - It includes the install command, labelled "Claude Code".
5. **Background** lightened from `#E3DED3` to `#F4EFE4`, with pure-white receipts.
6. **Greyscale hero.** The red is darkened to `#8F2B1D`, and the last hero line is underlined with a 12 pt rule.
7. **Status glyphs** (specimen-grounded's system), drawn as shapes: filled disc pass, half disc partial, hatched square
   fail, dashed ring "no result yet". They are used in Other routes and on the receipts' check lines. EGAPx carries the
   half disc ("partial"), not the fail square.
8. **Hero:** 110 pt bold sans (it was 104), under a 72 pt kicker.
9. **No system or bundled-font fallbacks.** v1 embedded DejaVu Sans Mono for ✂ and ✗; both are now drawn.
10. **Placeholders** use a dashed ochre outline with no fill; v1's red `[[ASK]]` tag is gone.
11. **Mono hashes** are truncated to 8 characters everywhere. v1 printed 12-character changesets.
12. **Bleed and trim.** `poster-bleed.pdf` is exported. No rules, frames or receipt shadows sit between 0.25 in and
    0.9 in of the trim; everything stays inside the 1 in margin.
13. **Checks** follow the common names in `checks/`.

## Review items deliberately not applied

- **Receipt section heads below 72 pt.** They are 44–48 pt bold mono, as receipt line items, as in v1. Every poster
  heading is ≥ 72 pt: the kicker, the five callout titles (72 pt semibold, in a softer ink so the 110 pt hero stays
  dominant), "Fix the knowledge, recompile", "Other routes" and "Live results".
- **Title leading "about 0.32em".** Typst measures leading from baseline to cap height, so 0.32em made the lines touch.
  0.5em gives the intended gap.
- **QR codes at 3 in for all four.** The right column is 9.2 in wide, so three codes fit in a row at 2.85 in. The
  live-results code is 3.3 in.
- **An inverted (white on red) hero line for greyscale.** I used the review's own fix instead (darker red plus an
  underline). An inverted band would be a large saturated area.
- **Agent time 6 + 144 vs the scorecard's 7 + 147 min** (NIT). Kept 6 + 144, computed from the two `foundry-run.yml`
  spans, because the receipt is printed from run files. Align it across posters if needed.
- **Crop marks on the bleed file.** It has bleed but no marks; most shops add their own.
- **Rich black for large dark areas.** There are none; the only black is text, rules and small discs.

## Fonts

All fonts are OFL, from google/fonts, and embedded (checked by the build with `pdffonts`).

- **IBM Plex Mono** (Regular, SemiBold, Bold): the receipts, hashes and `raw` text.
- **IBM Plex Sans Condensed** (Regular, SemiBold, Bold, Italic): headings and prose. Typst files it under the family
  name "IBM Plex Sans".

## Data sources

The sources are unchanged from v1 (see `../receipt-grounded/README.md`), plus:

| Poster item | Source |
| - | - |
| EXECUTED: planemo 0.75.47, Galaxy `b18269a1` | `dengueseq-denv3-galaxy/workflow-test-result.json` (`planemo.version`, `galaxy.galaxy_branch_note`) |
| Consensus BAQ probe: 0 positions; variants 484 vs 476 rows (472 vs 467 PASS) | `workflow-debug-report.md`, "Open-requirements bearing" (the ledger entries are still open) |
| iVar consensus wrapper has no reference input | ledger entry `ivar-wrapper-pileup-deviation-choice` (resolved; the consensus reference edge is dropped) |
| 0/15, 30 → 18, Hokken Fig. S4A | Baker et al. 2026 preprint p.18, p.2, p.36 |
| CI 31 workflows; 13 pipelines (2 emit CWL, 2 review) | corrected dossier §3–4 (`origin/main`) |

Corpus counts are the dossier's set, dated 2026-10-24, footnoted under the hero receipt. Re-count them at print.

## `[[ASK]]` slots and items needing John's OK

`--hide-ask` removes every `[[ASK]]` slot without leaving a hole. The live-results slot always renders.

1. **`[[ASK]]` nf-core/rnaseq, atacseq** (Other routes): "Foundry-validated rebuilds with paper replications;
   atacseq partial". It has no numbers.
2. **`[[ASK]]` MODEL COST $37.26** (receipt totals; scorecard row 6).
3. **`[[QR: live results]]`** (bottom right, 3.3 in). The URL is TBD. Add it to `make_qr.py` and swap the box for
   `image("qr/live.svg", …)`.
4. **The bacass receipt** is an unpublished development fixture (content sign-off #8). It is printed as "NOT HELD OUT ·
   DEV FIXTURE".
5. **The DengueSeq run dirs** are local and unpublished (sign-off #5). Publish them before the QR codes point at them.
6. **"EXPERT REVIEW · an author"** discloses that the reviewer was J.C. (sign-off #7).

## Type-size exceptions (below the 28 pt body minimum, none below 24 pt)

Status tags, ledger slugs, the receipt "MOLD / HASH" header, the glyph legend (26 pt), references and the count
footnote, and the receipt's "Printed from" line.

## Checks done

- **1056 px (`checks/preview-25.png`):** readable are the title, the kicker, the hero, both receipt headlines, the five
  numbered section heads, the PASS and FAIL stamps, the FAIL bar, "0/15", "30 → 18", the REPRINT hash flip, "Other
  routes" and "Live results".
- **200 px:** it reads as one dominant receipt with a narrow one beside it.
- **Greyscale:** PASS and FAIL are carried by words, stamp shapes and glyphs. The underline keeps the last hero line
  emphasised.
- **`--hide-ask`:** renders without holes, and the arrows re-anchor.

## Open questions

1. **Title:** "Conversations" (dossier option 1, now used), or "Papers and Expert Specifications"? Every label says
   "expert specification".
2. **Upstream PRs:** IUC #8808 and usegalaxy-tools #1791 may come from Anton's `[[ASK]]`-gated rnaseq/ATAC work
   (content sign-off #18a). Are they OK to show?
3. **Keep the model-cost slot,** or drop it?
4. **bacass receipt:** OK to show, given it's unpublished?
