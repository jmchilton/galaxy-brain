# your-edge-here-transit: one core, three Foundries, your line next

This is pitch **`your-edge-here`** (`../PITCHES.md`, Pitch 4) drawn in the visual language of the
transit map in `../transit-vision-v2/`: lines and stations, interchanges, termini boards, a map key
that teaches, and Overpass signage type. CSHL Biological Data Science 2026, 44 in × 44 in, with a
1 in safe margin.

## The idea

**Hero (148 pt, white and amber on black):** *Models already know the textbook. Build a Foundry
for your field's edge.* This is the pitch's 12-word thesis, verbatim.

The map *is* the argument:

- **The shaded zone is the textbook.** It is the edge of one huge circle, so only a gentle arc
  shows, after Matt Might's "zoom" panel. Inside it, a frontier model already writes the skill
  well.
- **One trunk, four lines.** Every line rides the same core:
  - the pattern stations: Knowledge base → Mold → Cast → Check;
  - then the 9 shared foundry-lib stations.
- **Lines fan out and cross the boundary.** Each pushes a red **dent** (Might's "progress happens
  here") and ends at a black **terminus board** that names that field's *meaning of correct*:
  - Galaxy Workflow Foundry (*the first instance*): gxwf + Planemo;
  - Statistical Genomics Foundry: critique today, with calibration as the target;
  - TDA Bioinformatics Foundry: locked environments + replication evidence.
- **Failures are stations.** The Statistical Genomics line has a fault, "I seeded the Foundry
  wrong", with a dotted **transfer** to the TDA line ("Stepped back: new repository"). The S line
  continues to its terminus; it is not drawn as a closure.
- **The Biopixi ladder** branches up off the TDA line: a rail with rungs, L0 → L3. Its terminus,
  L4 Observed BioContainer, is an interchange with a grey **Galaxy tool requirements** line that
  runs off the map.
- **The fourth line is dashed and outlined, i.e. not built.** It rides the whole core, crosses
  the boundary through an empty dashed dent, and ends at **YOUR EDGE HERE**, the call to action.

**The one data visual is the stopping pattern** above the foundry-lib stations: a 3 × 12 dot
matrix of package × Foundry, from each repo's `package.json`.

- Each package name labels its station on the trunk, so the names appear once.
- The rows read **9/12, 9/12, 12/12**.
- The three columns only TDA calls at (`audit-base`, `audit-citations`, `source-note`) sit after a
  gap, on the stretch where only the TDA line is left. The other three lines have fanned out
  before them.
- This makes "share converged mechanics, keep domain meaning local" countable.

Other numbers are kept to the receipts: 17 conda recipes, and the citation audit's 104 resolved and
0 mismatched. They support the ideas; they don't lead. Replications carry their verdicts only, and
the Mold carries its own caveat ("a prediction, not measured DockQ"), so no success rate is
implied.

### Pitch sections and where they live

| Pitch section | On the poster |
| - | - |
| 1. Inside the circle vs. the edge | the shaded zone + dents, "THE TEXTBOOK" label (blind regeneration), key item 2 |
| 2. One small core, three big applications | trunk + fan-out + termini boards; "The pattern" / "foundry-lib" brackets |
| 3. Derive abstractions from a second application | LESSON notice, top left (beside the stopping pattern) |
| 4. I seeded the Foundry wrong | the fault station + notice on the S line; the transfer to T |
| 5. Hardening leaves receipts | the green-bordered receipts panel above the T line: verdicts, recipes, upstream, citation audit, guarded Mold |
| 6. Installing is a measurement | the Biopixi ladder + its heading; citation audit in the receipts |
| Call to action | the dashed line + YOUR EDGE HERE |

## Body word count

**345 body words**, against a cap of 400.

- The build counts them from the rendered DOM: every text node, including the SVG map labels,
  package names, ladder rungs, key, hero, kicker and the live-results caption.
- It excludes only `.nocount` elements: the title + subtitle, the author block, affiliations, the
  references + footnote, and the QR captions. The `[[QR: live results]]` placeholder text is also
  excluded.
- The words are written to `build/body-words.txt`.
- **The build fails above 400.**
- If you count the subtitle and the packages footnote as body, about 19 more words, the total is
  about 364, still under 400.
- For comparison, `pdftotext poster.pdf - | wc -w` (everything on the sheet) gives 459.

## Rebuild (one command)

```sh
./build.sh             # render from content.yml + data/foundry-lib.json
./build.sh --extract   # first re-read foundry-lib + the three Foundries' origin/main (read-only), then render
```

- `build.sh` keeps npm deps **outside the vault**, in `/private/tmp/claude-503/your-edge-here-transit-deps`
  (override with `POSTER_DEPS`). It installs them there on first run.
- It symlinks `node_modules` in only for the build and removes the link on exit, even when the
  build fails.
- It refuses to run if a real `node_modules/` is present.
- Deps: playwright 1.64.1 (Chromium 1248, already cached in `~/Library/Caches/ms-playwright`),
  `qrcode`, `js-yaml` and `@fontsource/overpass{,-mono}`.
- It needs `pdffonts`, `pdftotext` and `pdftoppm` (poppler) on PATH.
- `extract.mjs` runs `git show origin/main:…` in `~/projects/repositories/{foundry-lib,foundry,statistical-genomics-foundry,topological-data-analysis-bioinformatics-foundry}`.
  Run `git fetch` there first if you want fresh heads.

**Outputs:**

- `poster.pdf`: 3168 × 3168 pt (44 in), all vector, 0 raster images, fonts embedded;
- `poster-bleed.pdf`: 44.25 in, with the paper extended 0.125 in on every side and no crop marks;
- `preview.png`: 1500 px;
- `checks/preview-25.png`: 1056 px, the 25% distance check;
- `checks/preview-gray.png`;
- `checks/thumb-200.png`.

There is no `SHOW_ASK=0` render because this poster has no `[[ASK]]` slot (see below).

**The build fails** in any of these cases:

- any callout, key item, footer block, header, hero or the page itself overflows;
- two HTML callouts collide;
- any text is under 24 pt (SVG text is measured after scaling);
- any `.body` text is under 28 pt;
- the hero is under 100 pt;
- a `.heading` is under 72 pt;
- anything sits outside the 1 in margin;
- `pdffonts` lists a font that isn't Overpass, isn't embedded, or is Type 3, in either PDF;
- the body word count is over 400;
- a QR code is under 2.5 in of actual code;
- the foundry-lib matrix drifts from 12 packages / 9 shared / only TDA adding 3, because the copy
  and map assume that shape.

Labels between 24 and 28 pt are listed as warnings. Right now these are only the affiliation
superscripts and the W/S/T roundel letters.

### Where to edit

| What | File |
| - | - |
| All copy (hero, map labels, callouts, termini, key, QRs, refs) | `content.yml` |
| Map geometry: arc, trunk, fan-out, stations, ladder, callout anchors (`MAP`) | `map.mjs` |
| Styles and colour tokens | `poster.css` |
| Page assembly + build guards | `build.mjs` |
| Matrix data | `data/foundry-lib.json`, regenerated by `extract.mjs` |

## Fonts and colour

- **Fonts:** Overpass (400–800 + italics) and Overpass Mono (500–700), both SIL OFL via
  `@fontsource` and copied into `build/fonts/` at build time. There are no system fallbacks, and
  no Type 3 fonts.
- **Lines** (greyscale-checked; amber carries a dark edge):
  - T (TDA) green `#3D8B5A`;
  - S (Statistical Genomics) amber `#E9A419`;
  - W (Galaxy Workflow) navy `#1F3A6B`;
  - "your field" is an ink-dashed outline;
  - the Biopixi ladder is teal `#2B8794`, with rungs;
  - Galaxy tool requirements is grey `#8C9099`.
- **Zone (the textbook):** `#E6DFCB` on paper `#F6F3EA`.
- **Dents and faults:** `#A8322A`.
- **Placeholder:** ochre `#9C6B12`, dashed, no fill.
- Ask the shop to map `#17191F` (the hero band and termini boards) to a K-heavy rich black.
- **Assets:** none of John's slide SVGs are embedded. The rings and circle-sorting SVGs set Arial
  Narrow and Space Mono, which would break the Overpass-only PDF. Their content is redrawn in
  transit form: the termini boards carry the rings' "meaning of correct" labels, and the zone and
  dents redraw the circle.

## Sources for every fact

The decks are in `~/projects/repositories/jmchiltondotnet/src/content/slides/` at origin/main
`ac69980`.

- `FP` = `foundry-pattern.mdx`. The line numbers below are the ones I read; the pitch's
  numbers are a few lines off.
- `QA` = `foundry-qa.mdx`.
- `ASSETS` = `public/slides/foundry-pattern/`.

| Claim on the poster | Source |
| - | - |
| Inside the circle, a frontier model writes the skill well | `FP:332-337` (the dossier bars "AI-generated", so it is reworded) |
| Delete one; a blind model writes it back from memory, caveats included | `FP:493` (experiment), `FP:517` ("It wrote the skill back"), `FP:562` (more validity caveats than the original) |
| Dent = progress; circle/zoom framing | `FP:310-373` (Might, CC BY-NC 2.5, credited as ref [1]) |
| Pattern = knowledge base · Mold · Cast · check | `ASSETS/foundry-concentric-responsibilities.svg` ("THE PATTERN") |
| "Share converged mechanics. Keep domain meaning local." | `FP:720` |
| foundry-lib = 12 packages; usage 9/12, 9/12, 12/12; only TDA uses `audit-base`, `audit-citations`, `source-note` | `data/foundry-lib.json` (method + heads in `_source`): foundry-lib `7ec6a85`, foundry `eb2de3f1` (2026-10-30), statistical-genomics-foundry `908a8c2`, TDA `e7fc4fa`. The same 9 are shared by all three. |
| Derive abstractions from a second application; fresh agent context breaks that rule | `FP:1138`, `FP:1163` |
| foundry-lib extracted early + one-prompt bootstrap: "Both moved abstraction ahead of evidence." | `FP:1358-1371` |
| "I seeded the Foundry wrong."; four jobs at once, textbook knowledge among them; "A better skill mill is still a skill mill." | `FP:1211`, `FP:1232-1236`, `FP:1288` |
| Stepped back: new repository | `FP:1312-1314` |
| Termini: gxwf + Planemo (validate, then run); critique today, calibration the target; locked environments + replication evidence | `ASSETS/foundry-rings-{galaxy-workflow,statistical-genomics,tda-bioinformatics}.svg`, "MEANING OF CORRECT" |
| "the first instance" (Galaxy Workflow Foundry) | `PITCHES.md` Pitch 4, "Deliberately left out" |
| TopoQA reproduced, with caveats · TopoMetry partially reproduced · HiPoNet inconclusive | `FP:1498-1500` (TopoQA: pooled correlations; part of the margin depends on a defect); the pitch's "reproduced (with caveats)". Verdicts only; HiPoNet's percentages are left off. |
| A paper becomes a guarded Mold: "a prediction, not measured DockQ" | `FP:1515-1525`; TDA `content/molds/score-docking-poses/index.md` |
| 17 conda recipes | `FP:1465`; 17 `.md` files in TDA `content/recipes/` at origin/main |
| Upstream PRs and issues | `FP:1450-1458`. Checked with `gh` on 2026-10-30: petls-pytorch#1 MERGED, TopoQA#1 OPEN, PETLS#2 OPEN, conda-forge/staged-recipes#34367 ("Add tadasets 0.2.2"; tadasets is one of the 17 TDA recipes) MERGED. The deck still says #34367 is "submitted"; the poster cites it in ref [3] as merged. |
| Citation audit: 104 resolved, 0 mismatched; checked on every build | TDA `audit/citation-audit.md` at origin/main (104 resolved, 0 resolved-mismatched, 98/104 verified against a described work); `FP:1889` ("checking on every build"). The deck's 78/78 is stale and not used. |
| Installing is a measurement; L1–L3 decidable from the lockfile, L4 needs observation | `QA:897`, `QA:880` |
| Ladder rungs L0–L4 | `ASSETS/biopixi-ladder-infographic.svg` |
| BioContainer → Galaxy tool requirements | `QA:918-925` |
| "A pattern, not a turnkey solution." | `FP:1577` |
| QR targets (`curl -sIL`, all 200 on 2026-10-30) | `galaxyproject.github.io/foundry-pattern/`, `jmchilton.net/slides/foundry-pattern/`, `jmchilton.github.io/foundry-lib/` |

**Not on the poster, by design:**

- Orbit, Hokken and 0/15 (the pitch leaves them out);
- DengueSeq, gap ledgers and the recompile loop;
- Galaxy workflow internals;
- fabricated-reference base rates;
- the HiPoNet percentages;
- the deck's "12 verified" recipes figure (only the 17 recipe files were re-counted).

## `[[ASK]]` and placeholder slots

- **No `[[ASK]]` slot.** The pitch deliberately leaves out Galaxy-workflow internals, so Anton's
  foundry-paper work (nf-core/rnaseq and nf-core/atacseq) has no place on this poster.
  - It is left out entirely: no slot, no `SHOW_ASK` flag, no hole.
  - The Galaxy Workflow Foundry appears only as one line, "the first instance".
  - A `SHOW_ASK=0` render is not applicable.
- **`[[QR: live results]]`**: top right, a 4.15 in dashed ochre box, always rendered. When the URL
  exists, replace the `live-ph` div in `build.mjs` with `await qr(url)`.

## Open questions

1. **Title vs. hero overlap.** The title is the pitch's working title, *A Foundry for Your Field's
   Edge: Agents, Knowledge, and Checks Beyond Galaxy*. It repeats the hero's second line. Keep
   both, or retitle, e.g. *One Pattern, Three Foundries*?
2. **"Galaxy" in the subtitle.** Is "Beyond Galaxy" right for a poster whose authors are mostly
   Galaxy people, or would "Beyond Workflows" land better?
3. **Live-results URL?**
4. **staged-recipes#34367 is merged** (ref [3]). Promote "first recipe merged to conda-forge" into
   the receipts? It costs about 6 words.
5. **The "Stopping pattern" label.** Will a CSHL audience get the transit term, or should it say
   "Which shared packages each Foundry uses"?
6. **Dents.** Does a red bump per line read as Might's "progress happens here", or should only the
   empty dashed one (YOUR EDGE HERE) be red?
7. **Bleed.** Send `poster-bleed.pdf`, or does the shop print edge to edge on the 44 in trim?
