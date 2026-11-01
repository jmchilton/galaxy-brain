# known-unknowns-receipt (round 4, Old-school restyle)

Round-5 Old-school restyle of `../known-unknowns-receipt-r4/`, which is left untouched for side-by-side comparison. Below the Round 5 section, the README is the round-4 record, with only the font list, the build paths and the gate-colour wording updated.

## Round 5 styling (Old-school)

This is a styling pass against `../STYLE_OLDSCHOOL.md`. The text, facts, receipts, QR targets, layout concept and density are unchanged from r4. `receipt.json`, `route.json` and `meta.json` are identical to r4; `route.json` was rebuilt from the run dirs and came out unchanged.

**What changed**

| Element | Claude style (r4) | Old-school |
| - | - | - |
| Ground | Graph paper, square grid | Aged manila `os-page` with a radial vignette to `os-page-edge`, a faint cyan cross-process ring, and horizontal ledger ruling (0.5 in minor, major every 2 in) |
| Tokens | Navy pen, `#1d1d1b` ink, red stamp | The full `os-*` token block, with lifted-black ink `#2b2722`, a graphite pen `#3d3a4a` and the faded stamp red `#8e3b32`. Nothing is darker than `os-ink`. |
| Title | Archivo Black 124 pt | Courier Prime Bold 124 pt, with a 1.5 pt `os-rule` line above the authors |
| Authors and affiliations | Plex Mono | IBM Plex Serif SemiBold (authors) and Regular (affiliations, `os-ink-soft`) |
| Thesis slip | White slip, Archivo Black hero | `slip-fill` thermal fade, about 600 grain specks, Courier Prime Bold 124 pt hero, and a dotted rule under it. Its `hl-hero` is `os-hl` over a halftone of `os-stamp` lightened 60 %. |
| Thesis what-it-is line, band copy, clipping captions, the sub-paragraphs of notes 6 and 7, references, QR captions | Plex Mono | IBM Plex Serif (≥ 28 pt; refs stay 24 pt) |
| Section heads: "What a Foundry run does", "Use it" | Kalam pen, 72 pt | Oswald SemiBold 64 pt, uppercase, tracked 0.06 em |
| Route band | Navy 9 pt track; red gate squares and red gate tags | 7 pt track in `mix(os-ink 80 %, os-cyan 20 %)`; Oswald numerals; gate stations are ink-filled squares with slip numerals; open stations are slip circles with an ink stroke; gate tags and the legend square are ink |
| Receipt | White slip, regular zig edge | `slip-fill` fade to `os-slip-burn` at the foot, 600 grain specks, and an irregular torn edge (steps alternating 0.18/0.24 in, four depths) in `os-slip-burn` with a 1 pt `os-shadow` hairline. The sub-head and the "SECOND RUN, SAME LOOP" tear label are in Special Elite. The timestamp line is `os-ink-fade` bold. |
| Burn-down bars, bacass bars | Solid ink, diagonal hatch | `halftone(os-ink)` (0.075 in pitch, 0.06 in dots, about 50 % coverage) with a 2 pt ink outline |
| Draft-snapshot nodes | Slip fill | `os-page` fill (an inner diagram box) |
| Clippings | Plain slip with a soft offset shadow | `slip-fill`, 1.5 pt `os-ink-soft` stroke, square corners, a 0.12 in hard `os-shadow` offset, and grain |
| Tape | Flat cream rect | `tape-grad` (darkened ends) with a 0.5 pt `os-rule` outline at 40 % |
| PROMOTED stamp | Archivo Black, single 7 pt rounded border | Oswald SemiBold, double 3 pt square border 4 pt apart, worn by seeded `os-slip` specks |
| Pen arrows, badges, loop mark | 5–6 pt navy | 4.5–5 pt `os-pen`, round caps; badges are a 4 pt stroke with no fill |
| QR | `#1d1d1b` on white | `os-ink` modules on `os-qr-ground` (`make_qr.py`), with a 1 pt `os-rule` frame. The codes sit on the page, outside the slips and the grain. |
| `[[QR: live results]]` | Ochre dashes | `os-ink-fade` dashes; text unchanged |

**Fonts** (all vendored in `fonts/` and embedded; licence files sit next to them)

| Family | Use | Licence |
| - | - | - |
| Courier Prime Bold | Title, thesis hero | SIL OFL 1.1 (`courierprime-OFL.txt`) |
| Special Elite | Receipt sub-head, tear-line kicker | Apache 2.0 (`specialelite-LICENSE.txt`) |
| Oswald SemiBold (static, from googlefonts/OswaldFont) | Section heads, station numerals, stamp | SIL OFL 1.1 (`oswald-OFL.txt`) |
| IBM Plex Serif (Regular, SemiBold, Bold) | Authors, body prose, refs, QR captions | SIL OFL 1.1 (`ibmplexserif-OFL.txt`) |
| IBM Plex Mono (Regular, SemiBold, Bold) | Receipt, labels, code lines | SIL OFL 1.1 (carried from r4; licence in `fonts/`) |
| Kalam (Regular, Bold) | Pen notes | SIL OFL 1.1 (carried from r4; licence in `fonts/`) |

Homemade Apple was considered but not vendored (see departure 1). Archivo Black and Plex Mono Italic were removed. The `ALLOWED` list in `audit.py` is now exactly the 11 faces embedded.

**Departures from the guide**
1. **Pen notes stay in Kalam, not Homemade Apple.** Kalam is the guide's own fallback. Homemade Apple is far wider and taller, so the notes would no longer fit their fixed, overlap-gated slots without moving the content, and the cursive is hard to read at 6 ft.
2. **VT323 is not used.** Plex Mono stays for the receipt, which is the guide's "safest choice". The fade, grain and halftone carry the age.
3. **`hl()` keeps a −0.12 em bottom edge**, not `descender`. Round 4 found that `descender` bottoms touch the next line's caps in note 6. `top-edge: "x-height"` is kept.
4. **Line weights are heavier than the guide's numbers**, for a 44 in sheet. The route track is 7 pt (guide 4 pt) and pen arrows are 4.5–5 pt (guide 3 pt), so they still carry at 6 ft.
5. **Gate tags (gxwf, Planemo) are ink, not red.** This follows "gate stations use an `os-ink` fill" and the single-red rule; red is now only on the PROMOTED stamp.
6. **No separate title slip.** The poster's title has always sat on the page. The taped thesis strip gets the title-slip treatment (Courier Prime hero, dotted rule, thermal fade), and Special Elite moves to the receipt kicker lines.
7. **The stamp knockout uses specks, not a regular halftone,** so the wear looks irregular.
8. **Optional extras skipped:** halftone in the tape and halftone in the shadows.

**Required items (status)**
- Authors with Scott Cain¹: unchanged (`meta.json`).
- QR: Foundry and Preprint present, plus Install and Draft docs; no lightning-talk QR. All four decode with OpenCV at 60 dpi on both PDFs.
- Orbit 0/15: absent, as in r4.
- Wall time before JOBS RUN: not applicable (there is no jobs row).
- `hl()`: `top-edge: "x-height"`.
- DengueSeq pins: "pins a revision" and the `gxwf` gate tag are unchanged. Nothing says the 7 pins pass VERIFY.
- `[[QR: live results]]` is unchanged. There are no `[[ASK]]` slots, as in r4.

**Checks**
- Build gates pass: overlap, receipt fit and QR ≥ 2.5 in. The audit passes: fonts vendored and embedded, no text under 24 pt.
- **Word count: 567 body words, the same as r4** (0 %).
- Both PDFs have 0 raster images. `poster.pdf` is 44.0 in and `poster-bleed.pdf` is 44.25 in.
- The greyscale proof still separates highlighter from slip, halftone bars from ground, ink gate squares from open stations, and the stamp from the receipt.

**Open questions**
1. Courier Prime hero vs. Archivo Black: is the lighter typewriter weight strong enough from across the hall?
2. Kalam pen OK, or try Homemade Apple on the short labels only ("31 → 0", "you are here", "×7")?
3. Losing the red gate squares: is ink-filled clear enough, or is a red gate worth a second colour?
4. Print: proof a 6×6 in swatch for mustard drift (the guide suggests `#ebe4cf` as the fallback ground). Will the shop flatten the vignette and grain transparency cleanly?


Round-4 revision of `../known-unknowns-receipt/` (left untouched for before/after). Same identity: graph paper, the taped thesis slip, the burn-down receipt with BALANCE DUE 0 + PROMOTED, numbered pen notes that point at receipt lines, "Rails, not reminders". What changed is the scope: the receipt is now one stop on a drawn Foundry run.

## Round 4 changes

**Why:** John ranked this #1 ("what it does is very clear", "Rails, not reminders" still nice) but "too specific": it taught the draft format, not the Foundry. Round 4 also asks every poster to say what the Foundry *does* and how to *use* it, at higher density.

**What changed**

| Change | Why |
| - | - |
| Title is now **The Galaxy Workflow Foundry** (was "A Draft Format for Agent-Built Galaxy Workflows"). | The Foundry was named only in a QR caption. |
| One-breath "what it is" + "In: a paper or a Nextflow pipeline. Out: a Galaxy workflow, its test, and a ledger of what is still open." under the thesis. | Advice §1 "one line under the thesis"; dossier §2. |
| New **route band** "What a Foundry run does": PAPER (DengueSeq) and NEXTFLOW (bacass) lanes → human-reviewed BRIEF → the 11 shared stations of `workflow-brief-to-galaxy`. Red squares (ink squares in the Old-school restyle) mark stations where a program checks the work (5 gxwf draft-validate, 9 gxwf validate, 10 Planemo). Station 5's tag is deliberately not "Tool Shed": only 5 of 7 DengueSeq pins pass VERIFY. Station 5 carries a loop mark "×7 for DengueSeq" and "you are here: station 5, below" with an arrow into the receipt. Top right: where both runs ended. | Advice change + ideas (a) and (b); round-4 general note asking for a paper/Nextflow → Galaxy pipeline diagram. Data from `route.json`. |
| Machine line "knowledge base → Mold → cast → skill + provenance record. Each station below runs one cast skill." | Teaches what a station is. |
| **Draft snapshot clipping** (vector): the real DengueSeq draft at `daf2928` (the `consensus` row): 4 steps solid (concrete), 3 dashed (`TODO_` ports), every edge already present. Pen arrow to that receipt row. | Advice "draft/extracted pair"; "valid at every resolution" from our own run. |
| **Use it** slip: Claude Code install lines, `npm i -g @galaxy-tool-util/cli`, `gxwf draft-validate`, `gxwf draft-next-step`. QR to `/usage/`. | Advice "3-line use-it note"; round 4 "how to use". |
| Note 4 now says how a pass works (pick step → find tool on the Tool Shed → pin a revision → fill the step). | More explanation of the loop. |
| Note 6 rebuilt from Orbit's positive evidence: guidance not enforcement; `tximport` wiring caught before it ran; evidence gate refuses by default. **0/15 removed.** | Round-3 fix 1. |
| Note 7 now has evidence: bacass passed every static check, then failed one test assertion; the band says debug blamed the assertion, not the workflow. | "Those take a run", made literal. |
| bacass stub kept as the receipt tear-off ("from Nextflow" added), and bacass also rides the Nextflow lane. | Keeps "second run, same loop". |

**Round-3 global fixes (all were missing; preview predated round 3)**
- Scott Cain¹ added before Anton Nekrutenko (`meta.json`).
- QR set is now: The Foundry (site), Install the skills (`/usage/`), Draft format docs, Preprint. The lightning-talk slides QR is gone (`make_qr.py`, `meta.json`, gate loop).
- 0/15 is gone. No big zero leads: BALANCE DUE 0 stays as the paid-off balance.
- Rumsfeld clipping and ref [4] removed. The triad stays only as note heads 1, 2 and 7.
- Wall time before JOBS RUN: **not applicable**, the poster has no jobs row.
- Highlighter: `hl()` starts at `top-edge: "x-height"`, and its bottom edge is −0.12 em (not `descender`), so it neither covers descenders above nor caps below. `hl-hero()` (thesis only) starts at cap-height. `todo()` in the YAML uses cap-height → baseline on caps-only tokens. All checked on 100 ppi crops (notes 2, 3, 4, 6, 7, the YAML, the thesis). The first crop showed `descender` bottoms touching the next line's caps in note 6, which led to the −0.12 em change.
- DengueSeq tools: the poster says "pins a revision", never "verified", and station 5's gate tag reads `gxwf` (the draft-validate check behind the receipt's squares), not "Tool Shed". Nothing implies all 7 pins pass `discover-shed-tool`'s VERIFY schema.

**Word count:** **342 → 567** body words. The guard is now a band of 550–750 (`audit.py`: `WORD_MIN, WORD_MAX`), aiming for 550–700. The counting method is unchanged: page words minus `meta.json`.

**Departures from the advice**
1. **Draft/extracted pair → one snapshot of our own run.** The deck's MRSA PNGs are raster with text under 24 pt, and the PDF has no rasters. The "extracted" half is already the receipt's BALANCE DUE 0 + PROMOTED.
2. **Machine drawn as a one-line chain**, not a pen sketch. No room for a sketch in the band.
3. **No corpus counts** (420 notes, 56 Molds…). They aren't needed for the explanation and they date the poster.
4. **No pipeline count**, as advised. The runs are labelled by their real pipelines' lanes: "PAPER" / "NEXTFLOW" into "BRIEF". Never `paper-to-galaxy`.
5. **bacass is in both places** (receipt stub and Nextflow lane), not moved off the receipt.
6. **"You are here" is a pen label + arrow**, not a pin glyph. Kalam and Plex lack a pin, and drawing one added clutter.
7. **0/15 dropped entirely**, not kept small. Note 6 reads stronger without it.

**`[[ASK]]` slots:** none. Anton's nf-core work is absent, so `SHOW_ASK=0` is **not applicable** and there is no no-ASK render.

**Open questions**
1. Title: "The Galaxy Workflow Foundry" alone, or add a subtitle?
2. OK to print bacass's failed test assertion? It's the first pass/fail on this poster. DengueSeq's pass sits beside it.
3. Should station 4 (template) be red too? `draft-validate` also passes on the template, but the run record doesn't show it as gated.
4. Orbit wording: is "Orbit's evidence gate now refuses by default" exact enough?
5. Is the 2026-10-30 gxwf 1.15.0 replay OK as the burn-down's evidence (carried from round 3)?
6. Codex install lines were dropped for space (Codex uses `codex plugin marketplace add` / `codex plugin add`). Add them back?
7. Shop: trim or `poster-bleed.pdf`?

## Layout (top to bottom)

1. **Header.** Title, authors, affiliations; `[[QR: live results]]` placeholder top right.
2. **Thesis slip** (124 pt hero): "Make 'I don't know yet' a typed, checkable state. Then burn it down." + "31 → 0" pen note + the what-it-is lines.
3. **Route band**, as above.
4. **Three columns.**
   - Left: notes 1, 3, the draft snapshot, Use it, note 5, QR (Foundry, Install).
   - Centre: the receipt (opening balance + YAML, burn-down, BALANCE DUE 0, PROMOTED, bacass tear-off, footnote).
   - Right: notes 2, 4, 6, 7, references, QR (Draft docs, Preprint).

## Rebuild

```sh
./build.sh
```

1. **Replay** (`extract.py`): replays every draft commit of both runs through gxwf and writes `receipt.json`. Skipped, using the committed file, unless gxwf is at `$POSTER_DEPS/node_modules/.bin/gxwf` (default `/private/tmp/claude-503/known-unknowns-receipt-r4-oldschool-deps`) or `$GXWF`. The round-4 build used the committed round-3 `receipt.json`, unchanged.
2. **Route** (`extract_route.py`): reads both runs' `foundry-run.yml` (brief + galaxy), `workflow-test-result.json`, `galaxy-workflow-validation-result.json`, bacass's `workflow-debug-report.md` classification, and `git show` of the DengueSeq draft at `daf2928` and `b82fa5e`. Writes `route.json`, and asserts both runs share the same 11 phases. Without `~/projects/foundry-runs` (or `$FOUNDRY_RUNS`), it uses the committed `route.json`.
3. **QR** (`make_qr.py`): vector SVGs.
4. **Render** (`render.py`, Typst 0.15.0 via `uvx --from typst==0.15.0 python`): `poster.pdf`, `poster-bleed.pdf`, `preview.png`.
5. **Audit + checks**: `audit.py` on both PDFs; `pdftoppm` writes `checks/` (1056 px 25%, greyscale 1500 px, 200 px thumb).

The uv cache is under `/private/tmp/claude-503/known-unknowns-receipt-r4-oldschool-deps/uvcache` (override with `UV_CACHE_DIR`). No `node_modules` or symlinks in the vault.

**To edit copy:** title, authors, refs and QR captions are in `meta.json`. Everything else is in `poster.typ`, in these blocks: `thesis strip`, `route band`, `margin notes`, `draft snapshot clipping`, and the `Use it` clipping. `sys_inputs={"gates": "0"}` skips the layout gates for drafts.

**Build gates (fail the build):**
- `poster.typ`:
  - margin blocks overlapping within a column (notes, clippings, references, QR rows), or a column past the bottom margin;
  - receipt stub into the footnote, or the footnote off the slip;
  - any QR code under 2.5 in.
- `audit.py`:
  - a non-vendored or unembedded font;
  - any text under 24 pt;
  - body words outside 550–750.
- `extract.py`: YAML-diff unresolved steps disagree with gxwf's survey.
- `extract_route.py`: the two runs' phase lists differ, or any phase is not `done`.

**Checked by hand (round 4):**
- All 4 QR codes decode to their URLs (OpenCV, 60 dpi render).
- Both PDFs: 0 raster images. `poster.pdf` is 44.0 in; `poster-bleed.pdf` is 44.25 in.
- Bleed vs trim at 72 dpi: same layout. Max per-channel difference 13/255, which is anti-aliasing noise in two small regions.
- Text at 24–27 pt is labels only: station and lane names, gate tags, graph node names, the BRIEF box, references. All sentences are ≥ 28 pt.

## Fonts

See the Round 5 section above. In short: Courier Prime Bold, Special Elite, Oswald SemiBold, IBM Plex Serif, IBM Plex Mono and Kalam (OFL / Apache 2.0), all vendored in `fonts/` and embedded.

## Sources for every fact

| On the poster | Source |
| - | - |
| Burn-down: DengueSeq TODO 31 → 27 → 24 → 19 → 13 → 9 → 4 → 0; concrete steps 0 → 7 of 7; "ok" at every commit | Replay of `~/projects/foundry-runs/dengueseq-denv3/dengueseq-denv3-galaxy` commits `bd40715 80de2f3 3556725 658af4e daf2928 d366ab3 07062a2 b82fa5e` through `gxwf draft-validate --json --concrete --connections` and `draft-next-step`. @galaxy-tool-util/cli 1.15.0, run 2026-10-30 (`receipt.json`). Not the run's own record. |
| bacass stub 7 → 6 → 1 → 0; 3 steps resolved; valid at every commit; promoted `ad86a85` | Same replay over `bacass-sr-assembly-galaxy` commits `1da586d f2c80bc a0b8701 367fc33`; `ad86a85` writes `class: GalaxyWorkflow`. |
| Per-row step, tool and version | YAML diff between commits (`extract.py: drafty()`), asserted against gxwf's survey. |
| Promoted at `b82fa5e`; run window 18:44–19:39 (−04:00) | `galaxy-workflow.gxwf.yml` @ `b82fa5e`; commit times of `bd40715`, `b82fa5e`. |
| YAML excerpt (`map_reads`) | `git show bd40715:./galaxy-workflow-draft.gxwf.yml`, abridged with "…". |
| Route: PAPER lane = `summarize-paper` → `freeform-summary-to-workflow-brief`; NEXTFLOW lane = `summarize-nextflow` → `nextflow-summary-to-workflow-brief` | `dengueseq-denv3-brief/foundry-run.yml` (`paper-to-workflow-brief`), `bacass-sr-assembly-brief/foundry-run.yml` (`nextflow-to-workflow-brief`), via `route.json`. Station labels are plain-English short forms. |
| BRIEF "human-reviewed" | `dengueseq-denv3/review.md` (John, 2026-10-20) and `bacass-sr-assembly/review.md` (John, 2026-10-16). |
| 11 shared stations, in order | Both `*-galaxy/foundry-run.yml` (`workflow-brief-to-galaxy`; phases 1–11: interface, data-flow, compare-against-iwc-exemplar, template, advance-galaxy-draft-step, test-data-resolution, test-plan, implement-galaxy-workflow-test, validate-galaxy-workflow, run-workflow-test, debug-galaxy-workflow-output). |
| "×7 for DengueSeq" | DengueSeq `foundry-run.yml` phase 5 `iterations: 7`, which matches the 7 burn-down rows. |
| Gate stations: 5 gxwf, 9 gxwf, 10 Planemo | Station 5: `advance-galaxy-draft-step` ends each pass with `gxwf draft-validate --concrete` (`../../research/r1-foundry-system.md` §2.1). Station 9: `galaxy-workflow-validation-result.json` `command: gxwf validate …`. Station 10: `workflow-test-result.json` `planemo`. |
| "DengueSeq: test passed" | DengueSeq `workflow-test-result.json` `status: pass` (1 test selected; the optional secondary test was not run). |
| "bacass: 1 assertion failed; debug blamed the assertion, not the workflow" | bacass `workflow-test-result.json` `status: fail`, `failed: 1`; `workflow-debug-report.md` `classification: assertion-mismatch (assertion-choice defect; not an output regression)`, `workflow_defect: false`. |
| "bacass passed every static check" (note 7) | Replay `all_valid` (every draft commit); `galaxy-workflow-validation-result.json` `status: pass` (gxwf validate --strict --connections); `workflow-test-result.json` `static_validation.valid: true` (gxwf validate-tests). |
| Draft snapshot: 7 steps, edges, 4 concrete / 3 `TODO_` at `daf2928` | `git show daf2928:./galaxy-workflow-draft.gxwf.yml` via `extract_route.py` (`route.json` `graphs.draft`). A step is concrete when no `TODO` appears outside its `_plan_*` keys; edges come from `in:` sources. |
| "knowledge base → Mold → cast → skill + provenance record" | `foundry-pattern.mdx` machine (`/slides/foundry-pattern/foundry-machine.svg`); dossier §3.2–3.3. |
| What-it-is line | Dossier §2 one-breath. "Out: … its test, and a ledger" = phase artifacts `galaxy-workflow.gxwf.yml`, `galaxy-workflow.gxwf-tests.yml`, `open-requirements.ledger.yml` (`foundry-run.yml`). |
| Note 4: find tool on the Tool Shed, pin a revision | r1 §2.1 (leaf Molds of `advance-galaxy-draft-step`); `galaxy-tool-pin.json` written each iteration (`foundry-run.yml` phase 5). Says "pins", not "verified". |
| Notes 1–3, 5 | `LT:32-72`, `LT:93`, `LT:101-114`, `GCC:962-1037`, `GCC:1002`. |
| Note 6: "The model translates and repairs. The tools validate." | `FP:1092`, `FP:1046`. |
| Note 6: guidance not enforcement; `tximport` caught before execution; evidence gate refuses by default | Baker et al. 2026 preprint p.16; p.4, pp.15–16, Fig S3A; pp.17–18 post-v0.8.0 (`../../research/r7-biorxiv-preprint.md` §5.3, §6; `../FEEDBACK_ROUND3.md` fix 1). |
| Note 7 quote | `QA:466`. |
| Use it: `/plugin marketplace add galaxyproject/foundry`, `/plugin install foundry-skills@galaxy-workflow-foundry` | r1 §8 (Foundry `README.md` @ `bc79096`). |
| `npm i -g @galaxy-tool-util/cli` | `GCC:459` (`npm install -g @galaxy-tool-util/cli`). |
| `gxwf draft-validate` / `gxwf draft-next-step wf.gxwf.yml` | `LT:93`, `LT:108`. |
| QR: The Foundry | `https://galaxyproject.github.io/foundry/` (dossier §6) |
| QR: Install the skills | `https://galaxyproject.github.io/foundry/usage/` (dossier §6; r1 §8) |
| QR: Draft format docs | `https://jmchilton.github.io/galaxy-tool-util-ts/#/guide/draft-format` (`LT:132`) |
| QR: Preprint | `https://doi.org/10.64898/2026.10.26.761864` |
| Refs [2], [3] | `dengueseq-denv3/source-selection.md`; `bacass-sr-assembly-galaxy/workflow-brief.md` |

`LT` = `gcc2026-lightning.mdx`, `GCC` = `gcc2026.mdx`, `FP` = `foundry-pattern.mdx`, `QA` = `foundry-qa.mdx`, all in `~/projects/repositories/jmchiltondotnet/src/content/slides/` @ `ac69980`. Run paths are under `~/projects/foundry-runs/`.

## Placeholders

- **`[[QR: live results]]`** sits top right. When its URL exists:
  1. add it to `LINKS` in `make_qr.py`;
  2. swap the `placeholder(...)` for `image("assets/qr-live.svg", …)`;
  3. add it to the QR gate loop.
- No `[[ASK]]` slots.
