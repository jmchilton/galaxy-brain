# noticeboard: CSHL BioData 2026 poster (concept 2, the clever one)

A community noticeboard. The DengueSeq DENV3 run's outputs are pinned up as flyers in familiar genres:

- **NOTICE:** the thesis, plus the wiki → Molds → skills chain.
- **FREE TO A GOOD HOME:** the workflow, with a node strip drawn from its `.gxwf.yml`.
- **WANTED → FOUND:** the 7 Tool Shed pins.
- **INSPECTED:** the gxwf and Planemo verdicts, the Orbit 0/15 note and the two-provenances line.
- **MISSING: 10,707 N** and **MISSING: BAQ:** the 3 open ledger entries.
- **CUT ×2:** the 2 deliberate drops.
- **LOST & FOUND:** the false `integron_finder` miss that was fixed in the wiki and recast. This is the only flyer about another run, and it is labelled so.
- **ALSO POSTED:** Hokken, the MRSA expert spec and the `[[ASK]]` note.
- **Tear-off strip:** the QR codes.

The joke is that an open-requirements ledger *is* a lost-pet flyer. The argument stays exact: the model drafts, the tools inspect, and whatever can't be resolved is posted.

![preview](preview.png)

## Rebuild (one command)

```sh
./build.sh                 # poster.pdf, poster-bleed.pdf, preview.png, checks/*
SHOW_ASK=0 ./build.sh      # same, with every [[ASK]] slot hidden (no hole: the note sits inside ALSO POSTED)
SHOW_PROBE=0 ./build.sh    # drop the BAQ probe numbers from the MISSING: BAQ flyer (sign-off #12)
```

`build.sh` installs npm dependencies into `/private/tmp/claude-503/noticeboard-deps` (override with `NOTICEBOARD_DEPS=…`). It symlinks `node_modules` into this folder for the build and removes the symlink on exit, because the vault site globs `projects/**/*.md`. It then runs `node build.mjs`. A second pass with `[[ASK]]` hidden goes to a scratch directory and writes only `checks/preview-25-noask.png`, which is the hole check.

**Requirements:**
- Node ≥ 18 and npm.
- poppler: `pdftoppm`, `pdffonts`, `pdfimages` and `pdfinfo` on `PATH`.
- `playwright-core` is pinned to **1.57.0**, which uses **chromium-1200** (cached in `~/Library/Caches/ms-playwright`). On another machine, run `npx playwright-core install chromium` from the deps directory.

**Where to edit:**
- **Text:** `content.yml`. Every sentence on the poster is there, including the alt glyphs `{->}`, `{!=}` and `{x}`, which render as inline SVG.
- **Layout and colour:** `style.css`. All sizes are in px at 96 px/in, so 24 pt = 32 px and 72 pt = 96 px.
- **Generated parts:** in `build.mjs`. These are the node strip, the pins table, the hash flip, the QR codes and the cork speckle.
- **Run data:** `extract.mjs` reads the run files and foundry git into `data/run.json`, with `data/manifest.json` listing source paths, sha256 values and commit IDs. If the run directory is absent, the build uses that snapshot.

| Output | |
| - | - |
| `poster.pdf` | 3168 × 3168 pt (44 in), 1 page, vector, 0 raster images, only Anton / Work Sans / IBM Plex Mono embedded (all CID TrueType, no Type 3) |
| `poster-bleed.pdf` | 44.25 in: the same artwork on 0.125 in of wall tint on every side |
| `preview.png` | 1500 px |
| `checks/preview-25.png` | 1056 px (25% of 44 in at 96 dpi), the common distance check |
| `checks/preview-25-noask.png` | the same, with `[[ASK]]` hidden |
| `checks/preview-200.png` | 200 px thumbnail |
| `checks/preview-gray.png` | greyscale, 1500 px |
| `poster.html` | the intermediate page (fonts inlined), kept for inspection |

### The build fails on purpose when

- **The run drifts.** The run must still give 19 ledger entries (5 open, 2 of them `kind: dropped`, 14 resolved), 11 phases, 7 draft iterations, 7 steps, 7 of 7 Tool Shed pins with status `hit`, and a review of 10 proposals with 1 edited. gxwf must be `pass` with tool state 7/0 and connections valid. Planemo must be `pass` with 1 test run and 1 not run, 7/7 jobs, 0 failures and Galaxy `b18269a1`. `#701` must still recast 8 skills (`content.yml` `expect`).
- **A ledger entry is unposted or miscited.** An open ledger entry is not mapped to a flyer (`content.yml` `posted`), or a flyer cites a ledger ID that is not open.
- **The node strip lacks a step.** A workflow step has no position in the node strip.
- **Text is under 24 pt.** The walker measures every text node, including SVG text times its screen CTM.
- **A size floor is missed.** The floors are: title ≥ 120 pt, hero ≥ 100 pt, thesis and every flyer headline ≥ 72 pt, flyer body ≥ 28 pt.
- **Something overflows.** Any flyer, column, the strip, the rail or the masthead clips its content. Columns are measured before the tilt is applied, so the measurement sees text horizontal.
- **Something leaves its area.** An element is outside the 1 in safe area, or a flyer is outside the board's flyer area.
- **`poster.pdf` fails the PDF checks:** it is not 1 page at 3168 pt (bleed: 3186 pt), it embeds a font that is not Anton, Work Sans or IBM Plex Mono, it embeds a font that is not embedded or is a Type 3 font (a synthesised bold or italic), or `pdfimages` finds any raster image.

The build prints a word count (717 now) and the slack left in each column. The three real QR codes were decoded back to their URLs with OpenCV from a 100 dpi render of the strip (`uvx --with opencv-python-headless …`, not part of the build).

## Fonts (all OFL, from `@fontsource`, inlined as data URIs)

- **Anton 400:** the hero, every flyer headline, the thesis, the big numerals.
- **Work Sans 500, 700 and 800, plus 500 and 700 italic:** the title and the body.
- **IBM Plex Mono 400 and 600:** tool IDs, changesets, hashes, ledger IDs and commands.

Arrows, `×`, ticks, scissors and pins are drawn as SVG.

## Colour

| Element | Colour |
| - | - |
| Wall | `#f5f2ec` |
| Cork | `#e4d6ba`, with a vector speckle in two near tones |
| Frame | `#9c7b4e` |
| Rail | `#141414`. Ask the shop to print it as K-rich black. |
| Flyers | white; WANTED pale yellow `#fbf2cc`, LOST & FOUND pale blue `#e6edf3` |
| Accent | oxblood `#8a2e1c`, on the MISSING bands, the FOUND stamps and the eyebrow |
| Placeholders | ochre `#b07a1f`, dashed |

**Greyscale.** The MISSING bands render as dark grey blocks, heavier than WANTED's black-on-yellow headline. Status is carried by words and glyphs (OPEN pills, PASS, FOUND, the dashed CUT coupon), never by hue alone.

**Dark areas.** The rail is the large dark area. The two oxblood MISSING bands are the only other saturated fills (about 12 × 2 in each). Order a proof of the cork tint.

## Data sources (every number on the poster)

The run files are under `~/projects/foundry-runs/dengueseq-denv3/`. The foundry repo is `~/projects/repositories/foundry`, at `origin/main` `9f83fd55`.

| On the poster | Source |
| - | - |
| 7 tools, owners, changesets (8 chars), node strip edges, `list:paired` | `dengueseq-denv3-galaxy/galaxy-workflow.gxwf.yml` (`steps.*.tool_shed_repository`, `in:`) |
| All 7 pins `hit` (FOUND stamps) | 6 × `galaxy-tool-summaries/*.pin.json`. bwa_mem's iteration-1 `galaxy-tool-pin.json` was overwritten in the run dir, so it is recovered from `_logs/galaxy.jsonl` (`status: hit`, `devteam/bwa`, `c598cbb8b019`) |
| `tool-revisions` (where each changeset came from) | pin `rationale` fields in the same files |
| gxwf PASS, tool state 7 of 7, connections valid | `galaxy-workflow-validation-result.json` (gxwf 1.14.0) |
| Planemo PASS, 1 of 2 tests run (`denv3_test` not run), 7/7 jobs, Galaxy `b18269a1` | `workflow-test-result.json` (planemo 0.75.47; branch not pinned; guarded) |
| "7 tools from the Tool Shed" (all 7 installed by Planemo) | `workflow-test-result.json` `galaxy.tool_staging` (7 Tool Shed repos at the pinned changesets) |
| "Not the paper’s pipeline in a container" | dossier §3.9. The test itself ran under `--biocontainers`, so "not a container" alone would be false |
| 10,707 N vs empty sequence; ledger ID | `open-requirements.ledger.yml`, entry `low-coverage-and-empty-bam-behavior`, `note`: the source chain `mpileup -aa --reference` gives a header + 10,707 N; the IUC `ivar_consensus` chain (header-only BAM probe in the wrapper container) gives an empty sequence |
| BAQ off / consensus wrapper has no reference | ledger `discoveries` `iuc-ivar-consensus-pileup-flags`, `iuc-ivar-variants-pileup-flags-and-r`; entries `consensus-` / `variants-baq-deviation-check-on-test-sample` (both `open`) |
| BAQ probe: 0 positions, 484 vs 476 rows | `dengueseq-denv3-galaxy/workflow-debug-report.md`, "Open-requirements bearing" (labelled "measured after the ledger was written"; `SHOW_PROBE=0` removes it) |
| CUT ×2 | ledger entries `serotype-coverage-plane-not-carried`, `filtered-variant-frequency-table-not-carried` (`kind: dropped`, `because:`) |
| 10 proposals, 1 edited, reviewer an author | `open-requirements.ledger.yml` `decisions[].review` (10 tagged, 1 `expert-edited`); `review.md` (reviewer John Chilton) |
| Paper + linked code (DENV_pipeline v1.0) | `source-selection.md` (code pin `8214cfbb`, tag v1.0) |
| Held out: chosen 20 Oct; cast `f275059e` 19 Oct | dossier §4; `git show -s f275059e` (2026-10-19) |
| Run dates 20–21 Oct 2026 | `dengueseq-denv3-brief/foundry-run.yml` `started_at`, `dengueseq-denv3-galaxy/foundry-run.yml` `finished_at` |
| `73af1f62`, 17 Jun 2026, `256e3861 → 2e5fa1f8` | `git show 73af1f62 -- casts/claude/skills/discover-shed-tool/_provenance.json` (`mold.content_hash`) |
| #701: 8 skills recast | merge `9adc20b7` (2026-10-22): 8 `_provenance.json` files changed |
| 420 notes, 56 Molds (27 reviewed), 13 pipelines (2 CWL, 2 review), 69 skills, 51 eval oracles, 31 CI workflows on Galaxy 26.1 | dossier §4 corpus table (dated `main` 2026-10-24) and NEW_CONCEPTS §0 (31 CI). 56 / 69 / 13 re-checked at `origin/main` `9f83fd55` |
| 0 of 15, open-weight, Orbit; "guidance, not enforcement" | dossier §3.5 (Baker et al. 2026, pp. 16, 18) |
| Hokken: ~60 steps, UseGalaxy.org, Fig. S4A | dossier §4; REVIEW_CONTENT (S4A, p.36) |
| MRSA: draft validates, full validation not reached, Planemo never ran | dossier §4, REVIEW_CONTENT §1 |
| Install commands | foundry `README.md` on `origin/main` ("Install generated skills") |
| QR targets | dossier §6 |

## `[[ASK]]` slots

1. **Anton's nf-core rebuilds:** "nf-core/rnaseq and nf-core/atacseq rebuilds, Foundry-validated (atacseq partial)". This is a dashed ochre note at the foot of ALSO POSTED, with no numbers. `SHOW_ASK=0` removes it, and the column re-spaces with no hole (see `checks/preview-25-noask.png`).
2. **`[[QR: live results]]`:** the largest QR slot, at the bottom right of the tear-off strip (3.4 in, dashed ochre). It always renders. Set `strip.live.url` in `content.yml` and it becomes a real code.

## Open questions for John

1. **N1, tone.** MISSING / WANTED / FREE TO A GOOD HOME flyers sit next to two Orbit posters on a Tools track. Is that OK, or too jokey?
2. **N2, the lead headline.** "MISSING: 10,707 N" is the biggest type on the board. The flyer says plainly that it is Galaxy's wrapper that returns an empty sequence where the paper's chain gives all-N. Keep it, or lead with the BAQ flyer?
3. **#4, the title.** The title is dossier option 1 ("…Papers and Conversations…"), but the only expert route shown is an MRSA *specification*. The layout also holds the short title.
4. **#12, BAQ probe numbers.** These are printed and labelled "measured after the ledger was written (debug report)". Keep them, close the ledger entries, or build with `SHOW_PROBE=0`?
5. **#17, the live-results URL.**
6. **#5, unpublished run files.** The DengueSeq run directories are local and unpublished. Publish them before the QR codes send people looking.
7. **T2, the Galaxy commit.** `b18269a1` is printed on INSPECTED, but the Galaxy branch was not pinned. Print it, or drop the hash?
8. **QR sizes.** The tabs are 3.0 in and the live slot is 3.4 in. The concept asked for 3.2 in and 3.6 in; the column heights won't take that without cutting copy. Both sizes are over the 2.5 in floor.
9. **#19, Karpathy.** The eponym is kept as ref [3], citing the gist. Neither repo cites him.

### Deliberate departures from the concept text

- **The BAQ flyer headline** is "MISSING: BAQ", not "a reference for the pileup". The variants wrapper does take `--reference`; what both open entries share is BAQ.
- **"Elsewhere on this board"** is now "ALSO POSTED". Its items are other work, not other flyers.
- **The `[[ASK]]` slot** is a note stuck on ALSO POSTED rather than its own flyer, so hiding it leaves no hole.
- **The live QR** is not repeated on the rail. It lives once, as the largest tear-off.
- **Upstream PRs** (IUC #8808 and others) are omitted, per the concept's "Used" list and sign-off 18a.
- **"Dominant visual."** The board itself is the single object (about 80% of the page). Inside it, the MISSING flyer is the focal point and the largest type. Flyers vary in size and tilt; there is no card row.

## Content pass (2026-10-29)

Content and clarity editor. Before state: `checks/preview-draft1.png`. Only `content.yml` changed (plus this README). The
build passes every guard. Column slack is now 54/23/76 px, so col-b (FREE / INSPECTED / LOST & FOUND) is the tight one.

**Verified, no change needed:**

- the pins and owners;
- the gxwf and Planemo verdicts;
- `tool_staging`: 7 Tool Shed repos installed;
- the 10,707 N vs empty-sequence note in the ledger;
- the BAQ discoveries and the two `brief_change_recommendations`;
- `73af1f62`, including `iuc/integron_finder`;
- #701, 8 skills;
- held out: `f275059e` was committed 2026-10-19;
- reviewer John Chilton.

**Accuracy fixes**

- **BAQ probe line.** Now: "A later probe of the wrapper chain, outside Galaxy and after the ledger was written (debug
  report)". Before, it read as a Galaxy result. The debug report says Galaxy bytes were not kept and identity was checked
  outside Galaxy.
- **LOST & FOUND, "Again in October (#701)".** This implied a second false miss. Now: "October, #701: a test-assertion
  defect in 3 runs; 1 note fixed, 8 skills recompiled."
- **0/15 cite** → "[1, p. 18]".
- **"the paper's chain / pileups" → "the paper's code".** The comparison is with DENV_pipeline, not the paper text.
- **Eyebrow:** "Tools, Visualization, and Infrastructure" (Oxford comma, matching the dossier and ten-questions).
- **"cast" / "recast" → "built" / "recompiled"** (FREE held-out line, LOST & FOUND).

**Clarity fixes**

- **"The tools decide" now appears on the board.** INSPECTED's note opens with "**The model drafts; the tools
  decide.**" Before, it opened with "Why inspectors, not rules?".
- **Jargon glossed:**
  - Molds: "one per action, listing its needs".
  - Skills: "each hashing its sources".
  - Tool Shed: "Galaxy's tool registry", in the WANTED footer.
  - gxwf: "validator:".
  - Planemo: "1 test, in a real Galaxy".
  - "Casting" → "Compiling runs no model".
- **NOTICE lead:** "the Foundry keeps that knowledge in a wiki [3] and compiles it". This replaces "typed wiki (an LLM
  wiki [3], extended)".
- **FREE sub** says what the workflow is for: "Agent-built, for dengue virus: DengueSeq DENV3 [2]".
- **MISSING sub** → "A zero-read sample's all-N consensus". The photo caption now says "the paper's code … writes the
  full genome, all N", which speaks to N2: the defect is the wrapper's, not the paper's.
- **INSPECTED:** "1 of 2 tests run" → "1 test, in a real Galaxy". The old wording read like a rate. The legend now
  ends "Second test case not yet run", so the limitation is still on the board.
- **CUT item 1:** "serotype coverage plane" → "The paper's genome-completeness metric" (the ledger's `unmet` wording).
- **Cut for space.** "Skills are guidance, not enforcement" was dropped from INSPECTED to make room for the tools-decide
  line; col-b had no slack. Restore it if the design pass widens col-b.

**Sign-off still open:** N1 tone, N2 lead headline, #4 title ("Conversations"), #5 unpublished run dirs, #12 BAQ probe
numbers (`SHOW_PROBE=0` drops them), #13 the `[[ASK]]` note, #17 the live URL, #18 re-count at print, #19 Karpathy, T2
`b18269a1`.

## Design pass (2026-10-29)

Design editor. Before state: `checks/preview-draft2.png` (after the content pass; `preview-draft1.png` is the first
build). Built `SHOW_ASK=0`, then `SHOW_PROBE=0`, then the default build. All guards pass. Column slack is 52/16/84 px
(noask 221/16/84; no-probe 52/16/280), with no holes in either variant. The word count is 745 (was 723).

**Layout**

- **Rail sub-line.** The rail is 320 px (was 270), with the hero at 196 px (147 pt, still the biggest and darkest type)
  and a new 60 px (45 pt) cork-on-black line under it: what the board is. The height comes from the masthead, which had
  44 px of dead space above the eyebrow (masthead 406 px, board top 516 px), so the columns lose only 2 px.
- **INSPECTED subhead.** "The model drafts; the tools decide." is now a typeset 64 px (48 pt) Work Sans 800 subhead set
  beside the INSPECTED headline in two lines, the same head grammar as WANTED. It costs no height. It is a new field,
  `inspected.head`, and it is no longer repeated in the body.
- **N2, side by side.** MISSING: 10,707 N now shows two records of the same size next to each other: on the left the
  paper's code (grey, solid, four lines of N), on the right Galaxy's wrapper (white, dashed, header plus "(empty)").
  Each has its caption directly under it, with the subject in bold. The eye reads "the paper's code gives N; Galaxy's
  wrapper gives nothing". Col-c got 20 px shorter.
- **WANTED** is 97% of the column (was 94%), with more space after the tool id, so `bedtools_genomecoveragebed` no
  longer runs into `iuc`.
- **Seals** on INSPECTED are 100 px (was 112), to pay for the restored line.
- **The strip legend** is 38 px (was 40), so its first sentence no longer orphans "files." with the wider QR tabs.

**Print**

- **QR codes.** The tabs are 312 px (3.25 in including the 4-module quiet zone); measured symbols are 2.55, 2.55 and
  2.62 in (zxing on a 100 dpi render; were 2.36–2.42). The live slot is 350 px (3.65 in), still the largest. This
  replaces open question 8.
- **PDF size: 2.0 MB → 0.59 MB.** The cork speckle (5,200 vector dots) was 1.9 MB of path data, mostly hidden under
  flyers. After the audits, `build.mjs` now drops every dot that sits well inside a flyer, the rail or the strip (36 px
  inset, which clears the tilt). The visible cork looks the same. There were no raster images before or after.
- **Checked:** 3168 / 3186 pt pages; `pdffonts` lists only Anton, Work Sans and IBM Plex Mono, all embedded; `pdfimages`
  finds 0. The rail is `#141414`: ask the shop for K-rich black (unchanged). No `node_modules` or symlinks are left.

**Copy changes (meaning kept)**

- **Added** `hero_sub`: "One agent-built Galaxy workflow, from a dengue sequencing paper. What it couldn’t match is
  posted here." This is the content editor's ready copy.
- **Restored** "Skills are guidance, not enforcement" to INSPECTED, as the content editor asked if col-b gained room.
  The note now reads "…was followed in 0 of 15 graded runs. Skills are guidance, not enforcement [1, pp. 16, 18]."
  The single cite covers both sentences, because p. 18 is in it.
- **Moved** "The model drafts; the tools decide." out of `inspected.why` into `inspected.head` (same words).
- **Bold only** on "the paper’s code" and "Galaxy’s iVar consensus wrapper" in the N2 captions.

**Still open**

- Col-b has only 16 px of slack. Any added line there needs the FREE node strip shortened. For example, the input pill
  could share a row, or the rows could move closer together.
- The FREE node labels are 36 px (27 pt). They are legible close up but not at 2 m. That is acceptable for a supporting
  graphic, not a hero.
- Footer refs and counts are at the 24 pt floor. They are dense, but they are for the 3-minute reader.
- The sign-off items above are unchanged: N1, N2, #4, #5, #12, #13, #17, #18, #19 and T2.
