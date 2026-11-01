# known-unknowns-transit: the draft format as a transit map

Pitch **`known-unknowns`** (`../PITCHES.md`, Pitch 2), built in the visual language of `../transit-vision-v2/`
(lines, stations, interchanges, a terminus, a key that teaches, Overpass signage type, navy/amber/green).
CSHL Biological Data Science 2026, 44 in × 44 in, 1 in safe margin.

## The idea

- **Hero (140 pt, white on black):** *Make "I don't know yet" a typed, checkable state, then burn it down.*
  Under it, a short Rumsfeld quote in amber ("known knowns… known unknowns").
- **The map is the burn-down chart.** It is the poster's only data visual.
  - Three real Foundry runs are three lines. They leave a shared origin (a reviewed workflow brief) on
    solid track and pass the planning stations (Interface, Data flow, IWC exemplar).
  - At the tall **Template** interchange each line rises to the number of `TODO` sentinels its first
    draft declared: 31, 7 and 2.
  - The lines then step down **one station per `advance-galaxy-draft-step` iteration**: 7, 4 and 2,
    from each `foundry-run.yml`. Height above the line's ground lane is the number of `TODO` sentinels
    left. bacass's 4th iteration is the `draft-extract` commit, so its last stop sits at 0 like the 3rd.
  - Track is dashed while unknowns remain and solid once a line lands at 0.
  - Every line ends at the **Promoted** terminus (`class: GalaxyWorkflow`). The map stops there on
    purpose, and a panel says why: "A validated workflow that nobody has run is a strong hypothesis
    about an analysis. It is not the analysis." No test outcome appears anywhere.
- **Three map callouts carry the mechanism:**
  - *What the template writes:* a draft after the lightning-talk example, `TODO` in dashed red boxes and
    `_plan_` in navy italic. **The slide's own YAML fails `gxwf draft-validate` 1.15.0** with three
    errors: `_plan_in` must be a string, `outputSource` names an undeclared `TODO_bam_output` port, and
    `reference: TODO_reference_port` is a dangling source. So the panel uses a corrected form: `TODO_*`
    as `in:` keys, an `out:` list, and `outputs: {}`. The build joins the panel's text into
    `build/panel.gxwf.yml` and **fails unless `gxwf draft-validate` passes it**. It passes now, with 5
    sentinels.
  - *Next stop:* real `gxwf draft-next-step` output on the dengue run's first draft.
  - *Every stop validates:* `gxwf draft-validate --concrete --connections`, replayed on every committed
    draft.
- **The map key teaches the six pitch sections**, one symbol each:
  - solid track = known knowns;
  - dashed track = known unknowns;
  - station = valid at every resolution;
  - departure board = the draft says what's next;
  - terminus = promotion;
  - rails = rails, not reminders.

## In and out

- **In:**
  - the draft format (`class: GalaxyWorkflowDraft`, `TODO_*`, `_plan_*`);
  - `draft-validate`, `draft-next-step` and promotion;
  - "rails, not reminders";
  - three runs' real burn-down;
  - the QA:466 counterpoint.
- **Out, per the pitch:**
  - the Foundry pattern, KB, Molds and provenance. The kicker and footnote only name the Foundry;
  - Nextflow static-typing comparisons and corpus counts;
  - the ledger and the recompile loop;
  - DengueSeq as a story. It appears only as the "Dengue amplicon consensus" line, citing the paper.
- **Also out:**
  - **Orbit 0/15.** It fits "rails, not reminders", but it isn't in this pitch's fact sheet.
  - **The `discover-or-author` interchange.** I found no evidence that any run took the author branch:
    - every pin file present has `status: hit` (dengue's final `galaxy-tool-pin.json`, and bacass's three
      `tool-pins/*`);
    - demo-qc-trim has no pin file;
    - no `foundry-run.yml` mentions authoring a wrapper.

    It was dropped rather than drawn as a route with no recorded traffic.
  - **The `_plan_` series.** It burns down too (28→0, 12→0, 8→0, exactly 4 per resolved step), but
    a second series per line would double the chart's lines.
  - **The Rumsfeld photo.** The quote is text only.

## Body word count

**327 words**, against a limit of 400. `build.mjs` counts and enforces this.

- **Method:** every DOM text node on the page except `[data-nocount]` elements: the title, authors,
  affiliations, references, QR captions and the live-results caption. Tokens with no letter or digit
  (`·`, `→`, `=`) are dropped.
- **What it includes:** the hero, the quote, the kicker, all map labels and station numbers, the YAML
  and board code, the callouts, the key and the footnote.
- `build/body-words.txt` holds the counted tokens.
- The build fails above 400.

## Rebuild (one command)

```sh
./build.sh            # content.yml + data/burndown.json -> poster.pdf, poster-bleed.pdf, preview.png, checks/
./build.sh --extract  # first re-derive data/burndown.json from ~/projects/foundry-runs (read-only git + gxwf 1.15.0)
```

`build.sh` keeps npm deps outside the vault, in `/private/tmp/claude-503/known-unknowns-transit-deps`
(override with `KU_DEPS=`). It installs them on first use from `package-lock.json`: playwright 1.64.1
(chromium-1248), qrcode, js-yaml and @fontsource. It symlinks `node_modules` in only for the build and
removes the link in an `EXIT` trap, even when the build fails. The `--extract` path also installs
`@galaxy-tool-util/cli@1.15.0` into the deps dir. The build needs poppler on PATH (`pdffonts`,
`pdftoppm`, `pdfinfo`, `pdfimages`).

**Edit text in `content.yml`, then run `./build.sh`.**

| What | File |
| - | - |
| All copy (title, hero, YAML, labels, callouts, key, refs, footnote) | `content.yml` |
| Map geometry: lanes, scale `K` (0.38 in per sentinel), station x, callout anchors (`MAP`) | `map.mjs` |
| Styles and colour tokens | `poster.css` |
| Real data | `data/burndown.json`, written by `extract.mjs` |

**Outputs:**

- `poster.pdf`: 3168 × 3168 pt, vector, 0 raster images, Overpass fonts embedded;
- `poster-bleed.pdf`: 44.25 in (3186 pt), paper extended 0.125 in each side, no crop marks;
- `preview.png`: 1500 px;
- `checks/preview-25.png`: 1056 px, the 25% distance check;
- `checks/preview-gray.png`;
- `checks/thumb-200.png`.

There is no `SHOW_ASK=0` render, because there is no `[[ASK]]` slot (see below).

**The build fails** in any of these cases:

- callout, key, header or footer overflow, or page overflow;
- callouts colliding with each other or with map text, or map labels colliding with each other;
- any text under 24 pt (SVG text measured after scaling);
- HTML body text under 28 pt;
- a hero under 100 pt;
- anything outside the 1 in margin;
- more than 400 body words;
- a font with `emb` ≠ `yes` in `pdffonts`, or a non-Overpass font, in either PDF;
- a page size other than 3168 pt;
- QR code area under 2.5 in;
- the printed draft panel failing `gxwf draft-validate` (skipped with a warning if gxwf isn't installed);
- data guards: a run not ending at 0 sentinels with a `class: GalaxyWorkflow`, or any replayed draft
  with `ok: false`, a tool-state failure or invalid connections.

Labels between 24 and 28 pt are listed as warnings. The only ones are the affiliation superscripts.

## Fonts and colour

- **Fonts:** Overpass (400–800, italics) and Overpass Mono (500–700), both SIL OFL via `@fontsource`.
  There are no system fallbacks. `pdffonts` lists only Overpass and OverpassMonoLight faces, all
  embedded and subset.
- **Lines:**
  - dengue: navy `#1F3A6B`;
  - bacass: amber `#E9A419`, with an ink casing;
  - QC + trim: green `#3D8B5A`.

  In greyscale they read dark, light and mid. Each line is also labelled directly, and the meaning sits
  in the dash, not the colour.
- **Paper:** `#F6F3EA`.
- **`TODO` boxes:** `#A8322A`.
- **Placeholder:** ochre `#9C6B12`, dashed.
- **Print:** ask the shop to map `#17191F` (hero band, terminus, board) to a K-heavy rich black.

## Sources for every fact

| On the poster | Source |
| - | - |
| Hero thesis | `PITCHES.md` Pitch 2, thesis |
| "There are known knowns… We also know there are known unknowns." | D. Rumsfeld, DoD news briefing, 12 Feb 2002 (ref [1]). **Verify the wording against the DoD transcript before print.** The slide JPG (`gcc2026-lightning/rumsfeld-unknowns.jpg`) paraphrases it, so it was not used. |
| Draft YAML | After `gcc2026-lightning.mdx:49-69`; the class, input, step name, `TODO_mapper`, `TODO` and `_plan_context` text are the slide's. Ports were moved to `in:` keys and an `out:` list, and `outputs: {}` was added, so the panel passes `gxwf draft-validate` 1.15.0 (checked every build). Illustrative, not from a run. |
| Concrete now / deferred / intent (key items 1–2) | `gcc2026-lightning.mdx:36-47`; `gcc2026.mdx:962-1004` |
| `draft-validate` checks concrete parts against real tool schemas and skips deferred parts | `gcc2026-lightning.mdx:93` |
| `draft-next-step` picks the next unresolved step; "the format drives the loop" | `gcc2026-lightning.mdx:105,114` |
| Promotes to ordinary gxformat2 with no translation layer | `gcc2026.mdx:1002` |
| "Rails, not reminders": schemas as contracts; the model translates and repairs, the tools validate | `foundry-pattern.mdx:1016,1046,1092` |
| "A validated workflow that nobody has run is a strong hypothesis… It is not the analysis." | `foundry-qa.mdx:466` |
| Three runs, their station names and order | `git log` and `foundry-run.yml` in `~/projects/foundry-runs/{dengueseq-denv3/dengueseq-denv3-galaxy, bacass-sr-assembly/bacass-sr-assembly-galaxy, demo-qc-trim/demo-qc-trim-galaxy}`. Phases 1–5 Mold names. `advance-galaxy-draft-step` `iterations`: 7, 4 and 2. |
| Sources "from a paper [2]" / "from nf-core/bacass" / "from nf-core/demo" | each run's `workflow-brief.md` title (DengueSeq paper + DENV_pipeline code; nf-core/bacass 2.5.0; nf-core/demo 1.1.0) |
| "One of us reviewed each run's brief" | `review.md` in each run's parent dir: reviewer John Chilton |
| **Burn-down heights**: dengue 31→27→24→19→13→9→4→0; bacass 7→6→1→0→0 (4th = `draft-extract`); QC + trim 2→1→0 | `extract.mjs`: `git show <sha>:galaxy-workflow-draft.gxwf.yml` per commit, sentinels counted with `detectDraft()` semantics (galaxy-tool-util-ts `origin/main` `a0476900`, `packages/schema/src/workflow/draft-checks.ts`). Cross-checked against `gxwf draft-validate --json` `survey.todo_count` (the extractor fails on any mismatch) and against the local galaxy-tool-util-ts build's `detectDraft`. |
| "Every stop validates" | `gxwf draft-validate --json --concrete --connections` (`@galaxy-tool-util/cli@1.15.0`), replayed 2026-10-30 on every commit that touches `galaxy-workflow-draft.gxwf.yml` (8 + 4 + 3), plus bacass's `draft-extract` commit `ad86a85`, which leaves the draft unchanged: `ok: true` for all, 0 tool-state failures, 0 skips, connections valid. The runs themselves used gxwf 1.13.1. This is a replay, not the run's own log. |
| Chips 0→7, 0→6, 0→8 "tool states checked" | the same replay: `concrete.tool_state.summary.ok` at the first and last committed draft per run |
| Next-stop board | `gxwf draft-next-step` (1.15.0) on dengue commit `bd40715` (the template's draft). Output: `step: map_reads`, then the first two `TODO[...]` work items, with the `(semantic hint: …)` tail cut and marked `…` |
| Promoted, `class: GalaxyWorkflow` | `galaxy-workflow.gxwf.yml` first appears at dengue `b82fa5e`, bacass `ad86a85` and QC + trim `154a03e`. `extract.mjs` records its `class`. |
| Ref [2] Vogels et al. 2024, *BMC Genomics* 25:433 | `DESIGN_DOSSIER.md` §5; `research/r2-demo-targets.md:26` |
| QR targets (all returned HTTP 200 on 2026-10-30) | `https://jmchilton.github.io/galaxy-tool-util-ts/#/guide/draft-format` and `https://galaxyproject.github.io/foundry/research/galaxy-data-flow-draft-contract/` (both `gcc2026-lightning.mdx:131-138`); `https://jmchilton.net/slides/gcc2026-lightning/` |

**These numbers replace the pitch's.** The pitch's series (DengueSeq `TODO` 46→…→0, bacass 9→8→1→0)
are `grep -c TODO` *line* counts, and the pitch asked for them to be re-derived. Line counts also catch
`TODO` inside `_plan_*` prose and comments. The poster uses real sentinel counts, the number the
tooling itself reports. The `_plan_` line counts in the pitch (28→…→0, 12→8→4→0) match the
`_plan_*` field counts exactly, since each field sits on one line.

**Not a success rate.** The poster never says "16/16" or "3/3". The validation claim is that each
committed draft in these three runs validates when replayed. That holds by construction of the loop,
which is the point. bacass's later Planemo test failed (graph assertion), and QC + trim's second test
case crashed Planemo. The map stops before testing, and the end panel says so.

## `[[ASK]]` and placeholder slots

- **`[[ASK]]` (Anton's foundry-paper work, nf-core/rnaseq and atacseq): left out entirely.**
  - This pitch has no place for it.
  - Those rebuilds were assembled by scripts from an older Foundry version. There is no per-commit
    draft history to put on this map, so a line for them would imply they travelled the draft route.
  - With no slot, no `SHOW_ASK` flag or noask render is needed.
- **`[[QR: live results]]`:** top right, 4.15 in, dashed ochre, always rendered. When the URL exists,
  replace the `live-ph` div in `build.mjs` with `await qr(url)`.

## Open questions

1. **Title.** *A Draft Format for Agent-Built Galaxy Workflows* is the pitch's working title minus its
   first half, which the hero already says. Keep it, or use a dossier title such as *From Papers and
   Conversations to Runnable Galaxy Workflows*?
2. **Rumsfeld.** Is a quote OK on a CSHL poster? Does the wording need checking against the 12 Feb 2002
   transcript?
3. **Line names.** The lines are named by analysis ("Dengue amplicon consensus", "Bacterial assembly",
   "Read QC + trim"), not by run slug. Is that OK?
4. **Validation replay.** Printing the replay (gxwf 1.15.0, today) rather than the runs' own 1.13.1 logs:
   OK, or re-run at print?
5. **Live-results URL.**
6. **QR targets.** Is the jmchilton.net lightning deck the right "slides" target, or `bit.ly/gcc2026draftworkflows`?
   Should one of the codes be the preprint instead?
7. **Bleed.** Send `poster-bleed.pdf`, or does the shop print edge to edge on the 44 in trim?
8. **Run publication.** The run dirs are local. Publish them before anyone is pointed at the data?
9. **The lightning-talk YAML (`gcc2026-lightning.mdx:49-69`, also `gcc2026.mdx`) fails `gxwf draft-validate` 1.15.0** with three errors (see "The idea"). Fix the slides too?
