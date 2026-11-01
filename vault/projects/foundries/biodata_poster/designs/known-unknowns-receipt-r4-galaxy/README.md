# known-unknowns-receipt (round 5, Galaxy style)

Galaxy-style restyle of `../known-unknowns-receipt-r4/` (left untouched for side-by-side). Same text, facts, receipts, QR codes, layout and density. Only tokens, fonts and surfaces changed, per `../STYLE_GALAXY.md`.

## Round 5 styling (Galaxy)

**What changed**

| Element | Claude style (r4) | Galaxy style (this copy) |
| - | - | - |
| Page | warm paper `#f2efe4`, grey grid | `gx-page` `#edf4fa`, 0.25 in grid in `gx-grid` / `gx-grid-major` |
| Header | black Archivo Black title on paper | full-bleed masthead band: 135° `gx-dark` → `gx-primary` gradient, 0.5 in grid of 1 pt white at 3%, 0.25 in gold bar under it. White Atkinson 700 title (−0.02 em), last word "Foundry" in gold, gold vertical accent bar. Authors white 700, affiliations `gx-tape`. White Galaxy logo (vector, from `galaxy-hub/content/images/galaxy_logo_white.svg`) once, top right |
| `[[QR: live results]]` | ochre dashed box | white rounded tile, `gx-gold-dark` dashed border, `gx-primary` text, so the future QR lands dark on light |
| Thesis slip | cream slip, square | white card, 0.25 in radius, 0.12 in gold left bar (featured), `gx-shadow` offset 0.08 in. Hero in Atkinson 700; `hl-hero()` fill `gx-hl`. Description 34 → 36 pt (fills the room Atkinson frees) |
| Route band | navy track, red gate squares | spine `gx-primary` 8 pt; source lanes `gx-info` 7 pt; open stations white with `gx-primary` ring and Atkinson 700 numerals; gates (5, 9, 10) `gx-dark` rounded squares ringed in gold; BRIEF box gold with `gx-dark` text (no longer rotated); gate tags `gx-dark` mono; band heading Atkinson 700 `gx-dark` |
| Receipt | cream, Plex Mono | white slip, square, torn bottom kept; Atkinson Hyperlegible Mono in `gx-dark`; 0.06 in `gx-primary` printer strip on the top edge; `gx-shadow`; YAML rule `gx-primary`; empty squares `gx-grid-major` |
| PROMOTED stamp | red, single border | `gx-ok` green, double border (7 pt + 2.5 pt), Atkinson 700; moved 0.4 in right and 0.24 in up, and 50 pt (was 54), so it clears the wider mono line "GalaxyWorkflowDraft → GalaxyWorkflow" |
| Tape | flat cream rect | opaque `gx-tape` with a 1.2 pt `gx-grid-major` edge and saw-tooth ends; same angles and spots |
| Clippings | cream, square | white cards, 0.25 in radius, soft shadow. "Use it" is the featured card (gold left bar, Atkinson 700 title, `gx-primary` command rules, mono commands at −0.02 em tracking, card 0.1 in wider so the install line fits on one line) |
| Draft snapshot | white boxes | concrete steps `gx-tint` boxes with `gx-primary` 4.5 pt stroke, 0.08 in radius; `TODO_` steps dashed `gx-grey` |
| Pen notes | Kalam navy | Kalam `gx-primary`; badges are filled `gx-primary` discs with white Atkinson 700 numerals; leader arrows 4.5 pt (were 5.5) |
| Body prose | Plex Mono | Atkinson Hyperlegible (notes 6/7 prose, route labels, captions) |
| QR codes | `#1d1d1b` on white, square | `#000000` on white (`make_qr.py`), 4-module quiet zone kept, inside a 0.25 in radius white tile; captions `gx-dark` 28 pt |
| References | right column, grey 24 pt | flat `gx-deep` footer band (43.1 in → bottom, full bleed), white 24 pt, one line each. The receipt's torn edge clears it; both columns now gate against the band top instead of the bottom margin |
| Right column | — | note 7 moved down 0.8 in to fill the space the refs left |

**Fonts** (all vendored in `fonts/` with their OFL texts, embedded in both PDFs):
- Atkinson Hyperlegible Regular / Bold (Italic, BoldItalic vendored, unused): SIL OFL 1.1, Braille Institute. From `google/fonts` `ofl/atkinsonhyperlegible`.
- Atkinson Hyperlegible Mono Regular / SemiBold / Bold: SIL OFL 1.1. Static TTFs from `googlefonts/atkinson-hyperlegible-next-mono` `fonts/ttf/` (Google Fonts ships only the variable file).
- Kalam Regular / Bold: SIL OFL 1.1 (pen notes, unchanged).
- IBM Plex Mono Regular / Bold: SIL OFL 1.1. Kept only as the glyph fallback for `→`, which Atkinson, Atkinson Mono and Kalam all lack. It is the last entry in every font stack.
- Archivo Black, Plex Mono SemiBold and Italic removed from `fonts/`. `audit.py`'s allow-list is now the set above.

**Departures from the guide**
1. **Hero mark.** The title has no "receipts"; the gold hero mark is "Foundry".
2. **Line weights scaled to 44 in.** Spine 8 pt (guide 4 pt), leader arrows 4.5 pt (guide 2.5 pt). The guide's values read as hairlines at 6 ft on the 25% render; the source used 9 / 5.5 pt.
3. **Source lanes in `gx-info`** (guide lists it as a route-line accent) to separate the two inputs from the shared spine.
4. **Gate stations stay square** (rounded 0.08 in), not circles, so they separate from open stations in greyscale by shape, not only by fill.
5. **Dot leaders in `gx-grey`, not `gx-rule`.** `#dee2e6` on white vanished at 100 ppi and in greyscale.
6. **Band heading and "Use it" title in Atkinson 700 `gx-dark`** (were Kalam), since they are section/card titles. Pen notes keep Kalam.
7. **Thesis stays a taped slip under the masthead,** not merged into the band: the poster has a separate title and thesis, and the tape metaphor stays on every slip.
8. **Stamp text uses Atkinson 700** (Atkinson has no black weight).
9. **PROMOTED counts as a pass stamp** (`gx-ok`). No FAIL/REFUSED stamps on this poster, so `gx-danger` is unused.
10. **Highlights on notes sit on `gx-page`, not white,** as in r4. They show in colour; in greyscale they fade (guide predicts this). The emphasis is redundant with the text, so nothing is lost.

**Word count:** 567 body words (source 567). `audit.py` band tightened to 539–595 (±5%).

**Checks (round 5):** audit passes on both PDFs (fonts vendored + embedded, no text < 24 pt). Layout gates pass, plus a new gate that the receipt's torn edge clears the footer band. 0 raster images (the logo SVG compiles to vector). Plex Mono spans are only `→` (pymupdf). Gradient angle checked on a render: `gx-dark` on the left, `gx-primary` on the right. All 4 QR codes decode (OpenCV, 60 dpi). Bleed vs trim at 72 dpi: max per-channel difference 3/255; masthead and footer reach the bleed edge. `receipt.json`, `route.json`, `assets/qr.json` byte-identical to r4.

**Open questions**
1. Gold "Foundry" as the hero mark, or keep the whole title white?
2. Footer band for refs OK, or back to the right column?
3. Slashed zeros: Atkinson (sans and mono) slashes `0`, so "BALANCE DUE 0" reads `Ø`-like. OK, or swap the receipt to Plex Mono?
4. Ask the printer for a proof of `#ffd700` (edge of CMYK gamut).

---

# Round 4 notes (carried from `../known-unknowns-receipt-r4/`)

Round-4 revision of `../known-unknowns-receipt/` (left untouched for before/after). Same identity: graph paper, the taped thesis slip, the burn-down receipt with BALANCE DUE 0 + PROMOTED, numbered pen notes that point at receipt lines, "Rails, not reminders". What changed is the scope: the receipt is now one stop on a drawn Foundry run.

## Round 4 changes

**Why:** John ranked this #1 ("what it does is very clear", "Rails, not reminders" still nice) but "too specific": it taught the draft format, not the Foundry. Round 4 also asks every poster to say what the Foundry *does* and how to *use* it, at higher density.

**What changed**

| Change | Why |
| - | - |
| Title is now **The Galaxy Workflow Foundry** (was "A Draft Format for Agent-Built Galaxy Workflows"). | The Foundry was named only in a QR caption. |
| One-breath "what it is" + "In: a paper or a Nextflow pipeline. Out: a Galaxy workflow, its test, and a ledger of what is still open." under the thesis. | Advice §1 "one line under the thesis"; dossier §2. |
| New **route band** "What a Foundry run does": PAPER (DengueSeq) and NEXTFLOW (bacass) lanes → human-reviewed BRIEF → the 11 shared stations of `workflow-brief-to-galaxy`. Red squares mark stations where a program checks the work (5 gxwf draft-validate, 9 gxwf validate, 10 Planemo). Station 5's tag is deliberately not "Tool Shed": only 5 of 7 DengueSeq pins pass VERIFY. Station 5 carries a loop mark "×7 for DengueSeq" and "you are here: station 5, below" with an arrow into the receipt. Top right: where both runs ended. | Advice change + ideas (a) and (b); round-4 general note asking for a paper/Nextflow → Galaxy pipeline diagram. Data from `route.json`. |
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
- DengueSeq tools: the poster says "pins a revision", never "verified", and station 5's red gate tag reads `gxwf` (the draft-validate check behind the receipt's squares), not "Tool Shed". Nothing implies all 7 pins pass `discover-shed-tool`'s VERIFY schema.

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

1. **Replay** (`extract.py`): replays every draft commit of both runs through gxwf and writes `receipt.json`. Skipped, using the committed file, unless gxwf is at `$POSTER_DEPS/node_modules/.bin/gxwf` (default `/private/tmp/claude-503/known-unknowns-receipt-r4-galaxy-deps`) or `$GXWF`. The round-4 build used the committed round-3 `receipt.json`, unchanged.
2. **Route** (`extract_route.py`): reads both runs' `foundry-run.yml` (brief + galaxy), `workflow-test-result.json`, `galaxy-workflow-validation-result.json`, bacass's `workflow-debug-report.md` classification, and `git show` of the DengueSeq draft at `daf2928` and `b82fa5e`. Writes `route.json`, and asserts both runs share the same 11 phases. Without `~/projects/foundry-runs` (or `$FOUNDRY_RUNS`), it uses the committed `route.json`.
3. **QR** (`make_qr.py`): vector SVGs.
4. **Render** (`render.py`, Typst 0.15.0 via `uvx --from typst==0.15.0 python`): `poster.pdf`, `poster-bleed.pdf`, `preview.png`.
5. **Audit + checks**: `audit.py` on both PDFs; `pdftoppm` writes `checks/` (1056 px 25%, greyscale 1500 px, 200 px thumb).

The uv cache is under `/private/tmp/claude-503/known-unknowns-receipt-r4-galaxy-deps/uvcache` (override with `UV_CACHE_DIR`). No `node_modules` or symlinks in the vault.

**To edit copy:** title, authors, refs and QR captions are in `meta.json`. Everything else is in `poster.typ`, in these blocks: `thesis strip`, `route band`, `margin notes`, `draft snapshot clipping`, and the `Use it` clipping. `sys_inputs={"gates": "0"}` skips the layout gates for drafts.

**Build gates (fail the build):**
- `poster.typ`:
  - margin blocks overlapping within a column (notes, clippings, QR rows);
  - receipt stub into the footnote, or the footnote off the slip;
  - any QR code under 2.5 in;
  - (round 5) the receipt torn edge or either column running into the footer band.
- `audit.py`:
  - a non-vendored or unembedded font;
  - any text under 24 pt;
  - body words outside 539–595 (round 5: source 567 ±5%).
- `extract.py`: YAML-diff unresolved steps disagree with gxwf's survey.
- `extract_route.py`: the two runs' phase lists differ, or any phase is not `done`.

**Checked by hand (round 4):**
- All 4 QR codes decode to their URLs (OpenCV, 60 dpi render).
- Both PDFs: 0 raster images. `poster.pdf` is 44.0 in; `poster-bleed.pdf` is 44.25 in.
- Bleed vs trim at 72 dpi: same layout. Max per-channel difference 13/255, which is anti-aliasing noise in two small regions.
- Text at 24–27 pt is labels only: station and lane names, gate tags, graph node names, the BRIEF box, references. All sentences are ≥ 28 pt.

## Fonts

Round 5: see "Round 5 styling (Galaxy)" above. (Round 4 used Archivo Black, IBM Plex Mono and Kalam.)

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
| Red stations: 5 gxwf, 9 gxwf, 10 Planemo | Station 5: `advance-galaxy-draft-step` ends each pass with `gxwf draft-validate --concrete` (`../../research/r1-foundry-system.md` §2.1). Station 9: `galaxy-workflow-validation-result.json` `command: gxwf validate …`. Station 10: `workflow-test-result.json` `planemo`. |
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
