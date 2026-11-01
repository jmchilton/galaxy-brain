# receipts-side-by-side

Outline 1 (`side-by-side`) in `../RECEIPTS_OUTLINES.md`, built under `../FEEDBACK_ROUND3.md`. It reuses the keepers' visual language: graph paper, taped thermal slips, red stamps, tear lines and Kalam pen notes. Tooling comes from `../skills-are-binaries-receipt/`, and the right-hand data comes from `../typed-not-guessed-receipt/`.

## The idea

**Title (120 pt, two lines):** *Build better skills. Build better workflows. / Keep the **receipts**.*

**Thesis (pen line in the title slip):** *A skill is compiled from notes people can read; a workflow is type-checked before any job runs; both print a receipt you can keep.*

Two receipts stand side by side. They have the same width (12.5 in), the same top and torn bottom edge, the same 30 pt type, the same header rhythm (title, repo @ sha, rule) and the same stamp style:

- **Left: BUILD RECEIPT (A).** The `discover-shed-tool` cast, printed from its `_provenance.json`, `_required_tools.json` and `_verify.json`.
- **Right: TYPE-CHECK RECEIPT (B).** `gxwf validate --connections` over the unmodified IWC `rnaseq-pe.ga`, printed from gxwf's saved JSON report.

**The bridge.** Each receipt is laid out in two parts that meet at one shared line, `yb`. The left receipt's `VERIFY galaxy-tool-pin.json … schema c0940fc0` and the right receipt's `Connections: 57 ok, 0 invalid` both start exactly on that line. The centre-gutter note **③ Rails, not reminders.** sends one short horizontal arrow to each of them. The same discipline sits at the same height on both sides, so the symmetry carries the argument.

**Margin notes:**
- Left column:
  - ① *Skills are binaries. Keep the source.* An analogy grid (skill = binary, notes = source, cast = compiler, this slip = build log).
  - ② *Every reference has a hash.*
- Right column:
  - ④ *Typed, not guessed.*
  - The pen tally **All of IWC, tool state: 133 workflows · 3,217 tool calls · 0 failed · 1 skipped (version mismatch in file)**. This is the one data visual.
  - ⑤ *Caught before compute.*
- ⑥ *Good for humans, so good for agents.* The closing line, under both receipts.

Orbit 0/15 is **dropped**, as the outline says. Note 3 cites only "guidance, not enforcement" and the `tximport` catch.

## Rebuild

```sh
./build.sh
```

1. **Extract the left receipt.** `extract_skill.py` reads the foundry clone with `git show` and writes `receipt-skill.json`. The clone is `FOUNDRY_REPO`, default `~/projects/repositories/foundry`, read at `FOUNDRY_REF`, default `origin/main`. Run `git -C ~/projects/repositories/foundry fetch` first to print the latest. With no clone, the committed JSON is used.
2. **Extract the right receipt.** `extract_typecheck.py` turns `data/` into `receipt-typecheck.json`. This step is offline. It asserts the totals against gxwf's own text summary and parses the VOID lines from the saved errors.
3. **QR codes.** `make_qr.py` (segno) writes vector SVGs and `assets/qr.json`.
4. **Render.** `render.py` runs Typst 0.15.0 via `uvx --from typst==0.15.0`, with vendored fonts only. It writes:
   - `poster.pdf` (44 in);
   - `poster-bleed.pdf` (44.25 in);
   - `preview.png` (1496 px);
   - a word-count PDF in `/private/tmp/claude-503/receipts-side-by-side-deps/` (override with `POSTER_TMP`).
5. **Audit.** `audit.py` runs the font, size and word-count gates listed below.
6. **Checks.** `pdftoppm` writes `checks/preview-25.png` (1056 px), `checks/preview-gray.png` and `checks/thumb-200.png`.

`./rerun_gxwf.sh` is optional and was not re-run for this poster. It refreshes `data/` from IWC `23ccd9915` with `@galaxy-tool-util/cli@1.15.0`. npm and its tool cache go in `/private/tmp/claude-503/receipts-side-by-side-deps`.

The build needs `uv` and poppler. There is no `node_modules` and there are no symlinks in this directory.

**Debug renders:**
- `sys_inputs={"noguard": "1"}` turns the overflow asserts into red on-page messages.
- `debug=1` prints each receipt's natural height against its space.

**To edit the copy:**
- The title, thesis and authors are at the top of `poster.typ`.
- The receipts are the two `#receipt(...)` calls. Each takes an upper part (it ends on `yb`) and a lower part.
- The notes are `left-note`, `right-note`, the gutter `context` block and the closing `put`.

### Build guards

| Guard | Where |
| - | - |
| Each receipt's upper and lower parts fit their space | `poster.typ` (`receipt`) |
| Every note, tally, QR stack, thesis, author block and closing line stays inside its limit or the 1 in safe zone | `poster.typ` (`put`, `left-note`, `right-note`, note 3) |
| Gutter ≥ 3.7 in; columns inside the safe zone | `poster.typ` |
| QR code (quiet zone excluded) ≥ 2.5 in | `poster.typ` (`qr-tile`) |
| Text < 24 pt anywhere | `audit.py`, on both PDFs |
| Body text < 28 pt (exempt blocks hidden) | `audit.py --count` |
| Body > 400 words | `audit.py --count` |
| A font outside the vendored set, or an unembedded font | `audit.py` |

**Seen to fire during development:**
- note 1 and note 4 overflow;
- receipt upper part overflow (tested with `yb` set to 21 in);
- the word gate (tested with the limit set to 100).

**Also checked:**
- `poster-bleed.pdf`, cropped by 0.125 in, is pixel-identical to `poster.pdf` (max diff 0 at 40 ppi).
- `pdffonts` shows all 6 faces embedded and subset.

## Body word count

**382 / 400.** This is the gate's own output. Every alphanumeric whitespace token on the page counts, including:
- every receipt line item, hash, version, QTY and PASS;
- the stamps and badge digits;
- the `[[QR: live results]]` placeholder text.

The title, authors, references and QR captions are hidden in the count render.

| Region | Words |
| - | - |
| Thesis + live placeholder | 27 |
| BUILD receipt | 81 |
| TYPE-CHECK receipt | 131 |
| Left notes | 33 |
| Right notes + tally | 55 |
| Gutter note | 35 |
| Closing line | 20 |

Headroom is 18 words; the outline targets 370.

## Fonts

All are SIL OFL fonts from `github.com/google/fonts`, vendored in `fonts/` (copied from the keepers) and embedded. Typst runs with `ignore_system_fonts=True`.

| Font | Used for |
| - | - |
| Archivo Black | title, stamps |
| IBM Plex Mono (Regular, SemiBold, Bold) | receipts, authors, refs |
| Kalam (Regular, Bold) | thesis, pen notes, tally |

## Sources for every fact

- **Foundry:** `galaxyproject/foundry` at origin/main **`eb2de3f1`** (2026-10-30, fetched at build).
- **IWC:** `23ccd9915`, with gxwf `@galaxy-tool-util/cli` 1.15.0, run 2026-10-30. This is the typed keeper's saved run, copied into `data/`.
- **Abbreviations:**
  - `FP` = `foundry-pattern.mdx`, `QA` = `foundry-qa.mdx`, `GCC` = `gcc2026.mdx`, all in jmchiltondotnet. The line numbers are as cited in the keeper READMEs.
  - "Preprint" = Baker et al. 2026, bioRxiv doi:10.64898/2026.10.26.761864, as summarised in `../../research/r7-biorxiv-preprint.md`.

| On the poster | Source |
| - | - |
| BUILD head, SKILL.md `discover-shed-tool`, MOLD revision 5 · `05c99cba`, cast at 2026-09-13, cast target claude | `casts/claude/skills/discover-shed-tool/_provenance.json` (`mold`, `cast_at`, `cast_target`) |
| 5 references: name, load · mode, src/dst hashes (8 chars); 1 upfront · 4 on demand | the same file, `refs[]` |
| REQUIRES gxwf ^1.15.0 | `_required_tools.json` |
| VERIFY galaxy-tool-pin.json, schema `c0940fc0` | `_verify.json` (`--schema-sha256` arg, asserted in `extract_skill.py`) |
| "NEVER HAND-EDITED" | `QA:790`, `FP:172` (via the skills keeper README) |
| "KEEP THIS RECEIPT. It is the part a model cannot regenerate." | `foundry-machine.svg` in the foundry-pattern deck assets; `FP:563-592` |
| Note 1 analogy | `FP:197-220`. The deck says "knowledge base = the code". The poster says "notes = source" (see departures). |
| TYPE-CHECK head and command | `data/run-meta.txt`; the command in `rerun_gxwf.sh` |
| 10 tool lines with QTY, `inside 4 subworkflows 24`, `Tool state: 39 validated, 0 skipped` | `data/validate.json` `.results`; `data/validate.txt`. The 24 is the sum of the 4 subworkflow counts (5+9+7+3). |
| `list:paired → fastp`, map over list; 5 map-overs; 13 reductions into MultiQC; `Connections: 57 ok, 0 invalid` (top level) | `data/validate.json` `.connection_report` |
| wall time, warm cache < 1 s; "Under a second" | `data/timing.txt` (5 runs, 0.57–0.70 s) |
| JOBS RUN 0 | `gxwf validate` is static and runs no jobs |
| VOID FAIL and INVALID messages | `data/void-param.json`, `data/void-conn.json` (planted by `rerun_gxwf.sh`) |
| "A one-letter typo" | `PE_fragments` → `PE_fragment` |
| Tally: 133 workflows · 3,217 · 0 failed · 1 skipped (version mismatch in file) | `data/iwc-tree-summary.json`. Tool state only, non-strict; the skip cause is explained in the typed keeper README. |
| "The Tool Shed serves typed schemas for 10,000+ tools" | `GCC:408`; `manuscript.md:5,146` ("served", not "validated") |
| "The model translates and repairs; the tools validate." | the known-unknowns keeper note 6 |
| "guidance, not enforcement [1]" | preprint p.16 ("Skills are guidance, not enforcement") |
| "A connection check caught an agent's bad `tximport` wiring before it ran [1]" | preprint p.4, pp.15–16, Fig S3A |
| "Good for humans, so good for agents"; "The Foundry's agents write Format 2; gxwf, not the model, judges it." | `GCC:602-619`; `DESIGN_DOSSIER.md` §3.5; Foundry runs emit `galaxy-workflow.gxwf.yml` |

**QR codes.** All are vector codes from segno (`make_qr.py`), with ≥ 2.7 in of printed code. Each URL returned HTTP 200 on 2026-10-30. There is no lightning-talk QR.

| Code | Target | Where |
| - | - | - |
| The Foundry (required) | `https://galaxyproject.github.io/foundry/` | left column |
| gxwf docs (optional) | `https://jmchilton.github.io/galaxy-tool-util-ts/` | left column |
| Preprint [1] (required) | `https://doi.org/10.64898/2026.10.26.761864` | right column |
| GCC slides (optional; the full talk, not a lightning talk) | `https://jmchilton.net/slides/gcc2026/` | right column |
| `[[QR: live results]]` | placeholder, 3.3 in | title slip, top right |

## `[[ASK]]` items

**None.** The outline leaves Anton's nf-core work out, so there is no `SHOW_ASK` flag and no SHOW_ASK=0 render.

The only placeholder is `[[QR: live results]]`. Once the URL exists:
1. add it to `LINKS` in `make_qr.py`;
2. swap the `placeholder(...)` for `image("assets/qr-live.svg", width: live-w)`.

## Departures from the outline

1. **Thesis placement.** The thesis sits in the title slip, right of "Keep the receipts.", rather than on a line under the title. At 120 pt, line 1 of the title is 38.4 in wide, which leaves no room for the live-results tile beside it. The tile sits under line 1's end instead.
2. **Bridge targets.** The two gutter arrows land on `VERIFY` (left) and `Connections: 57 ok, 0 invalid` (right), not on the TYPED stamp. These two gate lines can be put at the same height. The Tool state total sits about 6 in higher than VERIFY and can't be. The TYPED stamp sits in-flow under the Tool state total.
3. **NEVER HAND-EDITED moved** to the bottom of the left receipt, above the footer. It mirrors the VOID stamp's position and fills the left receipt's lower half. The left receipt has about 40% fewer lines than the right.
4. **References layout.** Each reference prints its name on one line, then `load · mode … src = / → dst` on the next. The keeper's `kind · evidence` sub-line is cut, which saves 10 words; the outline lists only name, load · mode and hashes. The legend `src = dst: copied · src → dst: compiled` is kept.
5. **Note 1** is the keeper's analogy grid, not a sentence, which saves words. "notes = source" replaces "knowledge base", and "this slip = build log" replaces "provenance".
6. **Note 2** is shortened to "Each one pins the exact note it was cast from." The outline's "trace which note produced which line of the skill" is dropped: the hashes are per reference file, not per line.
7. **Note 3** says "a connection check" instead of "a schema check". The preprint describes Galaxy's connection validation (Fig S3A).
8. **Note 4** is cut to its first sentence (review tweak 4). The receipt's TOOL CALLS and CONNECTIONS sections and the arrow carry the "gxwf checks each…" half. An earlier draft had narrowed that half to "top-level connection", because the 57 connections cover only the 30 top-level steps.
9. **Note 5** points at `wall time` / `JOBS RUN`, which carry "under a second" and "before any job is queued". It does not point at VOID, so "fails here" became "fails" (review tweak 6).
10. **Tally label.** "All of IWC, tool state:" puts the caveat in the label.
11. **JOBS RUN.** Wall time comes first, as the feedback asks. JOBS RUN is set at the 36 pt total size, not the keeper's 92 pt, so a big "0" doesn't read as "nothing works".
12. **"END OF RECEIPT" tear text dropped** for words. A rule remains above `printed from gxwf's JSON report`.
13. **QR placement.** The QR codes are stacked at the bottom of the side columns (Foundry + gxwf docs on the left, preprint + slides on the right) rather than in a separate bottom band. This fills the otherwise empty lower left column and leaves the full width under the receipts for note 6.

## Applied review

Applied from `REVIEW.md`. The word count went from 394 to **382**. All guards were re-run and pass. The bleed diff is 0, and preview.png was checked again.

| # | Item | Status |
| - | - | - |
| 1 | `hl()` top edge `ascender` → `x-height`, so highlights no longer clip the line above ("pins", "typo", "repairs;") | **Applied** (first). The hero's "receipts" highlight keeps its own `cap-height`/`baseline` edges, set inline. |
| 2 | VOID heads use the receipt's tool ids: `featurecounts`, `fastp → rna_star` | **Applied** |
| 3 | Shorter thesis without "both print a receipt you can keep" | **Skipped.** The thesis is the outline's verbatim sentence, and that clause ties both receipts to the title. Left as open question 1. |
| 4 | Drop note 4's second sentence | **Applied** (−11 words) |
| 5 | "one typo planted per copy" | **Applied** (−1 word) |
| 6 | Note 5: "fails here," → "fails" | **Applied** (−1 word) |
| 7 | Tally label breaks as "All of IWC, / tool state:" | **Applied** |
| 8 | Drop the optional gxwf docs and GCC slides QR codes | **Skipped.** The outline lists them, and they balance the two side columns. Left as open question 4. |

## Open questions

1. Thesis wording: keep the outline's sentence, or shorten it? It is 25 of the 382 words. The review suggested a 13-word version; see "Applied review".
2. The left receipt is airier than the right. Accept that, or add `cast_history` back (about 15 words, which needs cuts elsewhere)?
3. "notes = source" in note 1: OK, or go back to "knowledge base"?
4. Keep the optional gxwf docs and GCC slides QR codes, or drop them for air? (review tweak 8, not applied)
5. Re-check at print: `discover-shed-tool` is still rev 5 at foundry HEAD (`./build.sh` after a fetch), and the QR URLs.
6. Print shop: trim edge-to-edge, or `poster-bleed.pdf`?
