# receipt-vision-v2

Second draft of design #4: concept B (run receipt / lab ledger), Visionary stance. `../receipt-vision/` (v1) is untouched. This draft applies the receipt-vision sections of `../REVIEW_DESIGN.md` and `../REVIEW_CONTENT.md`, the cross-cutting fixes, and the corrected `DESIGN_DOSSIER.md`.

The poster is a sheet of lab-notebook graph paper. A long slip printed with the thesis is taped across the top: **"A correct workflow is a knowledge problem, not a syntax problem."** (Archivo Black, 116 pt). The pen comment on it reads "Agent-built. Tool-verified. Open gaps written down." Below it, one DengueSeq run receipt is taped down, rendered from the real run files.

Seven numbered pen notes explain one idea each (dossier §3). They run in receipt order, odd numbers on the left and even on the right, and each has an arrow onto the receipt line it explains:

1. A knowledge problem → SOURCE
2. A compiled wiki → STATIONS
3. Native, pinned → TOOL SHED PINS
4. The tools decide → CHECKS and the stamps
5. Gaps are output → the tear-off ledger
6. Two provenances → EXECUTED (build provenance is the receipt head)
7. Fix the knowledge → the REPRINT stub

## Changes from v1

**Design**

- **Thesis at headline size.** The new thesis slip sets the hero at 116 pt bold sans, with "knowledge problem" highlighted. Ink on white slip is the highest contrast on the page. The title dropped from 146 pt to 120 pt, so the thesis out-weighs it.
- **Handwriting cut to annotation.** Each note is a ≤2-line Kalam head at **72 pt** (v1: 56 pt, under the dossier's heading floor) plus ≤2 Kalam lines. Anything more is a 28 pt Plex Mono "typed" footnote.
- **Reading order fixed.** Notes are renumbered in receipt order and alternate strictly, odd left and even right. The context notes (Hokken, "build provenance") are pencil grey with no badge. The human-review note was cut, since the receipt line now says it.
- **Notes reflow.** Each note is placed from its receipt anchor (`#note("a-…", side, dy: …)`), and its arrow lands on that line. Editing the receipt moves its notes with it. Only note 7, the stub and the QR/refs block remain at fixed positions.
- **Receipt rhythm.**
  - `sect()` heads are at 42 pt, OPEN REQUIREMENTS at 58 pt with the pen ellipse, and the ledger title at 42 pt.
  - STATIONS is collapsed from 13 rows to 6 plus "7 more · 13 skills, 36 wiki sources hashed in".
  - Ledger lines are cut to one gloss each.
- **Graph glimpse.** TOOL SHED PINS has a git-style strip of the built graph in its gutter (`pins-graph()`): bwa_mem → samtools_view → ivar_trim, which branches to ivar_consensus → tp_sed_tool, ivar_variants and bedtools. It is drawn from the `in:` links in `galaxy-workflow.gxwf.yml`.
- **Stamps** are simplified (VALIDATED gxwf, TESTED planemo) and overlaid inside the CHECKS block, so they no longer overlap the totals.
- The notebook margin rule starts below the thesis slip; v1's ran through the title. The receipt is wider (17.2 → 19.4 in).
- **QR codes.**
  - The codes have a 4-module quiet zone on white tiles (v1 had none).
  - Install and Preprint are 3.85 in tiles (3.0–3.1 in of code). The in-receipt repo code is 3.0 in.
  - The **live-results** slot is the largest, at 4.4 in, top right next to the title. It always renders.
  - Captions are 30 pt.
  - A build gate fails if any code is under 2.5 in.
- **Placeholders** use the shared style, a dashed ochre outline with no fill. The yellow `[[ASK]]` sticky is gone.
- **No transparency.** The tape, shadows, highlighter and stamps are now opaque pre-mixed colours. A PDF scan finds 0 alpha entries (v1 had 5), so there is nothing to flatten.
- **Bleed.** `poster-bleed.pdf` is 44.25 in, with the paper and grid extended 0.125 in. Arrows subtract the bleed offset; a pixel diff against `poster.pdf` after cropping the bleed is 0. Nothing runs parallel to the trim inside 1 in, except the full-bleed grid.
- **Font gate.** Typst runs with `ignore_system_fonts=True`, and `audit.py` fails on any font outside the 7 vendored faces. The first v2 build caught a Libertinus fallback, so the gate works. `audit.py` also fails on any text under 24 pt; the only text between 24 and 28 pt is the references and the counts footnote.
- **Overflow gate.** The build fails if the ledger plus the footer would run past the receipt's bottom.
- **Distance checks** go in `checks/`: `preview-25.png` (1056 px), `preview-25-noask.png`, `preview-gray.png` and `thumb-200.png`.

**Content (review must-fix and should-fix items)**

- **MUST.** Hokken is cited as **Fig. S4A** (was Fig 6A).
- **MUST.** The wiki box says "13 pipelines on main" (was "source-to-Galaxy routes").
- The BAQ ledger lines no longer say "Not yet measured on SRR25366733". They now say "Awaiting expert". No probe numbers were imported.
- 0/15 is now "Companion Orbit study, open-weight models: …". The 72 pt "0/15" in note 4 carries its own 44 pt "Orbit" label, so it can't be read as a Foundry check at distance.
- `[[ASK]]` now reads "nf-core/rnaseq and atacseq **rebuilds**, Foundry-validated (atacseq partial)", not "translations".
- The human review line is now "HUMAN REVIEW (one of the authors)". `review.md` names John Chilton.
- Not flagged by the reviewers: the Hokken head "Also from methods text" implied that DengueSeq came from methods text alone. It is now "Another paper, on public Galaxy".
- Borrowed: "Casting is deterministic; no model runs" (specimen-vision) in note 2.
- References are bracketed [1]–[3]. Karpathy is cited by the full gist URL (research r1 §7).

## Review items deliberately not applied

- **Word cut.** v1 had 844 alphanumeric tokens (`pdftotext`) and v2 has 719 (706 without ASK), about 15% fewer, not 25%. Most of what remains is receipt line items (hashes, pins, times), which are the dominant image and the real-data point of the concept. The prose notes were cut harder.
- **Dominant image area.** The receipt is about 31% of the page; with the thesis slip, the paper objects are about 41%.
- **30→18 sticky** (content borrow). Left out to save words and a focal point. The Orbit posters next door will also show it (sign-off #21).
- **Tool Shed changesets stay at 12 characters**, their canonical short form, as in transit-vision-v2. Foundry hashes are 8.
- **No crop marks** in `poster-bleed.pdf`. The shop adds them, or confirms edge-to-edge printing on the 44 in trim.
- **Title.** Still dossier option 1. This is sign-off item #4; it is one `#let title` at the top of `poster.typ`.
- **The Hokken "modelling choice the methods never stated" line** was tried, then cut for length.

## Included, and left out (Visionary stance)

- **Included:**
  - DengueSeq (held out), with its 13 stations, 7 pins, gxwf/Planemo PASS and 5 open ledger items;
  - the recompiles `73af1f62` (`256e3861 → 2e5fa1f8`) and PR #701 (1 note → 8 skills);
  - 0/15 and Hokken, both attributed to the preprint;
  - corpus counts, dated 2026-10-24.
- **Left out:** sarek, EGAPx, CWL, the gxwf zero-step blind spot, MRSA/ATAC (the June recompile stub names only the tool, not the run), bacass, the direct arm, the BAQ probe numbers, upstream PRs, CI, and any rate.

## `[[ASK]]` and placeholder slots

- **`[[ASK]]`** (right column, under the wiki box): "Supporting case with ground truth: nf-core/rnaseq and atacseq rebuilds, Foundry-validated (atacseq partial)." It has no numbers. Hide it with `SHOW_ASK=0 ./build.sh`; that leaves open graph paper, not a hole (see `checks/preview-25-noask.png`).
- **`[[QR: live results]]`** (top right, 4.4 in): always rendered. Once the URL exists:
  1. add it to `LINKS` in `make_qr.py`;
  2. replace the `placeholder(...)` in the header with `image("assets/qr-live.svg", width: live-w)`;
  3. add it to the QR gate.

## Rebuild

```sh
./build.sh                 # extract -> QR -> PDFs + preview -> audits -> checks/
SHOW_ASK=0 ./build.sh      # print version without [[ASK]]
```

The build runs these steps:

1. **Extract.** `extract.py` re-extracts `receipt.json` from `~/projects/foundry-runs/dengueseq-denv3`, or from `FOUNDRY_RUNS=...`. If that directory doesn't exist, the committed JSON is used.
2. **QR codes.** `make_qr.py` (segno) writes the SVGs and `assets/qr.json`, which holds the module counts.
3. **Render.** `render.py` runs Typst 0.15.0 via `uvx --from typst==0.15.0` and writes `poster.pdf`, `poster-bleed.pdf` and `preview.png` (34 ppi, 1496 px). It also writes a no-ASK PDF to `/private/tmp/claude-503/receipt-vision-v2/` (override with `POSTER_TMP`).
4. **Audit.** `audit.py` (PyMuPDF) runs the font and size gates on both PDFs.
5. **Checks.** `pdftoppm` writes the `checks/` PNGs.

It needs `uv`, plus poppler for the checks. Tool caches stay in uv's default cache, outside the vault. No `node_modules`.

**To edit the copy:**
- The title, authors and thesis are at the top of `poster.typ`.
- The receipt lines are in the `// ---------- receipt` block.
- The notes are the `#note("a-anchor", side, dy: …)` calls; `dy` shifts a note relative to its receipt line.

## Fonts

All are SIL OFL fonts from `github.com/google/fonts`, vendored in `fonts/` and embedded.

| Font | Used for |
| - | - |
| Archivo Black | title, thesis, stamps, 0/15 |
| IBM Plex Mono (Regular, SemiBold, Bold, Italic) | receipt, authors, typed footnotes, refs |
| Kalam (Regular, Bold) | pen notes |

## Data sources

These are unchanged from v1 (see `../receipt-vision/README.md`), plus the following:

| On the poster | Source |
| - | - |
| The pins graph | the `in:` links in `galaxy-workflow.gxwf.yml` (map → filter → trim → consensus → header; trim → variants; trim → depth) |
| "one of the authors" | `review.md` ("Reviewer: John Chilton") |
| "Awaiting expert" | both BAQ ledger entries are still `open`, and their `missing` field says the check is "so the expert can judge" (`open-requirements.ledger.yml`) |
| Karpathy gist URL | `research/r1-foundry-system.md` §7 |

## Open questions

1. **Title** (sign-off #4): keep "Papers and Conversations", or use "Papers and Expert Specifications"?
2. **Reviewer wording.** The dossier says the brief reviewer was "a paper author", but `review.md` names John Chilton, a poster author, not a Vogels et al. author. This poster says "one of the authors". Fix the dossier wording?
3. **Re-count at print:** the corpus tally, and 13 pipelines.
4. **Keep the Karpathy eponym** (sign-off #19)?
5. **Shop:** edge-to-edge on the trim, or `poster-bleed.pdf`?
