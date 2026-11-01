# typed-not-guessed-receipt (round 4, Old-school styling)

This is the round-5 **Old-school** restyle of `../typed-not-guessed-receipt-r4/`, which is left untouched for side-by-side comparison. Content, layout concept, receipts, tape and QR targets are the r4 ones. Only tokens, fonts and surfaces changed, per `../STYLE_OLDSCHOOL.md`. The round-4 notes below still describe the content; where they name the old look (graph paper, navy pen, Archivo Black), this section overrides them.

## Round 5 styling (Old-school)

**What changed**
- **Palette.** The `os-*` token block from the guide replaces the Claude-style tokens, with the old names kept as aliases. Nothing is darker than `os-ink` `#2b2722`. Apart from the two slide crops, the only colours are `os-stamp` (TYPED, VOID, FAIL, the gxwf tags, "one", "BAMX") and the amber `os-hl`. Navy pen is now graphite `os-pen` (notes, arrows, the PASS stamp, the Tool Shed and human-reviewed tags).
- **Page.** Aged manila with a radial vignette to `os-page-edge` and a faint cyan cross-process ring in the corners. Horizontal ledger ruling every 0.5 in, with a major line every 2 in, replaces the square grid.
- **Slips.** The thesis strip, receipt, band, Format 2 card and GET STARTED slip all get the thermal-fade gradient (`os-slip` → `os-slip-burn` at the foot), seeded vector grain and a solid `os-shadow` offset. The cards have square corners and a 1.5 pt `os-ink-soft` edge.
- **Receipt edge.** The torn edge is finer and irregular: 78 teeth alternating 0.18 and 0.24 in wide (scaled to the receipt width), with varying depth, filled `os-slip-burn` with a 1 pt `os-shadow` hairline.
- **Stamps.** Oswald 600 with a 3 pt double border (4 pt gap) and a worn-ink knockout: opaque specks in the receipt's local paper colour, clipped to the stamp. PASS moved up about 0.1 in so it clears the text rows and sits on the END OF RECEIPT dashes.
- **Highlighter.** `hl()` uses `os-hl`, still with `top-edge: "x-height"` and `bottom-edge: "descender"`. The hero's two marks are amber over a light stamp-red halftone (0.14 in pitch, 0.056 in dots).
- **Tape.** An `os-tape` body with an edge-darkening gradient and an opaque 1.5 pt outline mixed from 40% `os-rule`.
- **QR codes.** `make_qr.py` writes `os-ink` modules on an opaque `os-qr-ground` with a 4-module quiet zone, framed by a 2 pt `os-rule` line. The `[[QR: live results]]` placeholder sits on the same ground, with an `os-ink-fade` dash.
- **Slide crops.** A new build step, `age_images.py`, writes `assets/*-aged.png` from the originals: flattened on white, desaturated 20%, then levels mapped from `os-ink` (black) to `os-qr-ground` (white). The pixel size is unchanged, so the crop maths holds. The red arrows stay clearly red, and the originals are kept.
- **Band diagram.** Stations use an `os-page` fill with square corners. The arrows between stations are the route colour, a mix of 80% `os-ink` and 20% `os-cyan`.
- **New gates.** The header must end 0.35 in above the thesis slip, and the hero must fit inside its 4.15 in strip, because the wider Courier Prime could wrap. All r4 gates (receipt, columns, band, QR ≥ 2.5 in, safe zone) still pass.

**Fonts.** All are vendored in `fonts/` with their licence files, and all are embedded.

| Font | Use | Licence |
| - | - | - |
| Courier Prime Bold | title, hero thesis | OFL (`courierprime-OFL.txt`) |
| Special Elite | tear-line labels (TEAR HERE, REPRINT, END OF RECEIPT, A TYPO IN FORMAT 2) | Apache 2.0 (`specialelite-LICENSE.txt`) |
| Oswald SemiBold | band head, GET STARTED, THE WIKI, stamps, tags, QR captions | OFL (`oswald-OFL.txt`) |
| IBM Plex Serif Regular and SemiBold | authors, affiliations, band paragraph, references | OFL (`ibmplexserif-OFL.txt`) |
| IBM Plex Mono Regular and Bold | receipt, cards, commands, station labels | OFL (`ibmplexmono-OFL.txt`) |
| Kalam Regular and Bold | pen notes, loop label, "Types aren't biology" | OFL (`kalam-OFL.txt`) |

`audit.py`'s allowlist is updated to these fonts. Archivo Black is removed. Plex Mono SemiBold is still vendored and allowed from r4, but it is now unused (the authors moved to Plex Serif).

**Departures from the guide**
- **The hand is Kalam, not Homemade Apple.** I tested Homemade Apple on the note heads. It is about 16% wider than Kalam Bold, has a 1.0 em cap height and only a Regular weight, and its hairline strokes read poorly at 6 ft. Its tall ascenders and descenders also collided with the note bodies, so I went back to Kalam, which is the guide's own fallback.
- **The mono is Plex Mono, not VT323.** At 1.25× size, VT323 would overflow the receipt gate. The guide calls Plex Mono the safe choice.
- **No Special Elite kicker.** The poster has none, and adding one would add copy, so Special Elite appears only on the existing tear-line labels.
- **The author block has no slip, as specified.** But the rule sits between the title and the authors (nothing is above the title), and the dotted rule goes under the hero on the thesis strip, which acts as the title slip.
- **Line weights are heavier than the guide's.** Arrows stay at 5.5 pt and badge circles at 5 pt, rather than the guide's 3 pt, which looks hairline on a 44 in sheet. The tape and QR outlines are 1.5–2 pt, not 0.5–1 pt, for the same reason.
- **Grain specks are 1 pt in radius, not 0.6 pt,** and their count scales with slip area (about 600 per 16 × 16 in).
- **Gate stations are not filled** with `os-ink`. A red gxwf tag on a dark fill would lose contrast, so the gxwf stations stay open and are tagged, as in r4.
- **The slide crops keep their colour.** The nf-core metro lines stay a muted rainbow and the Galaxy arrows stay red, against the guide's no-other-accent rule. Both captions name the red arrows, so the aging only desaturates the crops by 20% and lifts their blacks and whites.
- **No halftone on tape, shadows or bars.** The halftone is used only behind the hero mark. The poster has no bar chart, and the shadows stay solid per the guide's card rule.

**Word count:** 591, the same as the source (measured from a temp compile of the r4 `poster.typ`), so the change is 0%.

**Checks on the final render**
- **25% (6 ft).** The title, thesis, receipt totals, WALL TIME, stamps, band head and note heads all read. The page reads as aged paper under a vignette, not as plain beige.
- **About 100 ppi (3 ft).** In note 1, the two-line highlight clears the descenders of the line above. The stamps cover no text.
- **Greyscale.** The stamps go dark grey, and the hero halftone mark reads clearly. The note highlights separate from the page by about 24 grey levels: in `pdftoppm -gray` at the page centre, `os-hl` is 199 and `os-page` is 223. That works, but it is the subtlest pair on the poster. gxwf and Tool Shed tags differ by their text, as in r4.
- **QR codes.** All four decode from a 40 ppi render with OpenCV.
- **Size and fonts.** The bleed PDF is 44.25 in. The only rasters are the two slide crops. All fonts are embedded and vendored.

**Open questions**
1. In greyscale, note highlights on bare manila are the subtlest pair (24 grey levels). Should `hl()` go a touch darker than the guide's `os-hl`?
2. Should the PASS stamp stay graphite (`os-pen`), or use the one stamp red, like VOID and TYPED?
3. Courier Prime's title is lighter than Archivo Black was. Is that weight enough at 6 ft? The title line has only about 1.3 in of room, so it can grow to about 124 pt at most.
4. Before the full run, proof the guide's 6×6 in swatch strip, in case the manila goes mustard on the large-format printer.

## Round 4 changes

**What John said.** In `../FEEDBACK_ROUND4.md`, this poster is ranked #5 with no notes of its own. The general notes apply to it:
- higher density;
- tell the reader what the Foundry *does* and how to *use* it;
- keep the tape.

All round-3 rules (`../FEEDBACK_ROUND3.md`) apply too, except the 400-word cap.

**Round-3 fixes, which this poster was missing until now:**
- **Authors.** Scott Cain¹ is added before Anton Nekrutenko, verbatim from `FEEDBACK_ROUND3.md` §3.
- **QR codes.** The Foundry and preprint codes (`doi.org/10.64898/2026.10.26.761864`) are added, along with Install (`/usage/`). The gxwf docs code is kept. The gcc2026 Slides code is dropped. There is no lightning-talk code.
- **Wall time before JOBS RUN.** `WALL TIME ... < 1 s` is now the big 84 pt line. "jobs run to reach this verdict ... 0" follows it in body size, so no big zero appears.
- **No full Nextflow drawing.** The nf-core metro map is cropped to its entrance: FASTQ, the red arrow, then cat fastq through UMI-tools. The ellipse is recomputed for the crop.
- **Highlighter.** `hl()` starts at `top-edge: "x-height"` (bottom edge at the descender), so it no longer covers the descenders of the line above. Only the hero passes `cap-height`. I checked this at 100 ppi on note 1's two-line highlight ("type each / tool call and each connection"): the descenders in "flags", "process" and "Galaxy" on the lines above stay clear.
- **Content guards.** There is no 0/15, no Rumsfeld quote, and no DengueSeq. Nothing claims tool pins pass VERIFY.

**What changed and why:**

1. **Stronger side points.** Round 3 had called these the "weakest" part of the poster.
   - The cropped nf-core entrance ("one arrow") now sits beside a crop of the Galaxy editor graph with arrows on every parameter and connection ("arrows everywhere"), from the GCC slides.
   - Note 1 now ends on the contrast: "Galaxy can type each tool call and each connection." It says "each" to match the thesis, because the receipt's connections are top level only.
2. **Shorter middle list.**
   - TOOL CALLS is folded to fastp, rna_star and featureCounts, plus "… 7 more tools 12" and "inside 4 subworkflows 24". The total still reads 39.
   - The pen tally is gone. It only restated 39 and 57.
3. **New Foundry band** (bottom, under the left column and the receipt): "Where gxwf sits in a Galaxy Workflow Foundry run". This is the answer to "what does it do / how do I use it". It has these parts:
   - **What it does.** A one-breath paragraph: from a paper or a Nextflow pipeline; a knowledge problem, not a syntax problem; an inspectable wiki compiled into skills with provenance; the tools decide.
   - **The spine.** A station diagram of the brief-route pipeline: paper | Nextflow → workflow brief (human-reviewed) → interface → data flow → compare to IWC → template → a dashed **loop** (next step `gxwf` → pin tool `Tool Shed` → write step → check `gxwf`) → test plan → write test → validate `gxwf validate` → run test `validate-tests · Planemo` → debug. Every gxwf station is tagged in stamp red.
   - **THE WIKI.** A dated corpus box: 420 notes · 56 Molds · 69 compiled skills (no arrow: 69 = 56 Mold casts + 13 pipeline harnesses), as of 2026-10-24.
   - **An honest limit.** "Types aren't biology": no static check catches a spliced aligner run on a bacterium (preprint p.4). That is why the run ends in tests and the brief gets human review.
   - The gxwf docs QR code.
4. **GET STARTED slip** (right column): the Claude Code and Codex install commands verbatim from r1 §8, plus `npm install -g @galaxy-tool-util/cli`. The QR codes for Foundry, Install and Preprint sit under it.
5. **"Rails, not reminders" note (6).** In the companion Orbit study, Galaxy's connection check flagged an agent's bad tximport wiring before it ran; skills are "guidance, not enforcement" (p.16). Its arrow points at the receipt's INVALID connection line.
6. **Format 2 card + BAMX typed slip.** GCC's "Tool state, validated" example is now a real run.
   - IWC chipseq-sr is converted to Format 2 by `gxwf convert`, and MACS2 `format: BAM` is changed to `BAMX`.
   - `gxwf validate --connections --strict` fails, and the slip quotes its real lines: `Expected "BAM"` / `"BAMPE"` / `"BED"`, actual `"BAMX"`, plus 1 more union-branch line. The slide's tidied `"BAM" | "BAMPE" | "BED"` is not used.
   - The unplanted file passes full `--strict` with 7 validated and 14 connections ok.
7. **REPRINT repair stub on the VOID tear-off** (advice idea b). The featureCounts copy has `PE_fragment` restored to `PE_fragments` and is re-run for real: 39 validated, 0 failed, 0.60–0.65 s over 3 runs. A pen-blue PASS stamp marks it, and note 7's arrow points at it.
8. **Layout.**
   - The header and thesis moved up about 0.15 in.
   - The receipt now ends at 32.0 in.
   - The right column runs the full height, so the band spans only the left column and the receipt. The page is asymmetric and no longer reads as three equal columns.
   - Notes are renumbered 1–7 in reading order: left 1–2, right 3–7.

**Word count: 395 → 591** (guard raised to 700 in `audit.py`). It is counted the keeper way: PDF tokens with a letter or digit, with the title, authors, references and QR captions hidden.

**Departures from the advice (`../ADVICE_ROUND4.md` §5):**
- **Idea (a), a pen ruler down the receipt.** Not done. The six arrows already mark "checked here" at each section, and a ruler would cross them.
- **Note 4's IDE list.** Kept. It is short and not crowded.
- **Advice Part 3's Orbit/Hokken box.** Not adopted. Hokken is left out, and Orbit appears as one rails note. This poster is about types, not the traditional box layout.
- **Galaxy image caption.** The GCC graph's labels differ slightly from IWC rnaseq-pe @ 23ccd9915 (e.g. "Collection of FASTQ files", "Combined MultiQC Quality Report"), so it is captioned "Galaxy" (credited "GCC 2026 slides"), not "rnaseq-pe". The arrows are not counted, and no count is printed.
- **Pipeline count.** None is printed (r1 line 13 is John's call). The route is drawn as the brief route, unlabelled. Neither `paper-to-galaxy` nor `nextflow-to-galaxy` is named.

**`[[ASK]]` slots:** none. Anton's nf-core work is left out entirely, as in round 2, so there is no `SHOW_ASK` flag and no SHOW_ASK render. `[[QR: live results]]` is the only placeholder (3.6 in, top right).

**Open questions:**
1. Title: keep "Galaxy Workflows: Typed, Not Guessed", or use the pitch line "Build better skills…"?
2. Band head: "Where gxwf sits in a Galaxy Workflow Foundry run". Should the Foundry be first in the head instead?
3. Is the THE WIKI corpus row (as of 2026-10-24) OK to print, or should it be re-counted at print?
4. QR codes: Install + Foundry + Preprint + gxwf docs. Bring back the GCC Slides code?
5. Is the Galaxy editor-graph crop OK with no workflow name? The image is from an older rnaseq-pe revision.
6. Carried over: the IWC corpus line (tool state only, non-strict); `gxwf convert` on rnaseq-pe failing on `when:` connections (chipseq-sr converts cleanly); edge-to-edge vs `poster-bleed.pdf`.

## Rebuild

```sh
./build.sh                 # offline: data/ -> receipt.json -> QR -> PDFs + preview -> audits -> checks/
SKIP_TREE=1 ./rerun_gxwf.sh  # optional: re-run gxwf and refresh data/ (drop SKIP_TREE to redo all of IWC, ~3 min)
```

`build.sh` runs these steps:

1. **Extract.** `extract.py` turns the saved gxwf output in `data/` into `receipt.json`. It asserts that:
   - the totals match gxwf's text summary, and quantities sum to 39;
   - the VOID lines parse from the saved JSON;
   - `repair.json` passes with the receipt's own totals;
   - the BAMX diff is exactly `format: BAM` → `BAMX`;
   - gxwf's named alternatives are exactly BAM, BAMPE and BED;
   - the unplanted Format 2 file has 0 fail and 0 invalid.
2. **QR codes.** `make_qr.py` (segno) writes the vector SVGs (`os-ink` on `os-qr-ground`) and `assets/qr.json`. Then `age_images.py` (Pillow) writes the aged slide crops `assets/*-aged.png`.
3. **Render.** `render.py` runs Typst 0.15.0 via `uvx --from typst==0.15.0`, with vendored fonts only. It writes `poster.pdf`, `poster-bleed.pdf` (44.25 in), `preview.png` (1496 px), and a word-count PDF.
4. **Audit.** `audit.py` (PyMuPDF) fails on a non-vendored or unembedded font, text under 24 pt, or a body over **700 words**.
   - Spans from 24 to 28 pt are the references (exempt) and the station tags in the band diagram (26 pt, labels, not body).
   - **Raster exceptions to the 24 pt floor**, which the audit can't see: the nf-core entrance crop (station labels about 14 pt) and the Galaxy editor-graph crop (node labels about 5 pt; it reads as a field of red arrows).
5. **Layout gates in `poster.typ`.** The build fails if:
   - the receipt's natural height overflows;
   - the left column runs past 32.6 in;
   - the right column runs past 42.95 in;
   - the band's content runs past its box;
   - any QR code is under 2.5 in (quiet zone excluded);
   - any box sits outside the 1 in safe zone, or the band overlaps the receipt or the columns.
6. **Checks.** `pdftoppm` writes `checks/preview-25.png` (1056 px), `checks/preview-gray.png` and `checks/thumb-200.png`.

**Temp paths.** Caches and temp files go in `/private/tmp/claude-503/typed-not-guessed-receipt-r4-oldschool-deps/`: the uv cache, the word-count PDF, npm deps, the tool cache and `work/`. Nothing is symlinked into the vault, and there is no `node_modules` here.

**To edit the copy:**
- The title and authors are at the top of `poster.typ`.
- The receipt is `receipt-body`.
- The notes are the `#note(...)` calls in `left-col` and `right-col`.
- The band is `band-body`, and the install commands are `start-slip`.
- The arrows are in the `// arrows` block.

## Fonts

See "Round 5 styling (Old-school)" above for the fonts. Kalam, Courier Prime, Oswald and Special Elite lack `→` and `↺`, so those glyphs are set in Plex Mono.

## Sources for every fact

**Run facts.** The runs are pinned to `@galaxy-tool-util/cli@1.15.0` and IWC `23ccd9915`. Node v25.6.1, macOS, re-run on 2026-10-30 (`data/run-meta.txt`). After the round-4 re-run, `validate.json`, `validate.txt`, `void-param.json` and `void-conn.json` are identical to round 2, apart from temp paths.

| On the poster | Source |
| - | - |
| Receipt header command; tool lines; `39 validated, 0 skipped`; "… 7 more tools 12"; "inside 4 subworkflows 24" | `data/validate.json` `.results`, `data/validate.txt` |
| `57 ok, 0 invalid` (top level); list:paired → fastp map over list; 5 map-overs; 13 reductions | `data/validate.json` `.connection_report` |
| WALL TIME `< 1 s`; "warm cache, 5 runs 0.54–0.68 s" | `data/timing.txt` (re-measured 2026-10-30). Consistent with `vault/papers/gxwf/manuscript.md:162` |
| jobs run 0 | `gxwf validate` is static |
| ALL OF IWC 133 / 3,217 / 0 / 1 | `data/iwc-tree-summary.json` (round 2; not re-run) |
| VOID FAIL / INVALID lines | `data/void-param.json`, `data/void-conn.json` |
| REPRINT: `PE_fragments` restored; 39 validated, 0 failed; 0.60–0.65 s, 3 runs | `data/repair.json`, `data/repair-timing.txt` (`rerun_gxwf.sh` step 5) |
| BAMX slip: chipseq-sr Format 2, MACS2 (`macs2_callpeak` 2.2.9.1+galaxy0) `format: BAMX`; three named Expected lines + 1 more; unplanted 7 validated, 14 ok | `data/bamx.json`, `data/bamx.txt`, `data/bamx.diff`, `data/bamx-fixed.json` (`rerun_gxwf.sh` step 6) |
| `.ga` 1,149-character string; Format 2 excerpt | `data/featurecounts-tool_state.txt` |
| nf-core: pipeline params checked, flags free text; Snakemake and WDL stop at the workflow level | `manuscript.md:136-145` (Table 1) |
| nf-core entrance crop | `jmchiltondotnet/public/slides/gcc2026/rnaseq-nfcore-arrows.png`, source px (60, 135, 720×330); nf-core artwork, CC BY |
| Galaxy graph crop | `jmchiltondotnet/public/slides/gcc2026/rnaseq-gx-arrows.png` (GCC 2026 slide; alt text "Galaxy RNA-seq workflow graph with arrows highlighting parameters and connections"), source px (330, 300, 900×720) |
| 10,000+ typed schemas, served | `GCC:408`; `manuscript.md:5,146`; caveat `vault/papers/gxwf/tasks.md:98` |
| CLI, VS Code, browser and CI share one core | `manuscript.md` Abstract, "Consumers of the Validation Core" |
| "Readable YAML, so good for humans and agents alike" | `jmchiltondotnet/src/content/slides/gcc2026.mdx:602-619` |
| Rails note: Galaxy's connection check flagged bad tximport wiring before execution; "Skills are guidance, not enforcement" p.16 | `../../research/r7-biorxiv-preprint.md` §6.1–6.2, §5.2 (preprint p.4, pp.15–16, Fig S3A; p.16) |
| "Types aren't biology": spliced aligner (HISAT2) on a bacterium, caught only by a human | `r7-biorxiv-preprint.md` §6.3 (preprint p.4) |
| Band paragraph (paper or Nextflow; knowledge problem, not syntax; inspectable wiki compiled into skills with provenance; gxwf, Tool Shed, Planemo decide) | `../../DESIGN_DOSSIER.md` §2, §3.2–3.5 |
| Spine stations (brief route) | `../../research/r1-foundry-system.md` §2.2 `workflow-brief-to-galaxy` phases; brief human-reviewed per `../ADVICE_ROUND4.md` Part 3 / dossier §4 |
| gxwf at next step / check / validate / run test; Tool Shed at pin tool; Planemo at run test | `r1-foundry-system.md` §4.1 (draft-next-step, draft-validate, validate, validate-tests then planemo test; discover-shed-tool inside advance-galaxy-draft-step) |
| THE WIKI: 420 notes, 56 Molds, 69 compiled skills (2026-10-24) | `DESIGN_DOSSIER.md` §4 "Corpus figures"; `r1-foundry-system.md` §1.1 |
| Install commands | `r1-foundry-system.md` §8 (Claude Code, Codex); `gcc2026.mdx` "Published CLI + docs" (npm) |
| Preprint citation | `DESIGN_DOSSIER.md` §5 |

**QR targets** (all returned HTTP 200 on 2026-10-30):

| Caption | URL |
| - | - |
| Foundry | https://galaxyproject.github.io/foundry/ |
| Install | https://galaxyproject.github.io/foundry/usage/ |
| Preprint | https://doi.org/10.64898/2026.10.26.761864 |
| gxwf docs | https://jmchilton.github.io/galaxy-tool-util-ts/ |

## Wording decisions

The round-2 decisions are unchanged:
- **"each", not "every"** in the thesis, because IWC has 1 skip.
- **Not full `--strict`** on the receipt, because the legacy `.ga` string encoding fails `--strict-encoding` (`data/strict-encoding.txt`). The BAMX slip *does* use full `--strict`, because its file is Format 2.

## Iterations (round 4)

- **r4 v1.** The left column overflowed 6.4 in into the band. The nf-core and Galaxy crops showed the logo and the wrong region: Typst fit-cropped the image about its centre because only `width` was given. The PASS and VOID stamps covered text, and `↺` fell back to a non-vendored math font, which the audit caught.
- **r4 v2.** Both image dimensions are now passed to `crop()`. The restating "checked before a job runs" slip and the tally are dropped, the Galaxy crop is shortened, and notes 1, 2, 3 and 6 are trimmed. The stamps are moved and `↺` is set in Plex Mono. THE WIKI box fills the empty right end of the band's first row.
- **Checks on the final render:**
  - At 25%, the thesis, receipt totals, WALL TIME, stamps, band head and station names all read.
  - In greyscale, the stamps go dark grey and the highlights light grey; gxwf tags read by their box outline, not by hue.
  - At 100 ppi, the highlighter clears the descenders on the line above.
  - The bleed PDF is 3186 pt square, and all gates pass.
