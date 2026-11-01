# trace: CSHL BioData 2026 poster (concept 1, the technical one)

One real Galaxy Workflow Foundry run (DengueSeq DENV3, 20–21 Oct 2026) drawn the way an engineer reads a distributed
trace. Each skill gets one row against a UTC clock. Bars run artifact to artifact. Solid bars are where the model
wrote, hatched bars are where a tool decided (gxwf, Planemo, and the seven Tool Shed pins), and the dotted bar is the
author's review of the brief, drawn across a marked axis break. Each row ends in the file it handed on. A Mold column
gives the hash of the knowledge each skill was compiled from. On the right, a stepped burndown of open requirements
climbs to 13 and settles at **5 open**, never reaching zero. Under the trace, three verbatim excerpts:

- build provenance (`_provenance.json`), with its recompile history;
- execution provenance (the gxwf and Planemo verdict JSONs);
- one open ledger entry.

The hero is "The model writes. The tools decide. The gaps are written down." Each beat is underlined with the mark the
trace uses for it: a solid bar, a hatched bar and the oxblood stepped line. The hero doubles as the legend.

## Rebuild (one command)

```sh
./build.sh                 # poster.pdf, poster-bleed.pdf, preview.png, checks/*
SHOW_ASK=0 ./build.sh      # hides every [[ASK]] slot; the column just ends sooner, no hole
SHOW_T1=1 ./build.sh       # also draws Planemo attempt 1 (struck, dashed) on the run-workflow-test row (sign-off T1)
```

`build.sh` copies `package.json`/`package-lock.json` to `/private/tmp/claude-503/trace-deps` (override with
`TRACE_DEPS=…`) and runs `npm ci` there if needed. It symlinks `node_modules` in for the build and removes the symlink
on exit, so no `node_modules` or font cache is left in the vault. The generated `poster.html` is written to
`$TRACE_DEPS/out/`, not to the vault.

- **Playwright:** `playwright-core` 1.59.1, which uses the cached `chromium_headless_shell-1217`. On another machine,
  run `npx playwright-core install chromium` from the deps directory.
- **Poppler:** `pdffonts`, `pdfimages`, `pdftotext` and `pdftoppm` must be on `PATH`.
- **Editing:**
  - All prose is in `content.yml`.
  - Layout is in `style.css`.
  - Trace geometry is set by the constants `COL`, `COLW`, `MINW` and `BRK` at the top of the trace section in
    `build.mjs`.
  - Run data is read by `data.mjs`.
- **Inline markup in `content.yml`:** `**bold**`, `` `code` ``, `{->}`, `{!=}` and `{=}`. The three glyphs are drawn as
  SVG, never as font glyphs.
- **Height:** the build makes two passes. The trace takes whatever height the other bands leave, then is redrawn at that
  height.

| Output | What |
| - | - |
| `poster.pdf` | 3168 × 3168 pt (44 in), 1 page, vector, 0 raster images, Inter + JetBrains Mono embedded (subset) |
| `poster-bleed.pdf` | 3186 × 3186 pt (44.25 in): the same artwork shifted 0.125 in, with the paper tint carried to the bleed edge |
| `preview.png` | 1500 px |
| `checks/preview-25.png` | 1056 px, the common 25% distance check |
| `checks/preview-200.png` | 200 px thumbnail |
| `checks/preview-gray.png` | greyscale, 1500 px |
| `data/trace-run.json` | snapshot of every number drawn. If the run directories are missing, the build falls back to it |
| `data/MANIFEST.json` | source paths with sha256 checksums, plus the foundry `origin/main` SHA used |

### The build fails on purpose when

- **The run no longer says what the text says** (`content.yml` `expect`). It checks for:
  - 2 + 11 phases and 7 iterations;
  - 19 ledger entries: 5 open, 2 dropped, 14 resolved;
  - 7 pins, all `hit`, each changeset present in the workflow;
  - 10 brief proposals with 1 edited, and the reviewed brief's hash equal to the file's;
  - a gxwf pass with tool_state 7/0 and valid connections;
  - a Planemo pass with 0 failures and 7/7 jobs `ok`;
  - every `discover-shed-tool` ref `deterministic`, and its Mold hash unchanged on `main`.
- **The burndown is wrong.** The stepped line is recomputed from `raised_by`/`resolved_by`. Its final value must equal
  the ledger's open count. Its value before `find-test-data` (7) must equal the open count in
  `_scratch/open-requirements.ledger.pre-ftd.yml`.
- **Layout breaks:**
  - any HTML block overflows;
  - any trace label, bar or overlay collides with another (`getBoundingClientRect`, pairwise);
  - anything is outside the 1 in safe area;
  - trace rows are under 76 px.
- **Sizes fall below their floors:**
  - any text is under 24 pt;
  - any span label or skill name is under 32 pt;
  - the hero is under 100 pt, the thesis under 72 pt, the title under 120 pt, or a heading under 72 pt.
- **The trace is under 40% of the page area.** It is 41.3% now (rows 80.0 px; 76.9 px with `SHOW_T1=1`).
- **The PDF fails its checks:**
  - `pdffonts` lists a family other than Inter or JetBrains Mono, or an unembedded font;
  - `pdfimages` finds any raster image;
  - `pdftotext` lacks `[[QR: live results]]`;
  - `[[ASK]]` appears when it should be hidden, or is missing when it should be shown;
  - the bleed artwork is not offset by exactly 0.125 in.
- **The QR codes don't decode.** `qr_check.py` renders the PDF at 150 dpi and decodes the codes with OpenCV, via
  `uv`. The set must equal the URLs in `content.yml`. The check is skipped with a warning if `uv` is missing.

`NO_GUARD=1` downgrades the layout guards to warnings while you iterate. The data guards never downgrade.

**Size exceptions.** All body copy is at least 28 pt, including the trace footnote, the burndown note, the captions
and the excerpts. A few items are set at 24–25.5 pt and count as labels or references, not body:

- the axis and Mold-column labels;
- the pin-table note;
- the QR captions;
- the install commands, the corpus and upstream lines, and the references.

## Fonts (OFL, from @fontsource 5.2.8, loaded from the deps directory)

- **Inter** 400–900: title, hero, headings, body.
- **JetBrains Mono** 400/700: skill names, files, hashes, excerpts.

The arrows, `≠`, `=`, hatching, dots and ring are inline SVG. Hatching is drawn as clipped strokes, not SVG
`<pattern>`, so Chromium cannot rasterize it.

## Data sources (read-only)

Every number on the poster comes from the dossier or from one of these files. The build reads them directly.

| Poster item | Source |
| - | - |
| 13 phases (2 + 11, one compiled skill each; `discover-shed-tool` runs inside phase 5 and is shown only as the pins and the provenance panel), clock, artifact files, 7 iteration times; 6 min (6 m 22 s), 2 h 23 min (2 h 23 m 30 s), 6 h 58 min review gap, 83 s gxwf, 33 min Planemo | `~/projects/foundry-runs/dengueseq-denv3/dengueseq-denv3-{brief,galaxy}/foundry-run.yml` |
| Mold hash per row | `~/projects/foundry-runs/_plugin/f275059e/casts/claude/skills/<skill>/_provenance.json` |
| 7 pins: order, changesets, all `hit` | `galaxy-workflow.gxwf.yml` (changesets); `_logs/galaxy.jsonl` (the 7 per-round pin writes, in order); `galaxy-tool-summaries/*.pin.json` |
| Ledger 19 / 5 / 2 / 14; badges +9, +5 −2, +3 −2, +2 −8, −2; burndown 9 → 12 → 13 → 13 → 7 → 5 | `open-requirements.ledger.yml` (`raised_by`, `resolved_by`, `kind`); cross-check `_scratch/open-requirements.ledger.pre-ftd.yml` |
| Ledger excerpt | `open-requirements.ledger.yml`, entry `low-coverage-and-empty-bam-behavior` (abridged with "…") |
| 10 proposals, 1 edited, brief `e52aca4e` | `dengueseq-denv3-brief/workflow-brief.md` § Open questions; ledger `decisions[].review`; `review.md` |
| gxwf verdict (cli 1.14.0, 7/0, connections valid) | `galaxy-workflow-validation-result.json` |
| Planemo verdict (0.75.47, 0 failures, `galaxy_branch: null`, HEAD `b18269a1`, 7/7 jobs) | `workflow-test-result.json` |
| Attempt 1 (T1 only): infra, attempt 2 from 00:13:55 | `workflow-test-result.json` `infra_issues`, `timing` |
| `discover-shed-tool` refs (sidecar ≠, verbatim =, all deterministic), rev 5, `05c99cba` | `_plugin/f275059e/…/discover-shed-tool/_provenance.json`; the same hash on foundry `origin/main` `9f83fd55` |
| Hash chain `256e3861 → 2e5fa1f8` (17 Jun, `73af1f62`) → `648cb250` → `d0e2ded5` → `05c99cba` (the July note-format commits `2f571810`, `ef6043e2`, `70fa943e`) | `git log -p origin/main -- casts/claude/skills/discover-shed-tool/_provenance.json` |
| PR #701: 8 skills recast | `git diff 9adc20b7^1 9adc20b7` (8 `_provenance.json` files gain `src_hash 9a636385…`) |
| "Molds append and resolve; what nothing closes stays open" (cut in the content pass, restored in the design pass) | foundry `content/meta/glossary.md` l.67 |
| "Casting runs no model" | foundry `packages/build-cli/README.md` ("`cast`: deterministically assemble…"), plus `"source": "deterministic"` on every ref |
| 31 CI pattern workflows | `NEW_CONCEPTS.md` shared rules (re-counted at `9f83fd55` by transit-grounded-v2) |
| Karpathy gist URL | `research/r1-foundry-system.md` §7 |
| Vogels et al. reference, DENV_pipeline v1.0 | `dengueseq-denv3/source-selection.md` |

The corpus counts, 0/15 (Orbit, open-weight models, pp. 16–18), the upstream PRs and Hokken (Fig. S4A) come from the
dossier and `NEW_CONCEPTS.md`.

## `[[ASK]]` slots and placeholders

- **`[[ASK]]` Anton's nf-core rebuilds:** one dashed line in the bottom-middle column. It says only "Also
  Foundry-validated: nf-core/rnaseq and nf-core/atacseq rebuilds (atacseq partial). Details on the live page." It has
  no numbers. `SHOW_ASK=0` removes it. The concept brief says "no slot", but the design task required one, so it is
  kept behind the flag (sign-off #13).
- **`[[QR: live results]]`:** a dashed ochre 3.5 in slot, top right. It always renders. Set `scan.live.url` in
  `content.yml` and it becomes a real QR code.
- **Other QR codes:** Code, Install and Preprint are real vector QR codes, 3.25 in (symbol about 2.55 in), with a 4-module quiet zone, black on
  white.

## Departures from the concept brief

| Brief | Built | Why |
| - | - | - |
| Live QR beside the hero; "Board here" QR codes in the footer | All four QR codes top right, live slot largest | It was the only way to give the trace ≥ 40% of the page. Top right is also eye level on a hung board |
| Inspect panels: two stacked plus one tall, with a recompile strip | Three columns, each with two stacked pieces of different height; the 0/15 note heads the middle column, with a leader from the hatched rows | The lower-left triangle of the waterfall holds the pin table instead |
| Brief layout shows "9 h 28 min" | `6 min · 2 h 23 min` wall-clock, with the review gap shown on the axis | Computed from the run records. The brief contradicts itself on this |
| PR #701 hash pair `64c477c4 → 9a636385` | "1 note fixed, 8 skills recast" | Space. The pair is in `data/trace-run.json` |
| `_verify.json` validator line in the provenance panel | Left out | Space. The run's cast (`f275059e`) has no `--schema-sha256`; `main` does |
| Separate run-name headers | Run 1's name is set in the axis band | Saves a row |

## Open questions

1. T1: show Planemo attempt 1? It is off by default; `SHOW_T1=1` draws it.
2. T2: print "Galaxy not pinned to a release" plus `HEAD b18269a1`? Both are shown now.
3. T3: the glossary line is back (design pass), under the ledger caption. Confirm the wording.
4. Title: keep option 1, "Conversations" (sign-off #4)?
5. #13: keep the Anton `[[ASK]]` line, or drop it?
6. #11: add agent minutes or cost to the stat strip? It is not shown now.
7. #5: the run directories are unpublished; okay to print the hashes and file names?
8. Live-results URL (#17).
9. Re-count the corpus at print. The counts are dated 2026-10-24.
10. Paper tint `#fbfaf6`: proof it, or print on white?

## Content pass (2026-10-29)

Content and clarity editor. Before state: `checks/preview-draft1.png`. Only `content.yml` changed (plus this README). The
build passes every guard: rows ≥ 76 px, trace 40.2% of the page.

**Verified, no change needed.** These were checked against the primary files:

- run times from both `foundry-run.yml` files: 6 m 22 s, 2 h 23 m 30 s, 6 h 58 min review gap, 83 s, 33 min;
- every Mold hash per row against `_plugin/f275059e/…/_provenance.json`, including `discover-shed-tool` rev 5
  `05c99cba` in this run's build;
- the ledger: 19 entries, 5 open, 2 dropped, 14 resolved;
- review: 10 proposals, 1 edited, reviewer John Chilton;
- `73af1f62`: 17 Jun, MRSA, `integron_finder`;
- `9adc20b7` (#701): 22 Oct, 8 skills;
- upstream PRs, through `gh` today: IUC #8808 merged 10-29, usegalaxy-tools #1791 merged 10-29, galaxy #24435 open,
  jmchilton/galaxy-tool-util-ts #205 merged 10-26.

**Accuracy fixes**

- **Hero beat 3:** "Nothing is off the record" → "The gaps are written down." The old line was absolute, yet the poster prints
  "output bytes not retained" and the run dirs are unpublished.
- **0/15 cite:** "pp. 16–18" → "pp. 16, 18", since p.17 is not a source.
- **"cast" → "build" / "recompiled"** throughout: the provenance file line, the recompile strip and #701.

**Clarity fixes**

- **Hero gloss.** Rewritten to gloss Mold ("one per action, declaring what it needs") and to name the three judges with
  one-word glosses: Tool Shed (registry), gxwf (validator), Planemo (tests).
- **Stat strip:**
  - "1 paper" now says what the paper is: "dengue sequencing [3] + its code, picked after the skills were built".
  - "13 phases" is kept (2 + 11 is exact; more than 13 skills ran, e.g. `discover-shed-tool` inside phase 5).
  - The time cell is labelled "paper → brief, then brief → tested workflow".
  - "7/7 jobs" → "PASS in a real Galaxy (Planemo)".
- **Tool rows** now name their tool: "gxwf: 7/7 tool states", "Planemo: 7/7 jobs".
- **Pin note:** "Looked up in the Tool Shed index (`gxwf tool-search`), not recalled by the model."
- **Build caption:** "Compiling runs no model. A rewritten sidecar changes its hash; a verbatim copy keeps it."
- **Recompile strip:** "Mold and its test fixed, skill recompiled" (was "eval … recast").
- **Ledger caption.** It no longer repeats "1 of 19 entries, abridged". It now gives a plain-English reading of the
  YAML: "with no reads, Galaxy's wrapper gives an empty consensus; the paper's code gives 10,707 N". The "Molds append
  and resolve" line was cut for space (T3 wording no longer printed).

**Sign-off still open:** #4 title ("Conversations"), #5 unpublished run dirs, #11 cost/minutes, #13 the Anton `[[ASK]]`
line, #17 the live URL, #18 re-count at print, 18a upstream PRs vs the ASK work, #19 Karpathy, T1 attempt 1, T2
`b18269a1` "not pinned", and the hero beat change above.

## Design pass (2026-10-29)

Design editor. Before state: `checks/preview-draft2.png`. Rebuilt with `SHOW_ASK=0`, `SHOW_T1=1`, then the default build.
All guards pass. The build now also prints a layout line: header, hero, the three bottom-column heights (the tallest sets
the trace) and the gap between the burndown note and "0: never reached".

**Changes**

- **Subject line over the trace.** A new `trace.subject` field, set at 96 px (72 pt):
  "**One run:** the DengueSeq paper (dengue virus) → a tested Galaxy workflow". It is the editor's copy. "One run:" is
  in ink 800 and the rest in slate 600, so it reads as the figure's title rather than a second thesis. "Dengue" now
  reads at distance.
- **QR codes** 288 → 312 px boxes (3.25 in). Measured symbols are 2.55–2.62 in, with the 4-module quiet zone kept in
  the box. The live slot stays the largest at 3.5 in. The header did not grow.
- **Install commands** moved from the bottom-right column to the right of hero line 1, under the QR row and next to
  the Install code. The space was empty, and it frees the bottom-right column.
- **Restored** "Molds append and resolve; what nothing closes stays open." as a bold line under the ledger caption
  (new `inspect.ledger.gloss`). This uses the freed column space.
- **Stat strip.** Cell 1's caption is one line (the `<br>` was removed; the words are unchanged). Cells no longer
  stretch: the free space sits before each chevron, so the gaps are even.
- **"Why tools decide"** is set on the tool tint (`--tooltint`, the same as the PASS rows). The leader from the hatched
  rows now lands on a panel, and the bottom band has one focal block instead of three equal columns.
- **Burndown.** "0: never reached" and the end of the dotted zero line now hang from the bottom of the end band. The
  note-to-label gap went from 49 to 87 px.
- **Height paid for the subject line** without copy cuts:
  - excerpt leading 1.26 → 1.2;
  - tighter gaps in the hero and thesis, and around the trace, bottom band and refs;
  - the axis band and run-2 header each 4 px shorter;
  - the end band 206 → 198 px;
  - column gaps of 26 px in col a and 22 px in col b.

  Trace rows went from 82.7 to 80.0 px (76.9 with T1; guard 76). The trace is 41.3% of the page (was 40.2%).
- **Hero gloss** stays at 3 lines. The title is unchanged. The short title (sign-off #4) would give the trace about
  160 px, which is two more rows' worth.

**Copy:** no words changed or cut. Two additions: the subject line and the restored glossary line.

**Print:**
- `poster.pdf` 3168 pt and `poster-bleed.pdf` 3186 pt;
- 0 raster images;
- only Inter and JetBrains Mono, embedded and subset;
- all three QR codes decode;
- no `node_modules` or symlinks are left in the vault.

**Open:**
- With `SHOW_T1=1` rows are 76.9 px, so there is little headroom. Adding any line to the bottom band would fail T1 first.
- Col b (with `[[ASK]]`) and col a now tie at about 1010 px.
- The oxblood "5 open" turns mid-grey in greyscale. The stepped underline and the burndown still carry it.
