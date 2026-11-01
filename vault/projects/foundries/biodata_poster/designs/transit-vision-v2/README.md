# transit-vision-v2: Galaxy Workflow Foundry network map (second draft)

Concept **A. Transit map**, stance **Visionary**. CSHL Biological Data Science 2026, 44 in × 44 in,
1 in safe margin. This is the redesign of `../transit-vision/`, which is untouched. It applies the
transit-vision sections of `../REVIEW_DESIGN.md` and `../REVIEW_CONTENT.md`, plus the corrected
`DESIGN_DOSSIER.md`.

## The idea

The poster is a transit network map. Three source lines, Methods text (M), Expert specification (E)
and Nextflow (N), merge into one shared track and end at a single black **Galaxy workflow**
terminal. Everything else hangs off the map:

- the DengueSeq **journey ticket**, joined to the pale journey band;
- the **×7 draft loop** between the Tool Shed and gxwf;
- **0/15**, hung from the gxwf and Planemo interchanges;
- the **depot** (recompiles), on the maintenance track;
- the **service notices** (the open-requirements ledger), hung from the terminal.

A one-row **map key** teaches the theory: lines, stations, interchanges, notices, depot, terminal.

- **Hero (≥ 100 pt):** *Writing a correct workflow is a knowledge problem, not a syntax problem.*
  Set at 110 pt, white on black.
- **Three-beat sub:** *The model translates. The tools decide. The gaps are written down.*
- **Route ≠ journey:** a line only means the route exists. Exactly one journey is drawn, so the
  poster implies no success rate.

## Changes from v1

**Layout**

- Prose moved out of 17 absolutely positioned HTML boxes into `content.yml`.
- Non-map regions (header, hero, key, footer) are now grid/flex flow. Absolute positions are left
  only for map-anchored callouts, at the anchors in `map.mjs` `MAP`.
- Hero raised from 86 pt to 110 pt. Sub raised from 52 pt to 56 pt. Title raised from 124 pt to
  126 pt, with looser leading.
- The header line legend is gone (it duplicated the key). Its slot now holds the
  **live-results QR**: a 4.15 in slot, the largest code, beside the hero.
- The map is freed and enlarged:
  - it runs edge to edge across the 42 in live area at about 20.6 in tall;
  - lines are about 1.5× thicker;
  - trunk spacing and capsules are widened to match;
  - the terminal is wider, so "Galaxy workflow" no longer touches its edges.
- JOURNEY, EARLIER ON THIS LINE and ARRIVED are merged into one **journey ticket**, tinted like the
  journey band. A band spur runs into it and a perforation separates the "Arrived" stub.
- The six 72 pt key cards are replaced by a **one-row map key** at about 40% of v1's height (the
  specimen-vision strip form). Corpus counts are folded into it as bold numerals.
- Only two black areas remain: the hero band and the terminal. The depot, service notices, 0/15
  callout and install box are outlined white panels, with hazard-stripe headers on the depot and
  notices.
- **0/15** is hung under the gxwf/Planemo interchanges with leader lines. It is kept out of the
  Foundry numeral row, so it can't be read as a Foundry score.
- The Planemo maintenance track and its fault marker were cut to make room for the 0/15 callout.
  PR #701 is still labelled PLANEMO in the depot.
- References are bracketed `[1]`–`[4]`, so they no longer collide with the superscript affiliation
  numbers.
- The `→ ≠ ×` glyphs and the ledger marks are now inline SVG (`glyphs.mjs`), and the ×7 is drawn.
  `pdffonts` lists only Overpass and Overpass Mono.
- QR codes:
  - 3.75 in boxes, black on white, with a 4-module quiet zone inside;
  - so 2.94–3.02 in of actual code (the build logs the module count and fails under 2.5 in);
  - captions at 30 pt;
  - the live-results slot is 4.15 in and always renders.
- `[[ASK]]` and placeholder style: dashed ochre outline, no fill (the hatched fill is gone).
  `SHOW_ASK=0` hides the ASK slot; it floats on open map, so no hole is left.
- Bleed and edges: `poster-bleed.pdf` is 44.25 in, with paper extended 0.125 in on every side.
  No rules or frames sit near the trim.
- Body words cut by about 23% (`pdftotext | wc -w`: v1 941, v2 723 with ASK, 711 without).

**Content (review must-fix and should-fix items)**

- The provenance "ticket" `cdf8be42…→72f5f7cc…` (source → compiled sidecar) was misreadable as
  before → after. It was removed. The only hash pair left is the recompile, labelled
  `hash 256e3861 → 2e5fa1f8` in the depot.
- The install block is labelled per tool: "Claude Code: /plugin marketplace add …" and
  "Codex: codex plugin marketplace add …" (foundry `README.md`). Antigravity points to the Install
  QR.
- "Never deleted" was dropped from the ledger wording.
- The 13-pipelines gloss no longer implies 13 routes to Galaxy. The footnote says "the 13 include
  CWL and review routes".
- "Why the network needs knowledge" is now **"Why methods text isn't enough"**.
- "Expert description" is now **"Expert specification"** (dossier §4). "hero line" was dropped.
- Hokken is "a roughly 60-step …" (dossier), still cited as Fig. S4A.
- The expert reviewer is disclosed as "(one of us)". `review.md` names John Chilton as the
  reviewer, a poster author.
- The `[[ASK]]` slot says "Foundry-validated rebuilds; atacseq partial" (not "with paper
  replications").
- Not flagged for this poster, but the same defect as the others: the "BAQ-off …: check pending"
  notices are now "awaiting expert". `workflow-debug-report.md` l.51–52 records a measurement on
  SRR25366733, while the ledger entries stay open. No probe numbers were imported.
- 0/15 keeps "Companion Orbit study (open-weight models)" in the callout itself. "Skills are
  guidance, not enforcement" moved into the Interchanges key entry.
- New drift guard: every open DengueSeq ledger entry needs a gloss in `content.yml`, or the build
  fails.

## Review items deliberately not applied

- **iVar/BAQ example** (borrow from receipt-vision). It was tried as a line under the service
  notices and overflowed the panel; the 30→18 box has no spare line either. The BAQ notices carry the gap
  itself.
- **`source ≠ copy` provenance snippet** (borrow from specimen-vision). It made the key strip
  6+ in tall, so it was dropped rather than shrunk; no hash pair is ambiguous now.
- **Hashes at 8 characters "consistently".** Foundry content hashes are 8 characters. **Tool Shed
  changesets stay at 12**, their canonical short form, so they can be pasted into the Tool Shed.
- **Crop marks** in the bleed PDF. The bleed version has none; the shop adds marks, or confirm
  edge-to-edge printing on the 44 in trim.
- **Title.** Still dossier option 1, *From Papers and Conversations to Runnable Galaxy Workflows*.
  This is sign-off item #4; see the open questions.
- **Rich black.** It can't be set from Chromium's RGB output. Ask the shop to map `#17191F` in the
  hero band and terminal to a K-heavy rich black.
- **Venue line.** It was added to the kicker, then cut for word count.

## Included, and left out (Visionary stance)

- **Included:**
  - DengueSeq, held out. The timetable comes from `foundry-run.yml`, and the 7 pins from
    `galaxy-workflow.gxwf.yml`. gxwf and Planemo PASS. The 5 open ledger items appear as notices.
  - Recompiles: `73af1f62` (`256e3861 → 2e5fa1f8`) and PR #701 (8 skills).
  - IUC #8808 and gxwf 1.15.0, as a reference line.
  - 0/15, 30→18 and Hokken (Fig. S4A), all attributed to the companion Orbit preprint.
  - Corpus counts as of 2026-10-24.
- **Left out:** sarek, EGAPx, CWL, the validator blind spot, MRSA/ATAC as journeys, demo-qc-trim,
  bacass, the DengueSeq direct arm, and the probe numbers.

## `[[ASK]]` and placeholder slots

1. **`[[ASK]]` Nextflow-line journeys**: nf-core/rnaseq and nf-core/atacseq (A. Nekrutenko). This is
   the dashed ochre box beside the N line. It is set in `content.yml` `ask`. Hide it with
   `SHOW_ASK=0` (`npm run render:noask`).
2. **`[[QR: live results]]`**: top right, 4.15 in, always rendered. When the URL exists, swap the
   `live-ph` placeholder div in `build.mjs` for `await qr(url)`; at 4.15 in a version-3/4 code is
   about 3.3 in.

## Build

```sh
npm install                    # once (or after a fresh clone): playwright 1.64.1, qrcode, js-yaml, @fontsource
npx playwright install chromium   # only if chromium-1248 isn't cached
npm run render                 # content.yml + data/*.json -> PDFs, previews, checks (with and without ASK)
npm run build                  # re-extract data/*.json from ~/projects/foundry-runs + foundry, then render
npm run render:noask           # print version: poster.pdf with every [[ASK]] slot hidden
```

**Delete `node_modules/` after export** (`rm -r node_modules`), or install it outside the vault and
symlink it in only while building. The vault site and Obsidian glob `projects/**/*.md` and follow
symlinks, so the deps' `.md` files must not stay here.

**Outputs:**

- `poster.pdf`: 3168 × 3168 pt, vector, 0 raster images, Overpass fonts embedded;
- `poster-bleed.pdf`: 44.25 in, with 0.125 in paper bleed;
- `preview.png`: 1500 px;
- `checks/preview-25.png`: 1056 px, the common 25% distance check;
- `checks/preview-25-noask.png`: the ASK-hidden 25% check (its PDF is not kept; use
  `npm run render:noask` for a print file);
- `checks/preview-gray.png`;
- `checks/thumb-200.png`.

**The build fails** in any of these cases:

- a callout, key item or footer block overflows;
- any text is under 24 pt (SVG text is measured after scaling);
- a `.heading` is under 72 pt;
- anything sits outside the 1 in margin;
- `pdffonts` shows a non-Overpass font;
- the DengueSeq ledger's open entries drift from the glosses.

Labels between 24 and 28 pt are listed as warnings.

### Where to edit

| What | File |
| - | - |
| All copy (title, hero, map labels, ticket, callouts, notices, key, footer, refs) | `content.yml` |
| Map geometry, station x positions, callout anchors (`MAP`) | `map.mjs` |
| Styles and colour tokens | `poster.css` |
| Arrived-workflow strip | `wfgraph.mjs` (from `data/dengueseq.json`) |
| Glyphs (→ ≠ ×, open/dropped marks) | `glyphs.mjs` |
| Real data | `data/*.json`, regenerated by `extract.mjs` |

## Data sources

The same as v1, all read-only and recorded in each JSON's `_source`:

- **`data/dengueseq.json`**, from `~/projects/foundry-runs/dengueseq-denv3/`:
  - the workflow, validation and test results;
  - the ledger (19 entries, 5 open with 2 dropped, 14 resolved);
  - both `foundry-run.yml` files.

  Review facts come from `review.md`. The BAQ wording was checked against
  `workflow-debug-report.md`.
- **`data/provenance.json`**, from `galaxyproject/foundry` `origin/main` and commit `73af1f62`.
- **Preprint** (Baker et al. 2026):
  - p.2 and Fig 1 (30 → 18; 29 of 30);
  - p.16 (guidance, not enforcement);
  - p.18 (0/15, open-weight models);
  - p.19 and Fig. S4A (Hokken).
- **Install commands:** foundry `README.md` on `origin/main`.

## Fonts and colour

- **Fonts:** Overpass (400–800, plus italics) and Overpass Mono (500–700), both SIL OFL via
  `@fontsource` and copied into `build/fonts/`. There are no system-font fallbacks.
- **Lines:** navy `#1F3A6B` (M), amber `#E9A419` with a dark edge (E), green `#3D8B5A` (N). In
  greyscale they read as dark, light and mid.
- **Paper:** `#F6F3EA`.
- **Placeholders:** ochre `#9C6B12`, dashed, no fill.
- **Fault:** `#A8322A`.

## Open questions

1. Title: keep "Conversations" (the submitted family), or use *From Papers and Expert
   Specifications to Runnable Galaxy Workflows*? No result on the poster is a conversation.
2. `[[ASK]]` Nextflow journeys: fill them, or print with `SHOW_ASK=0`?
3. What is the live-results URL?
4. Keep the Hokken "earlier on this line" note and 30→18, given the Orbit posters next door?
5. Re-count corpus figures at print? `origin/main` has moved since 2026-10-24.
6. Publish the DengueSeq run dirs before the QR codes point at the repo?
7. Bleed: send `poster-bleed.pdf`, or does the shop print edge to edge on the 44 in trim?
8. Ref [4] cites IUC #8808 (featureCounts). If Anton's ASK-gated rnaseq work forced it, the
   `SHOW_ASK=0` print still surfaces that work (content review 18a). Keep or drop it?
