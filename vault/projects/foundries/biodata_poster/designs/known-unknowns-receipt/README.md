# known-unknowns-receipt

Pitch `known-unknowns` (`../PITCHES.md`, Pitch 2) built in the visual language of the run-receipt concept (`../receipt-vision-v2/`). Only the build tooling, fonts and visual idiom were reused: the graph paper, taped thermal slip, stamps, tear line and Kalam pen notes. The content and structure are new.

## The idea

The poster is a sheet of lab-notebook graph paper. A slip taped across the top carries the thesis at 124 pt:

> **Make "I don't know yet" a typed, checkable state. Then burn it down.**

A pen note beside it reads "31 → 0".

Below the slip is a giant receipt titled **GALAXY WORKFLOW DRAFT — STATEMENT OF KNOWN UNKNOWNS**. It prints one real agent run's draft loop as a bill being paid off:

- **Opening balance.** 31 `TODO_*` sentinels in the phase-4 template, with a real excerpt of its YAML (the `map_reads` step).
- **Burn-down.** One line item per `advance-galaxy-draft-step` commit, each showing:
  - the step that `draft-next-step` picked;
  - the tool and version it resolved to;
  - `draft-validate`'s `ok`;
  - a 7-square meter of concrete tool steps schema-checked;
  - the TODO balance left, as a printed bar.

  The falling bars and the filling squares are the poster's one data visual.
- **Balance due 0.** The balance is circled in pen, and the draft is **PROMOTED** `GalaxyWorkflowDraft → GalaxyWorkflow` (stamp).
- **Tear-off stub ("second run, same loop").** The bacass run's balance as hatched bars, 7 · 6 · 1 · 0.

Rumsfeld's triad organises the margins:

- a taped clipping of the quote, top right;
- **1 Known knowns** and **2 Known unknowns**, which point at the YAML;
- **3 Valid at every resolution** and **4 The draft says what's next**, which point at the burn-down rows;
- **5 Promote, don't translate** and **6 Rails, not reminders** (with Orbit 0/15), which point at the promotion;
- **7 Unknown unknowns**: "Those take a run", plus the QA:466 quote. It closes the poster honestly, turning the counterpoint into the third idea instead of a disclaimer.

## Included and left out

**Included**
- The draft format: `TODO_*`, `_plan_*` and `class: GalaxyWorkflowDraft`.
- `draft-validate`, `draft-next-step` and promotion.
- Rails over reminders, with Orbit 0/15 attributed to the preprint.
- Burn-down series from DengueSeq and bacass. The run names appear on the receipt; the papers are named only in the receipt's footnote.

**Left out, per the pitch**
- The Foundry pattern, KB, Molds and provenance. The Foundry appears only in a QR caption.
- Nextflow typing comparisons and corpus counts.
- DengueSeq as a story.
- The open-requirements ledger and the recompile loop.
- Pass/fail and test results. bacass's test failed, so no PASS or TESTED stamps; the footnote says "resolution, not correctness".
- Hokken.

**Anton's foundry-paper work (`[[ASK]]`)**
- Left out entirely. Pitch 2 has no place for it, and nothing hides behind a flag. `SHOW_ASK=0` is **not applicable**, so there is no no-ASK check render.

## Body word count

**342 body words** (limit 400).

- **How it was counted:** every alphanumeric token on the page (PyMuPDF `get_text("words")`), minus the tokens in `meta.json`.
- **What `meta.json` holds:** the title, authors, affiliations, references, and QR captions and placeholder.
- **What counts:** receipt line items, the YAML, the Rumsfeld quote and the footnote all count as body.
- **Enforcement:** `audit.py` enforces the limit and fails the build above 400.
- **Cross-check:** `pdftotext` gives about 580 raw tokens, including dot leaders, `·` and excluded copy.

## Rebuild

```sh
./build.sh
```

This runs four steps:

1. **Replay.** `extract.py` replays every draft commit of both runs through gxwf and writes `receipt.json`.
2. **QR codes.** `make_qr.py` writes the vector QR SVGs.
3. **Render.** `render.py` runs Typst 0.15.0 and writes `poster.pdf`, `poster-bleed.pdf` and `preview.png`.
4. **Audit and checks.** `audit.py` runs on both PDFs, and `pdftoppm` writes `checks/` (25% render at 1056 px, greyscale, 200 px thumbnail).

Requirements and fallbacks:

- **Tools:** `uv`, plus poppler for `checks/`.
- **gxwf for the replay step:**
  - one-time install: `npm i --prefix /private/tmp/claude-503/known-unknowns-receipt-deps @galaxy-tool-util/cli@1.15.0`, with `npm_config_cache` set under that directory;
  - the tool cache lives at `.../known-unknowns-receipt-deps/toolcache`;
  - override the location with `POSTER_DEPS` or `GXWF`.
- **Missing gxwf or `~/projects/foundry-runs`:** the build uses the committed `receipt.json`.
- **Vault hygiene:** no `node_modules` and no symlinks in the vault. `gxwf` is called by absolute path.

**To edit the copy:**
- The title, authors, references and QR captions are in `meta.json`.
- The thesis, notes and quote are in `poster.typ`: the `thesis strip`, `margin notes` and `Rumsfeld clipping` blocks.
- For draft previews that skip the gates, compile with `sys_inputs={"gates": "0"}`.

**Build gates (the build fails on any of these):**
- `poster.typ`:
  - any two margin blocks overlapping within a column (notes, the 0/15 block, references, QR tiles), or a column running past the bottom margin;
  - the receipt stub running into the footnote, or the footnote running off the slip;
  - any QR code printed under 2.5 in.
- `audit.py`:
  - a font outside the 7 vendored faces, or any unembedded font;
  - any text under 24 pt;
  - more than 400 body words.
- `extract.py`: the steps the YAML diff shows as unresolved disagree with gxwf's own survey.

**Checked by hand:**
- All four real QR codes decode to their URLs (OpenCV, at a 60 dpi render).
- Both PDFs contain no raster images.
- `poster-bleed.pdf` is 44.25 in. Rendered at 72 dpi with the 0.125 in bleed cropped, it differs from `poster.pdf` by 0 pixels.
- The only text between 24 and 28 pt is the references.

## Fonts

All are SIL OFL fonts, vendored in `fonts/` and embedded: Archivo Black, IBM Plex Mono (Regular, SemiBold, Bold and Italic), and Kalam (Regular and Bold). Glyphs that the faces lack are avoided: the "picked" marker is a drawn triangle, and arrows are set in Plex Mono. The audit fails on any fallback font.

## Sources for every fact

| On the poster | Source |
| - | - |
| Burn-down: DengueSeq TODO 31 → 27 → 24 → 19 → 13 → 9 → 4 → 0; concrete steps checked 0 → 7 of 7; printed "ok" at every commit | Replay over `~/projects/foundry-runs/dengueseq-denv3/dengueseq-denv3-galaxy` commits `bd40715 80de2f3 3556725 658af4e daf2928 d366ab3 07062a2 b82fa5e`, i.e. `git log --reverse -- galaxy-workflow-draft.gxwf.yml`. Each commit's draft goes through `gxwf draft-validate --json --concrete --connections --cache-dir …` (`survey.todo_count`, `ok`, `concrete.ok`, `concrete.tool_state.summary`, `concrete.connection_report.valid`) and `gxwf draft-next-step`. A row prints "ok" only when `ok`, `concrete.ok` and connections valid all hold with 0 failed and 0 skipped tools (`valid` in `receipt.json`; otherwise FAIL). bacass's "valid at every commit" comes from the same predicate (`all_valid`). @galaxy-tool-util/cli **1.15.0**, run 2026-10-30. This replay is **not the run's own record**. |
| bacass stub: 7 → 6 → 1 → 0; 3 steps resolved; promoted `ad86a85` | Same replay over `~/projects/foundry-runs/bacass-sr-assembly/bacass-sr-assembly-galaxy` commits `1da586d f2c80bc a0b8701 367fc33`. `ad86a85` (draft-extract) writes `galaxy-workflow.gxwf.yml`, `class: GalaxyWorkflow`. |
| Per-row resolved step, tool and version | The YAML diff between consecutive commits (`extract.py: drafty()`). It is asserted equal to gxwf's `todo_paths ∪ plan_step_paths`, and matches the previous commit's `draft-next-step` pick. The order of `per_base_depth` and `variants` differs from the YAML order; that's real. |
| The pitch's grep counts (46 → … → 0 TODO lines; 28 → … → 0 `_plan_` lines) | **Superseded.** They were line counts and included `TODO` inside `_plan_*` prose. The poster prints gxwf's sentinel `todo_count` instead, as the pitch asked before print. |
| Promoted `GalaxyWorkflowDraft → GalaxyWorkflow` at `b82fa5e` | `galaxy-workflow.gxwf.yml` at `b82fa5e` (`class: GalaxyWorkflow`); commit message "draft: false, extracted" |
| Run window 18:44–19:39 on 2026-10-20 | Commit times of `bd40715` and `b82fa5e`, local −04:00 |
| YAML excerpt (`map_reads`) | `git show bd40715:./galaxy-workflow-draft.gxwf.yml`, abridged with "…": the `tool_id` prefix, the `_plan_state` block text (first line shown), and the 6 other steps. Otherwise as in the file, including `out: - id:` and `_plan_state: \|`. |
| Concrete now / deferred / intent carried forward (notes 1, 2) | `LT:32-72`; `GCC:962-1004` |
| "checks what's concrete against real tool schemas and skips what's deferred" (note 3) | `LT:93` |
| `draft-next-step` picks the next unresolved step; "the format drives the loop" (note 4) | `LT:101-114`; `GCC:1012-1037` |
| "promotes to ordinary gxformat2 with no translation layer" (note 5) | `GCC:1002` |
| "The model translates and repairs" … tools validate (note 6) | `FP:1092`; also `FP:1046` |
| 0/15 rule-in-prompt result | Orbit preprint, Baker et al. 2026, doi:10.64898/2026.10.26.761864 (dossier §3.5). Labelled "companion study, open-weight models". |
| "A validated workflow that nobody has run is a strong hypothesis about an analysis. It is not the analysis." (note 7) | `QA:466` |
| Rumsfeld quote | U.S. DoD news briefing, 12 Feb 2002 (archive.defense.gov transcript ID 2636). The wording was checked on 2026-10-30 against Wikipedia's "There are unknown unknowns" article, which quotes and cites that transcript; archive.defense.gov and web.archive.org were unreachable from here. The excerpt uses ellipses. It follows the transcript wording, not the paraphrase in `ASSETS/gcc2026-lightning/rumsfeld-unknowns.jpg`; the photo is not used. |
| Vogels et al. 2024, *BMC Genomics* 25:433 | `dengueseq-denv3/source-selection.md`; JATS in `sources/paper/` |
| nf-core/bacass 2.5.0 | `bacass-sr-assembly-galaxy/workflow-brief.md` |
| QR: draft format docs | `https://jmchilton.github.io/galaxy-tool-util-ts/#/guide/draft-format` (`LT:132`; `docs/guide/draft-format.md` on galaxy-tool-util-ts origin/main) |
| QR: how Foundry agents use it | `https://galaxyproject.github.io/foundry/research/galaxy-data-flow-draft-contract/` (`LT:136`; HTTP 200 on 2026-10-30) |
| QR: lightning talk slides | `https://jmchilton.net/slides/gcc2026-lightning/`, the target of `bit.ly/gcc2026draftworkflows` (`LT:24`) |
| QR: preprint | `https://doi.org/10.64898/2026.10.26.761864` |

`LT` is `gcc2026-lightning.mdx`, `GCC` is `gcc2026.mdx`, `FP` is `foundry-pattern.mdx` and `QA` is `foundry-qa.mdx`, all in `~/projects/repositories/jmchiltondotnet/src/content/slides/` @ `ac69980`.

## Placeholders

- **`[[QR: live results]]`** sits top right, 4.3 in, and always renders. Once the URL exists:
  1. add it to `LINKS` in `make_qr.py`;
  2. swap the `placeholder(...)` in the header for `image("assets/qr-live.svg", …)`;
  3. add it to the QR gate loop.
- **No `[[ASK]]` slots.**

## Open questions

1. **Title.** Is "A Draft Format for Agent-Built Galaxy Workflows" OK, or use the pitch's "Make 'I Don't Know Yet' Checkable…"? That one repeats the thesis.
2. **Rumsfeld quote.** Is it OK on a CSHL poster? The wording was checked only via Wikipedia's quote of the transcript.
3. **Replay.** Is a 2026-10-30 replay with gxwf 1.15.0 acceptable as the chart's evidence, or should it come from the run's own logs? The runs used older gxwf versions.
4. **Orbit 0/15.** Keep it, since it is not in Pitch 2's fact sheet? It supports "rails, not reminders". Cutting it saves about 25 words and the preprint QR.
5. **Shop:** edge-to-edge on the trim, or `poster-bleed.pdf`? No crop marks are added.
