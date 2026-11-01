# specimen-grounded-v2

Second draft of design #5: concept C (field guide / specimen plate), Grounded stance. 44 × 44 in, 1 in safe margin. v1 is untouched in `../specimen-grounded/`.

**Idea.** The poster is a natural-history plate. One thesis sits at headline size: *A correct workflow is a knowledge problem, not a syntax problem.* Under it is a six-numeral "Key to the plate" (wiki → Molds → skills → pipelines → tools decide → recompile). The dominant image is **No. 1 DengueSeq**, mounted full width at 1:1. Its real Galaxy graph is laid out from the `.gxwf.yml`, with ledger defects pinned on the nodes. Beside it are the tools' marks and the Orbit 0/15 callout; below it are a label carrying both provenances and the known-defects list. **No. 2 bacass** is the one red specimen. "Fix the knowledge, recompile" shows the two real hash flips. The "Empty mounts" drawer holds the partial and unmounted runs as one-line labels with status glyphs.

## Build

The deps live outside the vault (the vault site globs `projects/**/*.md`, and `node_modules` ships `.md` files):

```sh
D=/private/tmp/claude-503/sg2-deps        # any directory outside the vault
mkdir -p "$D" && cp package.json package-lock.json "$D"/ && (cd "$D" && npm ci)
ln -s "$D/node_modules" node_modules
npm run check            # build/model.js -> poster.pdf, poster-bleed.pdf, preview.png, checks/*.png
rm node_modules          # remove the symlink again when done
```

**Commands:**

| Command | Output |
| - | - |
| `npm run build` | `poster.pdf` (44 × 44 in), `poster-bleed.pdf` (44.25 in) and `preview.png` (1500 px) |
| `npm run check` | as `build`, plus `checks/preview-25.png` (1056 px, the 25% test), `preview-gray.png`, `preview-200.png` and `preview-safe.png` |
| `npm run build:no-ask` | as `check`, with every `[[ASK]]` slot hidden (it reflows, leaving no hole); this **overwrites** `poster.pdf` |
| `npm run fetch-data` | re-copies `./data` from the run dirs and foundry git |

**Hard failures.** The build exits non-zero on a card or mount overflow (text is clipped), and on any text run below **24 pt** after graph scaling. `textUnder28pt` in the JSON report lists runs at 24–28 pt.

**Browser.** Playwright 1.59.1 needs Chromium revision 1217, which is cached on John's machine. Elsewhere, run `npx playwright install chromium` once. `pdfinfo` (poppler) is optional and checks that the output is one page.

**Debug views.** Open `poster.html?safe` for the 1 in margin, `?grey` for greyscale, `?noask` to hide the ASK slots and `?bleed` for the bleed sheet.

## Editing text

| What | Where |
| - | - |
| Title, hero, key strip, labels, recompile panel, drawer, refs | `poster.html` (plain HTML; `→` is swapped for an SVG arrow at render time) |
| Defect wording for ledger entries, how many to show | `content/specimens.yml` (`glosses`, `show_defects`) |
| QR targets | `content/specimens.yml` → `qr:` |
| Colours, sizes, grid rows | `styles.css` (`:root` tokens; `.poster` grid rows; `.row` columns) |

**From data, not hand-typed:**

- graph nodes, edges, step numbers, tool names, versions and changesets (truncated to 8 characters);
- the Tool Shed, gxwf and Planemo marks;
- ledger counts;
- which node carries each defect pin (the ledger's `step:`);
- the 1a drawer marks;
- the two recompile hash pairs;
- the QR codes.

`scripts/prepare.mjs` fails the build if an open ledger entry has no gloss, or if a gloss names a missing or resolved id. The MRSA drawer marks are hand-summarised from `run-summary.md` in `render.js` → `main()`.

## Changes from v1

**Content: must-fix and should-fix items from REVIEW_CONTENT.md**

- **Thesis stated.** "A correct workflow is a knowledge problem, not a syntax problem" is the hero. Beside it sits the dossier's one-breath argument: Galaxy practice outpaces training data, so knowledge goes in an inspectable wiki, compiles to skills, the tools decide, and gaps are written down.
- **Two provenances.** No. 1's label has a *Built by* row (build provenance: foundry-skills `f275059e`, each skill hashing its notes) and a *Ran on* row (execution provenance: Planemo 0.75.47 on a disposable Galaxy @ `b18269a1`). The key strip's "Compile" cell names build provenance too.
- **"Methods omit choices."** The known-defects caption reads: "Methods sections routinely omit result-changing choices,¹ so gaps are expected." The Hokken drawer row adds that checking against the authors' data surfaced a modelling choice the methods never stated.
- **0/15 in context.** It now reads "In the companion Orbit study (open-weight models)…", in a callout tied to No. 1's tool marks.
- **No. 1 subtitle.** It now says "from a paper and its linked code", not "from a methods section".
- **BAQ glosses (D4, D5).** The stale "not yet checked on SRR25366733" is replaced by the later probe result (0 positions; 484 vs 476 rows), labelled as outside Galaxy, with "entry still open".
- **#657.** "An outside user's run" is now "a colleague's".
- **Upstream PRs.** usegalaxy-tools #1791 is shown as merged; galaxy #24435 as open.
- **Rate reading.** The plate caption reads "One run, not a sample from a population."
- **13 pipelines.** The gloss now says "to a Galaxy workflow, to CWL, or to a brief a human reviews". On `origin/main`, 6 end in `-to-galaxy`, 3 in `-to-workflow-brief`, 2 in `-to-cwl`, and 2 are review/maturation.
- **1a.** "Not yet re-run" is dropped. It was inferred, and no post-#701 run dir exists.
- **Karpathy.** The full gist URL is now cited.
- **CI count.** 31 pattern workflows, per the corrected dossier.

**Design: per-poster and cross-cutting items from REVIEW_DESIGN.md**

- **Hero.** 124 pt upright Fraunces 800, black, full width, with "knowledge problem" in dark red and underlined so it holds in greyscale. The title drops to ink-brown at 120 pt so the hero has the highest contrast. The three-beat line ("The agent drafts. The tools decide. **Defects go on the label.**") is 78 pt.
- **Fewer, bigger specimens.** No. 1 DengueSeq is mounted full width at scale 1.0: node names 30 pt, versions and changesets 26 pt (v1: 21 and 16 pt). No. 2 bacass is at 0.92 (names 27.6 pt). MRSA and 1a move into the drawer as one-line labels with glyphs. nf-core/demo is cut.
- **Layout engine.** ELK layered layout, run in the page with measured text, replaces dagre.
- **Key to the plate.** It is now a horizontal numeral strip under the hero (specimen-vision's form), with no 0/15 in the numeric row.
- **Lighter cards.** The 3 px black card borders are replaced by hairline rules, and the recompile and drawer panels are unboxed. The card grid of 10 near-equal regions is now one dominant specimen plus a three-panel lower row.
- **Reference-collection tray.** Deleted; it was texture, not information.
- **QR codes.** 3 in, plus a 3.4 in live-results slot (the largest). They are black on white with a 4-module quiet zone, have 30 pt captions, and sit top right next to the hero. All three decode from a 100 dpi raster (OpenCV).
- **Placeholders.** One style: a dashed ochre outline with no fill (the v1 hatch is gone). `--no-ask` hides the ASK slots; the live-results QR always renders.
- **Size floors.** Nothing is below 24 pt anywhere, enforced by the build. That covers pins, refs, QR placeholder text, graph versions and graph numbers.
- **Fonts.** The CSS stacks no longer have system fallbacks. `pdffonts` lists only Fraunces, Source Serif 4, IBM Plex Sans Condensed and IBM Plex Mono, all CID TrueType and embedded. Arrows and the recompile glyph are inline SVG.
- **Bleed.** `poster.pdf` stays at a 44 in trim. `poster-bleed.pdf` is 44.25 in, with the paper tint running 0.125 in past the trim on every side and no crop marks. There are no rules or frames within 0.9 in of the trim.
- **Checks.** `checks/preview-25.png` (1056 px), `preview-gray.png` and `preview-200.png`, per review §3.1.
- **Word count.** `pdftotext | wc -w` goes from 1274 to 1074 (−16%, graph labels included). That is short of the review's −25%; the hero, the two provenances and the "methods omit choices" line added words back.
- **Dominant visual.** The No. 1 card is about 33% of the safe area, below the review's 40–55% target. With the hero and the strip it carries the 20-second read; the lower row is for the 2-minute reader.

## Not applied, and why

- **Title.** It stays "From Papers and Conversations…", a dossier option. "Conversations" against the "expert specification" wording is John's call (content review §4 #4). Moving MRSA into the drawer lowers the tension.
- **bacass is still mounted** as the one red specimen, as the design review asked, although it's an unpublished development fixture outside the evidence bank (content review §4 #8). It's labelled "Dev. fixture". If it's vetoed, 1a (same paper, direct route, also red on the PR #701 defect) can be mounted in its place from data that's already here.
- **QR codes are in the header, not the footer.** This frees about 2.5 in for No. 1 and puts the live-results code next to the hero, as review §3.6 allows. Unlike receipt-grounded v1, they sit in empty space beside the title rather than under it.
- **No crop marks.** The bleed PDF has the 0.125 in bleed only. Add marks if the shop wants them.
- **Not borrowed:** 30→18 (no room, and the Orbit posters next door will show it, §4 #21); the "Molting" name and the anatomy dissection (specimen-vision's concept); the ×N loop.
- **Hokken.** It still cites Fig. S4A and says only "fold changes agree". Who chose the pooled model is §4 #16.

## Data (`./data`, copied by `scripts/fetch-data.mjs`; `data/manifest.json` records source paths and SHAs)

| Specimen | Source | Notes |
| - | - | - |
| No. 1 DengueSeq (brief route) | `~/projects/foundry-runs/dengueseq-denv3/dengueseq-denv3-galaxy` @ `6737777` | held out; local, unpublished |
| 1a DengueSeq (direct route), drawer row | `~/projects/foundry-runs/dengueseq-denv3-direct/dengueseq-denv3-direct` @ `6e25e40` | local, unpublished |
| No. 2 bacass | `~/projects/foundry-runs/bacass-sr-assembly/bacass-sr-assembly-galaxy` @ `493b851` | dev fixture; local, unpublished |
| MRSA, drawer row | foundry `4e21bc4f^:…/uc1-mrsa-interview/` draft + `run-summary.md` (saved as `.md.txt` so the vault site skips it) | public git history |
| Recompile hashes | foundry `73af1f62^`/`73af1f62` (`discover-shed-tool` Mold `content_hash`); `9adc20b7^1`/`9adc20b7` (PR #701, `planemo-asserts-idioms` `src_hash`) | public |
| Provenance rows | `workflow-test-result.json` (Planemo 0.75.47, Galaxy `b18269a1`); plugin `f275059e` from the run logs | |
| BAQ probe numbers | `workflow-debug-report.md` "Open-requirements bearing" | measured after the ledger was written; entries still open |
| Corpus counts (420 / 56 / 27 / 69 / 13 / 31) | dossier §4, `origin/main` 2026-10-24 | typed into `poster.html`; re-check at print |
| 0/15, Hokken, "methods omit choices" | preprint, pp. 16–18, Fig. S4A | |

## Fonts

All are from Google Fonts (OFL), installed through @fontsource and embedded as CID TrueType:

- Fraunces 600/800 and its italics: display, the hero and the numerals;
- Source Serif 4 400/600 and italic: body;
- IBM Plex Sans Condensed 500/600: labels and graph nodes;
- IBM Plex Mono 400/500: versions and hashes.

## Colour

- Warm paper `#f6f2e7` with near-black ink and an ink-brown title.
- One dark red (`#8f2b1d`) for defects and the thesis emphasis, a muted green (`#2d5a44`) for passes, and ochre (`#8a6a0e`) for placeholders.
- No saturated area is larger than a badge, and the largest dark fills are the two small hash chips.
- Status never depends on colour alone:
  - passed is a filled disc with a check;
  - failed is a hatched square;
  - partial is a half disc;
  - no result yet is a dashed ring;
  - pins are solid for an open gap and outlined for a deliberate drop.

## `[[ASK]]` slots

1. **Drawer, "nf-core/rnaseq, atacseq".** Anton's Foundry-validated rebuilds with paper replications, atacseq partial. No numbers. Hidden by `--no-ask`.
2. **Header, `[[QR: live results]]`.** It always renders. To fill it, add the URL under `qr:` in `content/specimens.yml` as `live:`, then replace the `.ph` div with `<div class="code" data-qr="live"></div>`.

## Open questions

1. Title: keep "Conversations"?
2. bacass: OK to mount an unpublished dev fixture, or swap in 1a?
3. The run dirs (DengueSeq, 1a, bacass) are local and unpublished. Publish them before the QR codes point at the repo or the live page?
4. BAQ entries: close them in the ledger (the probe numbers are already shown), or keep "entry still open"?
5. Is the print file locked? If so, which v2 fixes can still go in?
6. Re-count the corpus figures at print.
