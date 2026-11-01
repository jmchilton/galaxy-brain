# specimen-vision-v2: Field guide / specimen plate (Visionary), second draft

The poster is a natural-history plate, *Plate I: A field guide to the Galaxy Workflow Foundry*.

- **Hero (2 lines, 132 pt upright bold EB Garamond):** "A correct workflow is a *knowledge problem*, / not a syntax problem." The emphasis is oxblood plus an underline, so it survives greyscale.
- **Key to the plate:** the system legend, routes → wiki → Molds → skills → tools decide → recompile.
- **Fig. 1, Anatomy of a skill:** `discover-shed-tool` drawn as a bow-tie dissection. Its 5 declared wiki notes, each with a source → copy hash (≠ for a compiled sidecar, = for a verbatim copy), lead into the Mold, which casts into `SKILL.md`, `_provenance.json` and `_verify.json`.
- **Fig. 2, Specimen I (holotype, the dominant visual):** the DengueSeq workflow graph at 1.2× (node text ≥ 29 pt). Ledger gaps D2 and D3 are pinned on the nodes that the ledger's `step:` names. Below the graph are the gxwf and Planemo stamps, the Orbit 0/15 aside, and the label (origin, route, execution provenance, known gaps).
- **Fig. 3, Molting:** the recompile as a large hash flip `256e3861 → 2e5fa1f8`, with a timeline out to `05c99cba`, rev 5 on main today. foundry#701 is shown as "1 note → 8 skills".
- **Specimens II and III:** Hokken (described elsewhere) and an `[[ASK]]` slot.
- **Board here:** install commands plus QR codes, with the live-results slot largest at bottom right.

## Rebuild

```sh
# deps live outside the vault; link them in for the build, remove the link after
mkdir -p /private/tmp/claude-503/specimen-vision-v2-deps
cp package.json package-lock.json /private/tmp/claude-503/specimen-vision-v2-deps/
(cd /private/tmp/claude-503/specimen-vision-v2-deps && npm ci)
ln -s /private/tmp/claude-503/specimen-vision-v2-deps/node_modules node_modules
npm run build          # data/ + poster.html + poster.css -> build/poster.html -> poster.pdf, poster-bleed.pdf, preview.png, checks/
SHOW_ASK=0 npm run build   # same, with every [[ASK]] slot removed; the row reflows, no hole
rm node_modules        # keep node_modules out of the vault
```

- Pinned to playwright-core 1.64.x, which uses chromium-1248. On another machine, run `npx playwright-core install chromium` once. `pdftoppm` (poppler) is required.
- `npm run snapshot` re-copies `data/` from `~/projects/repositories/foundry` (default `main` @ `9f83fd55`, override with `FOUNDRY_SHA`) and `~/projects/foundry-runs`.
- **To edit text,** change `poster.html`. `<!--@NAME-->` slots are filled by `scripts/build.mjs`; the DengueSeq gap glosses are its `GLOSS` table. Sizes are set in `poster.css`, in pt and in.

### What the build checks

The build **exits non-zero** when:
- a child box overflows its container;
- any HTML text is below 24 pt;
- any SVG text renders below 24 pt after scaling;
- the DengueSeq graph is drawn below 1:1;
- a QR code (excluding its quiet zone) is under 2.5 in;
- an open ledger entry has no gloss, or a gloss names an entry that isn't open.

Text at 24–28 pt (labels, references, footnote) is listed as a warning. The log line reports the graph scale, Fig. 2's share of the page, the QR code widths, the minimum SVG text size and the word count.

### Outputs

| File | What |
| - | - |
| `poster.pdf` | 44 × 44 in, vector, fonts embedded |
| `poster-bleed.pdf` | 44.25 in, with the paper extended 0.125 in on each side. There are no crop marks |
| `preview.png` | about 1500 px |
| `checks/preview-25.png` | 1056 px, the 25% distance check |
| `checks/preview-gray.png` | the greyscale check |
| `checks/preview-200.png` | 200 px thumbnail |

## Fonts (OFL, from Google Fonts via @fontsource, all embedded)

| Font | Used for |
| - | - |
| EB Garamond 400–800 | title, hero, figure titles, notes, captions |
| IBM Plex Sans | body, labels |
| IBM Plex Sans Condensed | file names, kind pills |
| IBM Plex Mono | hashes, commands |

- **No system-font fallbacks.** The CSS stacks end in generic families only, and arrows, ≠ and = marks, the recompile loop, check discs and gap pins are drawn as inline SVG.
- **`pdffonts` lists only these four families,** all CID TrueType, with no Type 3. Every bold or italic in use is loaded as a real face, so there is no synthetic style.

## Colour

- **Palette:** paper `#f4efe4` and ink `#221e19`, with oxblood `#8a2e1c`, herbarium green `#3d5c36` and ochre `#8f6214` for gaps and placeholders.
- **Saturated colour only on strokes, badges and small text.** The only large dark fill is the Mold box, about 5.1 × 5.9 in (RGB `#221e19`). Specify it to the shop as K-heavy black, or confirm it with them.
- **QR codes** are pure black on white, with a 4-module quiet zone.
- **Status survives greyscale:**
  - check disc = pass;
  - solid pin = open gap, outlined pin = cut at review;
  - ≠ and = carry the hash meaning;
  - the hero emphasis is underlined.

## Data sources (all rendered from files)

| Panel | Source |
| - | - |
| Fig. 2 graph, pins, stamps, execution line, gaps | `~/projects/foundry-runs/dengueseq-denv3/dengueseq-denv3-galaxy/` run `67377774` (2026-10-20): `galaxy-workflow.gxwf.yml`, `open-requirements.ledger.yml` (pins from each open entry's `step:`), `galaxy-workflow-validation-result.json`, `workflow-test-result.json` (planemo version and Galaxy HEAD), and job states reduced from `tool_test_output.json` |
| Fig. 1 | foundry `9f83fd55`: `content/molds/discover-shed-tool/index.md`, `casts/claude/skills/discover-shed-tool/{_provenance,_verify}.json`. Unchanged since `bc79096` |
| Fig. 3 | provenance before and after `73af1f62` (both rev 4); rev 5 / `05c99cba` from main; the skill list from the `9adc20b7` diff (foundry#701) |
| "31 wiki patterns" in the key | count of `verification/workflows/**/*.gxwf.yml` at `9f83fd55` (dossier §4: 31, CI green) |
| Key counts | dossier §4 corpus table, dated 2026-10-24, footnoted |
| 0/15, Fig. S4A, UseGalaxy.org | Baker et al. 2026, pp. 16–19 and p. 36 (ref [1] cites pp. 16–19) |
| Install commands | foundry `README.md` l.43 (Claude Code) and l.51 (Codex) |

## What it leaves out (Visionary stance)

- **Not on the poster:** sarek, EGAPx, CWL results, the validator blind spot, bacass, demo, the DengueSeq direct arm, cost and time, the parity and BAQ probe numbers, and the upstream PR list.
- **CWL** appears only by implication: "most" pipelines run to Galaxy.
- **No benchmark rate** is shown or implied.

## `[[ASK]]` slots

1. **Specimen III, Nextflow** (nf-core/rnaseq and nf-core/atacseq, A. Nekrutenko).
   - Worded "Foundry-validated rebuilds on pinned Tool Shed tools; atacseq partial. No numbers until sign-off."
   - Dashed ochre outline. `SHOW_ASK=0` removes it, and Specimen II widens to fill the row.
2. **`[[QR: live results]]`** is a 4.3 in dashed ochre slot at bottom right. It always renders; swap in a real QR once the URL exists (`qrs()` in `build.mjs`).

## Changes from v1

### Content (review must-fix and should-fix items)

- **0/15 moved out of the key's numeric row.** That station is now a check glyph, "tools judge", and its text says what judges and that 31 CI patterns are green.
  - 0/15 now sits as an aside beside the gxwf and Planemo stamps.
  - It is attributed at numeral scale, with "*Orbit study*" at 44 pt over "0 of 15", and its text reads "in this companion study [1], on open-weight models".
- **The two `discover-shed-tool` hashes are explained.**
  - Fig. 1 is captioned "as on main".
  - Fig. 3 carries a timeline: rev 4 `256e3861` → recast 17 Jun 2026 `2e5fa1f8` → rev 5 `05c99cba`, main today (Fig. 1).
- **The expert review is disclosed as "review by a poster author"** (John Chilton reviewed the brief).
- **Ledger slugs are replaced by plain-English glosses.**
  - The caption gives the true count: 5 of 19 entries open, 14 resolved.
  - The glosses are grouped as Unresolved (D1–D3) and Cut at review, on purpose (D4–D5).
  - The glosses use ledger facts only; there is no "not yet measured" wording.
  - The caption is the review's line: "Methods sections routinely omit result-changing choices, so gaps are expected."
- **The route gloss no longer implies 13 routes to Galaxy.** It now reads "Most run from a paper, a spec or Nextflow to Galaxy."
- **Hokken uses transit-vision's framing:** "the check surfaced a modelling choice the methods never stated", plus UseGalaxy.org and Fig. S4A.
- **Execution provenance is shown** (idea 8 made concrete): "planemo 0.75.47, disposable Galaxy b18269a1: Galaxy's own record of what ran."
- **The origin says "and its code"** and "results not yet replicated".
- **The CI count is 31**, per the dossier and main; v1 had 30 at `bc79096`.
- **References:**
  - they are bracketed [1]–[3], so they no longer collide with the affiliation superscripts;
  - the DengueSeq first authors and DOI are added;
  - the Karpathy gist URL is added.
- **Install commands are labelled per tool** (Claude Code, Codex). Antigravity points to the Install QR.
- **Hashes are truncated to 8 characters everywhere,** including the graph changesets (v1 used 12) and the footnote SHAs (v1 used 7).

### Design (cross-cutting fixes plus this poster's items)

- **Hero:** upright bold Garamond at 132 pt across the full width, on two lines, in the darkest ink on the page (v1: 104 pt italic). Body copy sits beside line 2.
- **One dominant visual:**
  - Fig. 2 runs at 1.2× (v1: 1:1), so node text is 34–37 pt (v1: 28–31 pt) and pin labels 29 pt. It takes 24% of the page, or 26% with `SHOW_ASK=0`.
  - Fig. 4 (the drawer) was cut to make room; see below.
- **Fig. 1** is now a drawn dissection with leader lines, not a 28 pt mono table. The 5 theory notes were cut to 4 short ones keyed to badges on the drawing.
- **Defect pins** (form borrowed from specimen-grounded): solid ochre for open, outlined for cut. They sit on the graph nodes the ledger names.
- **Lower left:** the 76 pt REPRINT-style hash flip is the anchor. The 8-name fan list became a "1 note → 8 skills" numeral with a drawn fan.
- **Frame:** the double rule moved from 0.55 / 0.7 in to 0.95 / 1.07 in; content starts at 1.3 in.
- **Bleed:** `poster-bleed.pdf` is added at 44.25 in, with the paper extended.
- **QR codes:**
  - grouped as **Board here** (transit-vision) with the install commands;
  - 3.8 in boxes, about 3.0 in of code, black on white;
  - live-results slot 4.3 in;
  - captions 28 pt.
- **Placeholders:** `[[ASK]]` and the QR slot use a dashed ochre outline with no fill (v1: oxblood). There is a `SHOW_ASK=0` flag.
- **Headings** are all ≥ 72 pt (figure titles 80 pt). Sub-panel names are caps labels, not small headings.
- **Build guards** are now hard failures (see above), plus the `checks/` images at 1056 px, in greyscale and at 200 px.
- **Word count** (`innerText` of the poster): v1 873, v2 814 with ASK shown and 791 hidden, a cut of 7–9%. The cut is smaller than 25% because v2 adds the requested glosses, execution provenance, methods-omission caption, Hokken framing and install commands. v1's long blocks are what was cut.

## Review items deliberately not applied

- **Fig. 4 reference-collection drawer (the review said keep): removed.**
  - With the bigger hero, 3 in QR codes and the 1.2× graph, it no longer fit without shrinking the dominant visual or making a card row at the bottom.
  - Its evidence survives as "CI runs 31 wiki patterns: green" in the key. `snapshot.sh` still pulls the files.
- **Title:** kept *From Papers to Runnable Galaxy Workflows*. Changing it is John's call (content review §4 #4). The dossier says to "keep the ecosystem words", so the four-source family or "Papers and Expert Specifications" are drop-in swaps in `poster.html`. At 140 pt the short title fits on one line.
- **30 → 18 motivation stat (transit-vision): not added.** The Orbit posters next door will show it, and it costs words.
- **Fraunces for the hero: not used.** Upright bold Garamond passes the 1056 px check, and it avoids a new font dependency.
- **Dominant visual at 40–55%:** not reached (24%). The specimen-plate concept is multi-figure, and Fig. 1 carries the Visionary theory. The graph is the largest single drawing and reads at 1056 px.

## Open questions

1. Title: keep the short one, or restore the ecosystem words?
2. Drop the Fig. 4 drawer for good, or bring it back at the expense of graph scale?
3. Live-results URL, so the 4.3 in slot can get its QR.
4. Specimen III `[[ASK]]`: fill it or drop it (`SHOW_ASK=0`)?
5. Should "review by a poster author" name J. Chilton?
6. The DengueSeq run is local and unpublished. Publish or archive it before the QR codes go live?
7. Re-count the corpus at print: the key counts are dated 2026-10-24.
