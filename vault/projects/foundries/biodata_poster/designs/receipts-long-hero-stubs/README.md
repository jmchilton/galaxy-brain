# receipts-long-hero-stubs

Outline 2 of `../RECEIPTS_OUTLINES.md`, built under `../FEEDBACK_ROUND3.md`, in the keepers' run-receipt language: graph paper, taped thermal slips, torn edges, rubber stamps, tear lines, Kalam pen notes. Tooling comes from `typed-not-guessed-receipt/` (hero), `known-unknowns-receipt/` (draft replay) and `skills-are-binaries-receipt/` (build stub, audit).

## The idea

- **Kicker:** GALAXY WORKFLOW FOUNDRY.
- **Hero (184 pt):** *Checked before compute.*
- **Thesis (pen, 64 pt):** "Galaxy can type-check each tool call before a job runs. The Foundry's agents write workflows that face the same check."

The poster has three receipts printed by the same printer on the same paper. Length is the argument: the type-check receipt is the longest tape on the sheet (29 in), and two short stubs are taped beside it.

1. **Hero, centre: TYPE-CHECK RECEIPT.** It is the typed-not-guessed keeper's receipt at full length: `gxwf validate rnaseq-pe.ga --connections --strict-structure --strict-state` over IWC rnaseq-pe. It prints:
   - TOOL CALLS: the 10 top-level rows plus one collapsed `inside 4 subworkflows … 24 PASS` row, ending in `Tool state: 39 validated, 0 skipped`, with the TYPED stamp;
   - CONNECTIONS, ending in `57 ok, 0 invalid`;
   - **`wall time, warm cache … < 1 s`, then `JOBS RUN … 0`** (the order is swapped, per the feedback);
   - ALL OF IWC;
   - TEAR HERE, then VOID with both planted errors.
2. **Stub, top left: GALAXY WORKFLOW DRAFT.** Eight rows: `OPENING BALANCE ok 31`, then seven `▸ step … ok N` rows, each with a printed TODO bar (31 → 0). Below them are `BALANCE DUE … 0` and a PROMOTED stamp. The bars are the poster's one data visual.
3. **Stub, bottom left: BUILD RECEIPT.** For `discover-shed-tool`, it prints:
   - `MOLD rev 5 · 05c99cba`;
   - `5 refs · 1 upfront · 4 on demand`;
   - `VERIFY galaxy-tool-pin.json · schema c0940fc0`;
   - a NEVER HAND-EDITED stamp;
   - `KEEP THIS RECEIPT.`

**What makes them one case (the outline's "must not turn into" test).** Pen marks join the three receipts:

- **Build stub → draft stub.** A pen label, "each step wrote this file: 5 of 7 pass", sits under the build stub's VERIFY line. Its arrow runs up the gutter into the draft rows. This is a real file link: each of the 7 ▸ step commits (not the opening-balance template, `bd40715`) wrote `galaxy-tool-pin.json` (`git log -- galaxy-tool-pin.json` in the run dir). That is the artifact the stub's `_verify.json` names. Not all 7 pass that check: replayed against the VERIFY schema, 5 do, and the label says so rather than implying all of them passed.
- **Note 4 → draft stub and hero.** Note 4 has two arrows. One goes up to the draft stub's `BALANCE DUE 0`. The other goes to the hero's `$ gxwf validate` command line: at 0, the plain gxformat2 gets the same full check. It points at the command, not at the 39/57 totals, because those totals belong to rnaseq-pe, not DengueSeq.
- **The thesis names agents.** Both the draft stub and the hero headers print `gxwf 1.15.0`.

**The notes:**
- Right column, each with an arrow onto a hero line:
  1. Types from the Tool Shed → TOOL CALLS
  2. Connections carry collection algebra → CONNECTIONS
  3. Caught before compute → JOBS RUN
  6. Rails, not reminders → VOID INVALID
- Left column:
  4. Known unknowns are typed
  5. Skills are binaries
- Pencil line under the hero: "Other engines check the pipeline's parameters; the flags inside each process stay free text [2]." There is no Nextflow drawing of any kind.

**QR codes** (bottom right, 2×2, real vector codes from segno at 3.35 in): Foundry, preprint, gxwf docs, GCC 2026 slides (`/slides/gcc2026/`, the full talk). The `[[QR: live results]]` placeholder is 4.0 in, top right. There is no lightning-talk QR.

**Orbit 0/15:** dropped. It is never a number on this poster. Note 6 carries the positive framing: "Skills are guidance, not enforcement; gxwf validates", and Galaxy's connection check caught the agent's `tximport` wiring.

## Rebuild

```sh
./build.sh
```

`build.sh` runs these steps:

1. **`extract.py`.** Turns the saved gxwf output in `data/` into `receipt.json` (the hero). It is offline, and it asserts every printed total against gxwf's own text summary.
2. **`extract_draft.py`.** Replays gxwf `draft-validate --concrete --connections` and `draft-next-step` over each draft commit of the DengueSeq run, and writes `data/draft.json`. It runs only when gxwf 1.15.0 is installed in the deps dir and `~/projects/foundry-runs` exists; otherwise the committed `data/draft.json` is used.
3. **`extract_build.py`.** Reads `discover-shed-tool`'s `_provenance.json`, `_required_tools.json` and `_verify.json` from the foundry clone at `origin/main` via `git show` (read-only), and writes `data/build.json`.
4. **`make_qr.py`.** Writes the QR SVGs and `assets/qr.json`.
5. **`render.py`.** Runs Typst 0.15.0 via `uvx --from typst==0.15.0`, with vendored fonts only. It writes `poster.pdf`, `poster-bleed.pdf` (44.25 in), `preview.png` (1496 px), and a word-count PDF in the deps dir.
6. **`audit.py`.** Runs on both PDFs, then with `--count` on the word-count PDF.
7. **`pdftoppm`.** Writes `checks/preview-25.png` (1056 px), `checks/preview-gray.png` and `checks/thumb-200.png`.

**Optional:** `./rerun_gxwf.sh` re-runs gxwf over IWC and refreshes `data/` for the hero. It needs network on a cold tool cache.

**Deps:**
- `uv` and poppler.
- For the replays: `npm i --prefix /private/tmp/claude-503/receipts-long-hero-stubs-deps @galaxy-tool-util/cli@1.15.0`, with `npm_config_cache` set under that directory.
- Override the location with `POSTER_DEPS`.
- Nothing is installed in the vault: no `node_modules`, no symlinks (checked with `find`).

**Debug render:** `sys_inputs={"noguard": "1"}` skips the layout asserts.

**To edit the copy:**
- The kicker, hero, thesis and authors are at the top of `poster.typ`.
- The notes are the `#note-at(...)` calls.
- The references are under `// references`.

### Build guards (the build fails on each)

| Guard | Where |
| - | - |
| Hero receipt, draft stub or build stub content taller than its slip | `poster.typ` `slip-at` |
| A note running past the next block's top (or the safe zone) | `poster.typ` `note-at` |
| Hero wider than the space left of the live-results tile; header content overflowing its slip | `poster.typ` |
| Pencil line, references or QR block past the 1 in safe zone; columns touching | `poster.typ` |
| A QR code (quiet zone excluded) under 2.5 in | `poster.typ` `qr-tile` |
| Any text under 24 pt | `audit.py`, both PDFs |
| Body text (exempt text hidden) under 28 pt | `audit.py --count` |
| Body over 400 words | `audit.py --count` |
| A non-vendored font, or any unembedded font | `audit.py` |

I tested two of the guards and both fired: the word guard with a 300-word limit, and the slip guard with the build stub shrunk to 4 in.

**Also checked:**
- All four QR codes decode to their URLs (OpenCV, 60 dpi render), and all four returned HTTP 200 on 2026-10-30.
- `poster-bleed.pdf` is 3186 pt; cropped by 0.125 in, it differs from `poster.pdf` by 0 pixels at 40 dpi.
- `pdffonts` shows all 6 used faces embedded and subset, and the PDF contains no raster images.

## Body word count

**374 / 400** (388 before the review, 371 after the first review pass).

- **How it's counted:** every whitespace token containing a letter or digit (the keeper way), in a render where only the kicker + hero, the authors, the references and the QR captions are hidden.
- **What counts:** every receipt line item, stamp, badge number and the `[[QR: live results]]` placeholder text.
- **Split by region (from the count PDF):**

  | Region | Words |
  | - | - |
  | Hero receipt, with its 2 stamps | 150 |
  | Draft stub, with its stamp | 38 |
  | Build stub, with its stamp and the 8-word bridge label | 34 |
  | Thesis (20) and placeholder (3) | 23 |
  | Notes 1, 2, 3 and 6, with badges | 77 |
  | Note 4 | 20 |
  | Note 5 | 17 |
  | Pencil line | 15 |
  | **Total** | **374** |

**Size:** the only text under 28 pt is the exempt references, at 24 pt. The smallest body text is 28 pt (receipt sub-lines and column heads).

## Fonts

All are SIL OFL fonts, vendored in `fonts/` (copied from `skills-are-binaries-receipt/fonts/`) and embedded. Typst runs with `ignore_system_fonts=True`.

| Font | Used for |
| - | - |
| Archivo Black | hero, stamps |
| IBM Plex Mono (Regular, SemiBold, Bold) | receipts, kicker, authors, refs |
| Kalam (Regular, Bold) | thesis, notes, pencil line, bridge label |

The `▸` marker is a drawn polygon, because the vendored faces lack the glyph.

## Sources for every fact

| On the poster | Source |
| - | - |
| Hero receipt: command, the 10 tool lines (15 calls), 4 subworkflows (24 calls), `39 validated, 0 skipped`, `57 ok, 0 invalid` (top level), `list:paired → fastp map over list`, 5 map-overs, 13 reductions, both VOID messages | `data/validate.json`, `data/validate.txt`, `data/void-param.json`, `data/void-conn.json` (copied from `typed-not-guessed-receipt/data/`). Generated by `rerun_gxwf.sh` with `@galaxy-tool-util/cli@1.15.0` over IWC `23ccd9915`, run 2026-10-30. `extract.py` asserts the totals. |
| `wall time, warm cache < 1 s` | `data/timing.txt`: 0.57–0.70 s over 5 warm runs (`typed-not-guessed-receipt/README.md`) |
| `JOBS RUN 0` | `gxwf validate` is static and runs no Galaxy jobs |
| ALL OF IWC: 133 workflows · 3,217 validated · 0 failed · 1 skipped (version mismatch in file) | `data/iwc-tree-summary.json`; the skip's cause is in the typed-not-guessed README |
| Draft stub: TODO 31 → 27 → 24 → 19 → 13 → 9 → 4 → 0; the step names in order; `ok` at every commit | `data/draft.json`, replayed by `extract_draft.py` on 2026-10-30 over `~/projects/foundry-runs/dengueseq-denv3/dengueseq-denv3-galaxy` commits `bd40715 80de2f3 3556725 658af4e daf2928 d366ab3 07062a2 b82fa5e`, with gxwf 1.15.0. The `todo` is `survey.todo_count`. "ok" means `ok`, `concrete.ok` and connections valid, with 0 failed and 0 skipped tools. Its `series.denv` is identical to the keeper `known-unknowns-receipt/receipt.json` (`jq -S` + `diff`, 2026-10-30). **It is a replay, not the run's own log**, and the references say so. |
| PROMOTED (`GalaxyWorkflowDraft → GalaxyWorkflow` at `b82fa5e`) | `data/draft.json` `promoted`; `galaxy-workflow.gxwf.yml` at `b82fa5e` |
| Build stub: `discover-shed-tool`, MOLD rev 5, `05c99cba`, 5 refs (1 upfront, 4 on demand), `VERIFY galaxy-tool-pin.json`, schema `c0940fc0`, foundry `eb2de3f1` | `data/build.json` from `extract_build.py`: `casts/claude/skills/discover-shed-tool/{_provenance.json,_verify.json}` at `galaxyproject/foundry` origin/main `eb2de3f1` (2026-10-30). Same values as `skills-are-binaries-receipt/receipt.json`. |
| "each step wrote this file: 5 of 7 pass" (bridge) | `git log -- galaxy-tool-pin.json` in the run dir lists exactly the 7 phase-5 commits `80de2f3 … b82fa5e`. `foundry-run.yml` lists a `galaxy-tool-pin` artifact for iterations 1–7. `_verify.json` names `galaxy-tool-pin.json`, the `discover-shed-tool` output. `advance-galaxy-draft-step`'s SKILL.md routes Tool Shed steps through discover-shed-tool. **5 of 7 pass:** each commit's `galaxy-tool-pin.json` (`git show <sha>:./galaxy-tool-pin.json`) was validated with Python `jsonschema` against the cast's `references/schemas/galaxy-tool-discovery.schema.json` at `eb2de3f1`, whose sha256 starts `c0940fc0` and matches VERIFY's `--schema-sha256`. `d366ab3` (bedtools_genomecoveragebed) and `b82fa5e` (tp_sed_tool) fail on `alternates[0]`: `tool_shed_url` and `trs_tool_id` are required. The other 5 pass. This confirms another designer's replay. It was not run through the `foundry validate-galaxy-tool-discovery` binary itself. |
| NEVER HAND-EDITED; KEEP THIS RECEIPT | `skills-are-binaries-receipt/README.md` (`QA:790`, `FP:172`; `FP:563-592`) |
| Note 1: typed schemas for 10,000+ tools | `vault/papers/gxwf/manuscript.md:5,146` ("served by the ToolShed for more than 10,000"); typed-not-guessed README (`GCC:408`) |
| Note 2: list of pairs into a paired input is a map-over, inferred; a flat list is rejected | `data/validate.json` (fastp `mapping: list` from `list:paired`); `data/void-conn.json` (`collection<list>` vs `collection<paired>`) |
| Note 3: one-letter typo fails before any job; CLI, editor, browser and CI share one core | `data/void-param.json` (`PE_fragment` for `PE_fragments`); `manuscript.md` Abstract (CLI, VS Code extension, browser editor, CI). The "under a second" claim was dropped from the note (review item 2); only the receipt's CLI-qualified `< 1 s` line remains. |
| Note 4: `TODO_*` sentinels checked at every resolution; at 0, plain gxformat2 gets the full check | `data/draft.json`; the run's phase 9 `galaxy-workflow-validation-result.json` (`gxwf validate --json --connections --strict`, status pass, tool_state 7/0/0, recorded with cli 1.14.0); known-unknowns README (`GCC:1002`, "promotes to ordinary gxformat2") |
| Note 5: the skills that wrote this draft are compiled from notes | `foundry-run.yml` phases 1–11 are all `kind: mold` skills, and each of the 11 has `casts/claude/skills/<skill>/_provenance.json` at `eb2de3f1` (checked with `git cat-file`). The run record has `foundry_head: null`, so the poster does not claim which cast revision ran. |
| Note 6: "Skills are guidance, not enforcement"; Galaxy's connection check caught an agent's bad `tximport` wiring before execution | Preprint [1] p.16; p.4, pp.15–16, Fig S3A (`research/r7-biorxiv-preprint.md` §5.2, §6). It is worded "Galaxy's connection check" because, per the preprint, the Galaxy editor flagged it, not the gxwf CLI. |
| Pencil line: other engines check pipeline parameters; per-process flags are free text [2] | `vault/papers/gxwf/manuscript.md:136-145` (Table 1: per-tool invocation validation is No for Nextflow, Snakemake and WDL) |
| Ref [1] | Baker et al. 2026, bioRxiv doi:10.64898/2026.10.26.761864 |
| Ref [2] | `manuscript.md` title. There is no author list, because the manuscript is in preparation. |
| Run citation (references only) | Vogels et al. 2024, *BMC Genomics* 25:433 (known-unknowns README) |

## `[[ASK]]` slots

- **None**, per the outline. Anton's nf-core work is absent. There is no `SHOW_ASK` flag, so there is no SHOW_ASK=0 render (not applicable).
- **`[[QR: live results]]`** is the only placeholder, and it always renders. Once the URL exists:
  1. add it to `LINKS` in `make_qr.py`;
  2. swap the `placeholder(...)` for `image("assets/qr-live.svg", width: live-w)`.

## Departures from the outline

1. **The thesis says "write workflows that face the same check", not "write the same format".** The hero validates a native `.ga`, while the agents write Format 2 (`.gxwf.yml`). "Same check" is true: the run's phase 9 ran `gxwf validate --connections --strict`, and every draft commit passes `gxwf draft-validate`. "Same format" was loose.
2. **"All 15 top-level lines" are printed as 10 lines (15 calls).** That is how `extract.py` groups the 15 top-level tool calls (`map_param_value` ×4, `multiqc` ×2, `pick_value` ×2), as in the keeper.
3. **"printed from gxwf's JSON report"**, the keeper's last receipt line, moved to the references, which are exempt. It saved 5 words; nothing else inside the hero receipt was cut.
4. **Small additions to the stubs:**
   - The draft stub header adds `gxwf 1.15.0` and a `draft-validate · TODO` column head, so the stub visibly shares the hero's check.
   - The opening balance is a bar row, so the bars run 31 → 0.
   - The build stub header adds `foundry @ eb2de3f1`.
5. **The bridge pen label "each step wrote this file: 5 of 7 pass"** was not in the outline. It is the real file link (`galaxy-tool-pin.json`) between the two stubs, and it answers the outline's "must not turn into two stickers" test.
6. **Note copy, trimmed to fit 400 words:**
   - Note 1 drops "community" and "select".
   - Note 2: "List of pairs into a paired input: map-over, inferred. Flat list: rejected."
   - Note 3 drops "flag", because the planted typo is a parameter value, not a flag.
   - Note 5 is reworded from "the agent that wrote the draft is itself compiled". `discover-shed-tool` is the skill the drafting skill calls, not the drafting agent. The new wording, "the skills that wrote this draft are compiled from notes", is true of all 11 phase skills.
   - Note 6 drops "The model translates and repairs" and keeps "gxwf validates".
   - Note 4 gains "at 0, plain gxformat2 gets the full check", which is what its arrow onto the hero's command line says.
7. **QR placement:** all four QRs sit in a 2×2 block at the bottom right, not a bottom row. A 29 in hero, the pencil line and a 4 in QR row don't all fit above the 43 in safe line. The references sit at the bottom left.
8. **Orbit 0/15 is dropped** (the outline allowed it).

## Iterations

- **v1.**
  - The hero at 196 pt hit the live-results tile, so the width guard now sets it to 184 pt.
  - The left column overflowed: note 4 ran into the build stub, and note 5 into the QR codes.
  - The pen label collided with the NEVER HAND-EDITED stamp.
  - The wall-time and JOBS RUN lines touched.
  - The body was 408 words.
- **v2.**
  - The hero receipt is longer (29 in), and the 1fr spacing gives it air.
  - The QR codes moved to a 2×2 block at the right.
  - The pen label has its own line, under VERIFY.
  - The stamps moved off the text, and wall time and JOBS RUN are each 56 pt with spacing.
  - The notes were trimmed, which brought the body to 388 words.
- **v3.**
  - The note 4 → hero arrow moved off `Tool state: 39` (an rnaseq-pe total) onto the command line.
  - The bridge label changed from "every draft row" to "each step row", because the opening-balance row did not write a pin file.
  - The highlight on a wrapped note line painted over the underscore in `TODO_*` on the line above. The highlight now starts at cap height.
  - The note 4 → hero arrow now starts in the gutter instead of over the text.
  - The QR caption is shortened to "GCC slides".
- **Checks on the final render:**
  - At 25%, the hero, the thesis, JOBS RUN 0, the burn-down bars, the stamps and every note head read.
  - A passer-by gets "checked before compute; agents' workflows face the same check" from the header alone.
  - In greyscale, the stamps go dark grey and the highlights light grey; nothing depends on hue.
  - The densest block is the hero's TOOL CALLS list. After the review it is 11 rows (the subworkflows collapsed); the slip stays 29 in.

## Open questions

1. **Thesis wording:** is "write workflows that face the same check" OK, or keep the outline's "write the same format"? The latter is loose, because the hero is `.ga`.
2. **Hero receipt workflow:** should it validate the Foundry's own promoted DengueSeq Format 2 workflow instead of IWC rnaseq-pe? Then "same check" becomes literal, but the receipt is shorter (7 tools), and length is the argument.
3. **Draft replay:** is a 2026-10-30 replay with gxwf 1.15.0 acceptable, given that the run used 1.14.0? The phase 9 record says 1.14.0.
4. **0/15:** dropped. Do you want it back as one attributed 28 pt line under note 6? It costs about 15 words.
5. **"Lists in the middle":** answered by the review, and applied: the four subworkflow rows are collapsed into one, and the 10 per-tool rows stay as the evidence for "each tool call". If you want more air, the next cut is dropping the grey version strings from those 10 rows.
6. **Slides QR:** keep GCC 2026 (`/slides/gcc2026/`), or swap it for `foundry-pattern`?
7. **Shop:** edge-to-edge on the trim, or `poster-bleed.pdf`?

## Applied review (`REVIEW.md`)

| # | Item | Status |
| - | - | - |
| 1 | NICE: collapse the 4 subworkflow rows into `inside 4 subworkflows … 24 PASS` | **Applied.** The TYPED stamp is re-anchored too, but not at the suggested `a-state − 0.95in`, which put it on top of the `Tool state` total. It sits in the blank band under the total, at the right. The version strings are kept (John decides). |
| 2 | MUST: note 3 drops "under a second" (implied benchmark) | **Applied.** Note 3 now reads "CLI, editor, browser and CI: one core." |
| 3 | NICE: thesis "Galaxy can type-check" | **Applied.** |
| 4 | NICE: NEVER HAND-EDITED stamp at −2°, `− 1.38in` | **Applied.** |
| 5 | NICE: bridge label "each step row wrote this file" | **Applied.** |
| 6 | NICE: `featureCounts` → `featurecounts` on the VOID line | **Applied.** |
| 7 | NICE: note 4 "each resolution" | **Applied.** |
| 8 | NICE: `#box[map-over]` so it doesn't break at the hyphen | **Applied.** |
| 9 | NICE: shorter provenance sentence in the references | **Applied**, keeping the journal name. I also fixed the `;` after `#d.iwc` and `#dgx`, which Typst swallowed; they are now escaped. |
| 10 | NICE: note 1 head orphan | **Applied differently.** I kept the outline's wording, "Types from the Tool Shed", and set a manual break, "Types from / the Tool Shed", so no word sits alone. The rewording, "Tool Shed types", would depart from the outline's note head. |
| — | Aside: put `fastp` first instead of `__FLATTEN__` | **Skipped.** The rows follow the workflow's own step order from `validate.json`; reordering them would edit the evidence. |

**After the review:**
- **Build:** `./build.sh` passes every guard: slips, notes, header, QR size, safe zone, < 24 pt, body < 28 pt, fonts, words.
- **Words:** the body is 371 after the first pass, 374 after the second.
- **Exports:**
  - `poster-bleed.pdf` diffs to 0 against `poster.pdf`.
  - All 4 QR codes decode.
  - All 6 fonts are embedded.
  - The only spans under 28 pt are the 8 lines of 24 pt references.
- **Vault:** no `node_modules` or symlinks.
- **Preview:** I re-read `preview.png`.

**Second pass (coordinator):**

| Item | Status |
| - | - |
| Highlighter clips descenders on the line above | **Applied.** `hl()` now starts at `x-height` instead of `cap-height` (the hero has no highlight). A 100 ppi crop of note 4 shows `TODO_*` and the line above "resolution" fully legible. |
| VERIFY implies all pins pass (5/7 finding) | **Applied, by rewording.** The bridge label is now "each step wrote this file: 5 of 7 pass". I kept the VERIFY row, because it names the file and so carries the stub-to-stub link. The label now claims the write and states the replayed result. I verified the result myself (see Sources). If you'd rather print no count, the fallback is "each step wrote this file", with the VERIFY row dropped. |

**After the second pass:**
- **Build:** rebuilt; every guard passes.
- **Words:** the body is 374.
- **Preview:** I re-read `preview.png`.
- **Vault:** no `node_modules` or symlinks.

