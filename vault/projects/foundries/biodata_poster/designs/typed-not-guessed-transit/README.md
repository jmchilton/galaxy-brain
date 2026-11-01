# typed-not-guessed-transit: two lines, one route

Pitch **`typed-not-guessed`** (`../PITCHES.md`), built in the transit-map visual language of `../transit-vision-v2/` (lines, stations, interchanges, termini, a map key that teaches, Overpass signage type, the same palette). The tooling was copied from there, but the structure and content are new. This is for CSHL Biological Data Science 2026: 44 × 44 in, with a 1 in safe margin.

## The idea

The nf-core/rnaseq figure is already a metro map, so the poster uses the metaphor literally. **Two lines run the same RNA-seq route** through shared stage zones (Entrance, Trim, Align, Quantify, Coverage, QC, Report):

- **Top: nf-core/rnaseq (Nextflow).** One ticket gate at the entrance ("nf-schema checks pipeline parameters here"). After that come open stations, where tool flags travel as free-form strings. The line ends at "Flag typos surface when the job runs".
- **Bottom: IWC rnaseq-pe (Galaxy).** Each station is a gate with a check mark, and each station is a real workflow step checked by `gxwf`. Track gauges on the segments show the collection type (`list:paired`, `list`, `reduce`). Interchanges mark where the shape changes: map-over is inferred at fastp, Flatten turns `list:paired` into `list`, and MultiQC reduces. The line ends at a black terminus, **"Validated before compute: 0 jobs run"**, with the real report: 39/39 tool states, 57/57 connections, 0 skipped.

**Hero (124 pt):** *Galaxy can type-check each scientific tool call before a single job runs.*
**Sub:** *Most pipelines check your ticket at the entrance. Galaxy checks it at each station.*

The **map key** teaches the type system: gate = type check, open station = no tool-level check, gauge = every connection type-checked, interchange = shape change. Four small **signs** follow:

- where the types come from (10,000+);
- Format 2 makes the types writable;
- a typo caught first;
- the same check everywhere.

The **closing line** is *Designed for humans, so it works for agents*, plus one Foundry sentence.

The map is the single data visual. Ideas lead and numbers support. The map has no DengueSeq, no ledger, no recompile loop and no corpus counts, as the pitch asks.

## Rebuild (one command)

```sh
./build.sh            # poster.pdf, poster-bleed.pdf, preview.png, checks/ (with and without [[ASK]])
./build.sh noask      # print version: poster.pdf with the [[ASK]] slot hidden (SHOW_ASK=0)
./build.sh extract    # re-run gxwf on IWC rnaseq-pe (origin/main of ~/projects/repositories/iwc) -> data/rnaseq-pe-gxwf.json
```

`data/planted.json` and `data/iwc-corpus-summary.json` are one-off runs. Their exact jq edits, commands, CLI version and date are recorded in each file's `_source`. `extract` does not regenerate them, but the build guards fail if the printed numbers stop matching them.

How `build.sh` handles dependencies:

- Deps live outside the vault, in `/private/tmp/claude-503/typed-not-guessed-transit-deps`. If they are missing, `build.sh` installs them there: playwright 1.64.1 (cached chromium), qrcode, js-yaml, `@fontsource/overpass{,-mono}`, and `@galaxy-tool-util/cli@1.15.0` for `extract`.
- `node_modules` is symlinked in only while building, and a `trap` removes it on exit. No symlink or `node_modules` is left in the vault.
- `build/` holds the generated HTML and font copies. It is git-ignored and contains no `.md` files.

| Edit | File |
| - | - |
| All copy | `content.yml` |
| Map geometry, station x positions, callout anchors | `map.mjs` |
| Styles, colour tokens | `poster.css` |
| Data guards, terminus numbers, typo receipt | `build.mjs` (reads `data/*.json`) |

### Build guards (the build fails on any of these)

- Overflow of a callout, key item, sign, footer block or the page, and content past the bottom margin.
- Anything outside the 1 in safe margin.
- Any text under 24 pt; SVG text is measured after scaling.
- Body text (`p`, `li`) under 28 pt.
- A hero under 100 pt.
- **More than 400 body words.** Words are counted in the DOM over every text node except `.nc`: the title, authors, affiliations, references and QR captions. Map labels, code and the hero all count.
- **An unembedded font**, from the `emb` column of `pdffonts` for both PDFs, or any non-Overpass font.
- **Data drift.** These must hold, or the poster copy has to be rechecked:
  - tool states ok = n = 39, with 24 inside subworkflows;
  - connections ok = n = 57;
  - skip = 0 and fail = 0;
  - the planted shape mutant rejects 8 connections, starting at step 12 (fastp);
  - the planted typo fails exactly step 21.
- **The `{every}` wording.** It is set mechanically. It reads "every" only when the rnaseq-pe run *and* the IWC corpus run both report 0 skips. Otherwise it reads "each", which is the current state.
- QR codes under 2.5 in of actual code.

### Outputs

- `poster.pdf`: 3168 × 3168 pt (44 in), vector, **0 raster images** (`pdfimages -list` is empty), and all 7 Overpass faces embedded and subset.
- `poster-bleed.pdf`: 3186 pt (44.25 in), with 0.125 in paper bleed and no crop marks.
- `preview.png`: 1500 px.
- `checks/preview-25.png`: 1056 px, the 25% distance check.
- `checks/preview-25-noask.png`: the same with `SHOW_ASK=0`. Its PDF is deleted; use `./build.sh noask` for a print file.
- `checks/preview-gray.png` and `checks/thumb-200.png`.

## Body word count

**334 words with the `[[ASK]]` slot, 321 without** (DOM count, limit 400). That excludes the title, authors, affiliations, refs and QR captions; the kicker, map labels, code, hero and live-results caption all count. For comparison, `pdftotext | wc -w` over the whole page is 430 with ASK and 417 without.

## Fonts and colour

- **Overpass** 400/600/700/800 plus italic, and **Overpass Mono** 600/700. Both are SIL OFL, via `@fontsource`, with no system fallbacks.
- **Lines:**
  - nf-core: green `#3D8B5A` (mid grey in greyscale);
  - Galaxy: navy `#1F3A6B` (dark);
  - parameter feeder: amber `#E9A419` with an ink edge (light).
- **Surfaces:**
  - paper `#F6F3EA`, alternating stage zones `#ECE7D9`;
  - hero and terminus `#17191F`; ask the shop for a K-heavy rich black;
  - placeholders: dashed ochre `#9C6B12`;
  - FAIL chip: `#A8322A`.
- The greyscale check reads cleanly: the green and navy lines are distinct, and the gates are ink on white.

## Sources for every printed fact

| Printed | Source |
| - | - |
| Thesis: Galaxy type-checks the tool invocation itself | `GCC:376-377`; `vault/papers/gxwf/manuscript.md:5` (abstract) |
| "each", not "every" | Pitch's pending wording check. rnaseq-pe has 0 skips, but `validate-tree` over IWC has **1 skip**. See `data/iwc-corpus-summary.json` and open question 2. |
| nf-schema checks pipeline parameters; no per-tool check in Nextflow, Snakemake or WDL ("most pipelines") | `manuscript.md:136-145` (Table 1) |
| "tool flags travel as free-form strings" | Table 1 (per-tool invocation validation: Nextflow "No"); nf-core's `ext.args` convention (`PITCHES.md` Pitch 1). Kept qualitative; not counted. |
| nf-core stations (cat fastq, FastQC, Trim Galore!, STAR, Salmon, StringTie, BEDtools genomecov, bedGraphToBigWig, RSeQC, MultiQC) | `ASSETS/gcc2026/rnaseq-nfcore-arrows.png` (the nf-core metro map, default STAR+Salmon route, a subset); nf-core/rnaseq README credits (Guinchard, Fellows Yates, Patel, Garcia) |
| Galaxy stations | IWC `rnaseq-pe.ga` @ `23ccd9915` (see the mapping below), checked against the gxwf report |
| 39/39 tool states ok, 24 inside subworkflows | `data/rnaseq-pe-gxwf.json` `summary` and `results`: 15 top-level tool steps plus 24 inside 4 subworkflows |
| 57/57 connections ok, 0 skipped | `data/rnaseq-pe-gxwf.json` `connection_report.summary`: 45 into top-level tool steps plus 12 into subworkflow steps. The pitch's jq count of 45 agrees. |
| Gauges `list:paired`, `list`; `reduce` | `resolved_outputs[].collection_type` for steps 0, 12, 18 and 11; MultiQC (26, 27) connections have `reduction: true`; `map_over: list` at 12, 18 and 21–23 |
| 0 jobs run | `gxwf validate` is static: no Galaxy server, no execution |
| Under a second on a warm cache | 3 timed runs at 0.59–0.63 s wall each, including Node start-up, with the tool cache warm, on 2026-10-30. Matches `manuscript.md:162` ("sub-second … once the tool cache is warm"). |
| 8 of 57 connections rejected, starting at fastp | `data/planted.json` `shape`. The real `.ga` with one jq edit: input `collection_type` `list:paired` → `list`. gxwf: "Incompatible types: output is collection<list>, input expects collection<paired>" at step 12. |
| Planted typo `tabdel_shrot`, with the legal values listed | `data/planted.json` `typo`. One jq edit to step 21 (featureCounts) `format`; gxwf 1.15.0 fails exactly that step and lists `tabdel_short`, `tabdel_medium` and `tabdel_full`. This replaces the slide's illustrative BAMX example with a real one. |
| 10,000+ Tool Shed tools *served* with typed parameter schemas | `GCC:408`; `manuscript.md:5,146`. Worded "served" per `vault/papers/gxwf/tasks.md:98`. |
| `.ga` string vs Format 2 YAML snippet | Re-typeset and trimmed from `GCC:384-403` (`output_sort: coordsorted`). Illustrative, not from rnaseq-pe. |
| One validator behind the CLI, VS Code, the browser and CI | `manuscript.md:5` (abstract) and its Authoring Surfaces section; `GCC:615` |
| Fast enough to repair in a tight loop | `GCC:499`; `manuscript.md:162` |
| "Designed for humans, so it works for agents" | `GCC:602-619` ("Format 2 is good for agents because it is good for humans") |
| Foundry agents write Format 2; gxwf decides | `DESIGN_DOSSIER.md` §3.5 ("the tools decide, not the model") |
| QR targets | `https://jmchilton.github.io/galaxy-tool-util-ts/` (gxwf docs), `https://jmchilton.net/slides/gcc2026/` (slides), `https://galaxyproject.github.io/foundry/` (Foundry). All returned HTTP 200 on 2026-10-30. The deck's `galaxy-brain/papers/gxwf/` link returns 404, so it is not used. |

Galaxy station → step mapping (rnaseq-pe.ga):

| Station | Steps |
| - | - |
| entrance gate | 0 (input `list:paired`) |
| Flatten | 11 |
| fastp | 12 |
| parameter steps ×5 | 13, 14, 15, 16, 17 |
| STAR | 18 |
| unstranded / stranded coverage (subworkflows) | 19 / 20 |
| featureCounts | 21 |
| StringTie | 22 |
| Cufflinks | 23 |
| RNA-seq QC (subworkflow) | 24 |
| count tables (subworkflow) | 25 |
| MultiQC ×2 | 26, 27 |
| pick ×2 | 28, 29 |

Everything is from real files read-only. No statistic is invented and no success rate is implied: the terminus is "one real report" on one community-authored IWC workflow. Nothing on the poster says the IWC workflow was agent- or Foundry-built.

### Not on the poster (README only)

- **IWC corpus**, `gxwf validate-tree` over the 133 `.ga` files at `23ccd9915` (default mode; `validate-tree` has no `--connections`), after `galaxy-tool-cache populate-workflow` on each file: **3217 tool states ok, 0 fail, 1 skip**. The skip is `bgruening/rdock_sort_filter/2013.1-0+galaxy0`, not found in the Tool Shed, in `computational-chemistry/fragment-based-docking-scoring`. Without populating the cache, the same command reports 2310 skips (cache misses). Corpus totals are kept off the poster, as the pitch asks.
- **Full `--strict` on rnaseq-pe.ga exits 2.** `--strict-encoding` rejects the `.ga`'s legacy JSON-string `tool_state` on every tool step. The printed run uses `--connections --strict-structure --strict-state`, and the refs print exactly those flags.

## `[[ASK]]` and placeholder slots

1. **`[[ASK]]` nf-core/rnaseq and nf-core/atacseq as Galaxy workflows (A. Nekrutenko).** It reads "atacseq partial. Foundry-validated" (dossier §4 caveats) and carries no numbers.
   - It sits in the footer under the closing line, visually separate from the map's IWC line, so it can't be read as the source of the Galaxy line.
   - I included it because the poster's comparison is literally nf-core/rnaseq.
   - Hide it with `SHOW_ASK=0` (`./build.sh noask`). The closing column just gets shorter, with no hole (`checks/preview-25-noask.png`).
2. **`[[QR: live results]]`** sits top right, 4.15 in, and always renders. When the URL exists, replace the `live-ph` div in `build.mjs` with `await qr(url)`.

## Open questions

1. **Title.** I used the pitch's working title, *Galaxy Type-Checks the Science, Not Just the Pipeline*. The dossier offers *From Papers and Conversations to Runnable Galaxy Workflows*, but that title doesn't fit this pitch. Which should it be?
2. **"each" vs "every".** One IWC skip (a tool missing from the Tool Shed) flips the hero to "each", per the pitch's rule. Is "every" acceptable, given that rnaseq-pe itself has 0 skips? Changing the rule in `build.mjs` flips both the hero and the sub.
3. **The slide/pitch claim "`list:paired` → `paired` with no flatten is rejected"** (`GCC:520`; Pitch 1 §4) looks wrong. In rnaseq-pe, fastp takes `list:paired` into its `paired` input and gxwf maps over `list` (ok). The poster uses the verified planted mutant (`list` into `paired` is rejected) instead. Should the slide be fixed?
4. **`gxwf convert rnaseq-pe.ga` to Format 2** fails post-conversion validation on `when:` connections (steps 21–23, 26, 27). It falls back to `tool_state`, which `--strict-encoding` then rejects. Is this a converter bug worth an issue? It is why the Format 2 snippet stays the slide example.
5. **nf-core count left qualitative.** "N of M processes take flags via `ext.args`" needs a tagged nf-core/rnaseq release; the latest is 3.27.0. Compute it, or keep it qualitative?
6. **nf-core metro-map credit.** The figure shows a CC BY mark, but the version isn't confirmed and the repo licence is MIT. The stations are redrawn as names only, so is the courtesy credit in ref [1] enough?
7. What is the live-results URL?
8. `[[ASK]]` slot: fill it, or print with `SHOW_ASK=0`?
9. Bleed: send `poster-bleed.pdf`, or does the shop trim at 44 in? Rich black for the hero and terminus?
