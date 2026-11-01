# specimen-grounded

Design #5: concept C (field guide / specimen plate), Grounded stance. 44 × 44 in, 1 in safe margin.

**Idea.** The poster is a natural-history plate. Each workflow is a mounted specimen: its real Galaxy graph (laid out from the `.gxwf.yml` file), a label giving origin, route and collection date, the marks it earned from the tools (Tool Shed pin, gxwf, Planemo), and its **known defects**, pinned onto the drawing and listed from the run's open-requirements ledger. Partial and failed specimens are mounted as they are. An "Empty mounts" drawer holds what isn't collected yet (EGAPx, sarek, CWL), the published Hokken result, and Anton's `[[ASK]]` slots. The hero line is *The agent drafts. The tools decide. Defects go on the label.*

## Build

```sh
npm ci                # once; installs Playwright 1.59.1 (uses cached Chromium 1217), dagre, js-yaml, qrcode, fonts
npm run build         # build/model.js -> poster.pdf (44x44 in, 1 page) + preview.png (1500 px)
npm run check         # same, plus build/preview-grey.png, build/preview-25.png (true 25%), build/preview-safe.png
npm run fetch-data    # optional: re-copy ./data from the run dirs and foundry git (see Data)
node scripts/crop.mjs "$PWD" out.png X Y W H [scale]   # inspect a region (inches) at higher resolution
```

**Browser.** Playwright 1.59.1 needs Chromium revision 1217. On John's machine it's already cached (`~/Library/Caches/ms-playwright/chromium_headless_shell-1217`). Elsewhere, run `npx playwright install chromium` once.

**poppler.** `pdfinfo`, `pdffonts` and `pdftoppm` are optional. The build uses `pdfinfo` to assert that the PDF is a single page, and skips that check when poppler is missing.

The build prints a JSON report. It lists the scale factor of each graph and any card whose content overflows its box. **An overflow warning means text is clipped, so fix it before printing.**

Open `poster.html?safe` in a browser to see the 1 in margin, or `poster.html?grey` to check it in greyscale. Run `npm run build` first so that `build/model.js` exists.

## Editing text

| What | Where |
| - | - |
| Title, hero, key, life cycle, drawer, footer, origin/route lines | `poster.html` (plain HTML; `→` is fine, it's swapped for an SVG arrow at render time) |
| Defect wording for ledger entries, how many to show, extra non-ledger defects | `content/specimens.yml` |
| QR targets | `content/specimens.yml` → `qr:` |
| Colours, sizes, grid | `styles.css` (`:root` tokens; `.poster` grid rows) |

**What comes from data, not hand-typed:**

- graphs: nodes, edges, step numbers, tool names, versions and changesets;
- the "Tool Shed n of m pinned" mark;
- the gxwf mark (status, tool state, connections);
- the Planemo mark (except No. 2 and No. 4, see below);
- ledger counts;
- which node carries each defect pin (the ledger `step:` field);
- the two recompile hash pairs;
- the 30 reference-collection thumbnails;
- the QR codes.

`scripts/prepare.mjs` **fails the build** in two cases: an open ledger entry has no gloss, or a gloss names an id that is missing or resolved. That stops the labels from drifting away from the ledgers.

There are two hand-summarised marks, both in `render.js` → `main()`:

- No. 4's Planemo mark, from the `status_note` and `attempts` in `workflow-test-result.json`;
- No. 2's three marks, from `run-summary.md`.

## Data (`./data`, copied by `scripts/fetch-data.mjs`; `data/manifest.json` records source paths and SHAs)

| Specimen | Source | Notes |
| - | - | - |
| No. 1 DengueSeq (brief route) | `~/projects/foundry-runs/dengueseq-denv3/dengueseq-denv3-galaxy` @ `6737777` | held out; local, unpublished |
| 1a DengueSeq (direct route) | `~/projects/foundry-runs/dengueseq-denv3-direct/dengueseq-denv3-direct` @ `6e25e40` | local, unpublished; drawn as a silhouette |
| No. 2 MRSA (expert spec) | foundry `4e21bc4f^:casts/claude/skills/_emulated-runs/uc1-mrsa-interview/galaxy-workflow-draft.iter1.gxwf.yml` + `run-summary.md` | public git history; dev scenario |
| No. 3 bacass | `~/projects/foundry-runs/bacass-sr-assembly/bacass-sr-assembly-galaxy` @ `493b851` | dev fixture; local, unpublished |
| No. 4 nf-core/demo | `~/projects/foundry-runs/demo-qc-trim/demo-qc-trim-galaxy` @ `f54711f` | dev fixture; local, unpublished |
| Recompile hashes | foundry `73af1f62^`/`73af1f62` `discover-shed-tool/_provenance.json` (Mold `content_hash`); `9adc20b7^1`/`9adc20b7` (PR #701 merge) `run-workflow-test/_provenance.json` (`planemo-asserts-idioms` `src_hash`) | public |
| Reference collection | foundry `bc790960:verification/workflows/*/*.gxwf.yml` (30 files) | public; `origin/main` now has 31 |
| Corpus counts (420 / 56 / 27 / 69 / 13) | dossier §4, `origin/main` 2026-10-24 | typed into `poster.html`; re-check at print |
| 0/15, Hokken | preprint PDF: p. 18 (0 of 15), Fig. S4A p. 36 (Hokken) | |

## Fonts (all embedded as CID TrueType, no Type 3; check with `pdffonts poster.pdf`)

All from Google Fonts, installed locally through the @fontsource npm packages:

- Fraunces 600/800 and their italics: display;
- Source Serif 4 400/600 and italic: body;
- IBM Plex Sans Condensed 500/600: labels and graph nodes;
- IBM Plex Mono 400: versions and hashes.

## Sizes

`npm run build` prints `textUnder28pt`, an audit of every text run's effective size (graph text includes its scale factor). As of this build:

| Element | Size |
| - | - |
| Title | 124 pt |
| Card headings | 72 pt; the 1a sub-specimen heading is 54 pt (exception) |
| Body text (marks, defects, label values, key, life cycle, drawer, tray caption) | 28 pt |
| Captions and labels at 25–26 pt | small-caps `dt` labels, chain-arrow captions, legend, QR captions, "when" lines, `.foot` |
| Hashes and version strings | 24–25 pt mono |
| Defect pins, refs line | 22 pt |
| QR placeholder | 18 pt |
| Author superscripts | 0.6 em |

**Graph text is the main exception.** Graphs are drawn at 28 pt and scaled to fit, so node names come out at about:

| Graph | Scale | Node names | Version and changeset lines |
| - | - | - | - |
| No. 1 | 0.75 | 21 pt | about 16 pt |
| No. 3 | 0.75 | 21 pt | |
| No. 2 | 0.53 | about 14 pt | |
| No. 4 | 0.51 | about 14 pt | |

1a and the reference tray are text-free silhouettes.

## Colour

- Warm paper (`#f6f2e7`) with near-black ink.
- One red (`#8f2b1d`) for defects, one muted green (`#2d5a44`) for passes, and ochre (`#8a6a0e`) for `[[ASK]]` and QR placeholders.
- **No saturated areas larger than a small badge.**
- QR codes have a 4-module quiet zone, and all three decode from a 100 dpi raster of `poster.pdf` (checked with OpenCV).
- Status never depends on colour alone:
  - passed is a filled disc with a check;
  - failed is a hatched square with a cross;
  - partial is a half-filled disc;
  - not run is a dashed ring;
  - an open gap is a solid pin and a deliberate drop is an outlined pin.
- Checked in `build/preview-grey.png`.
- If the print shop prefers, set `--paper` and `--card` to white.

## Layout note

The plan asks for a *central* legend. The "Key to the plate" (wiki → Molds → skills → agent → tools) sits in the middle column of the lower two rows, flanked by specimens. The hero specimen spans the full width above it, because it is the one thing a 20-second visitor should see.

## `[[ASK]]` slots

1. **Drawer, "nf-core/rnaseq".** Anton's Foundry-validated rebuild with a paper replication (Patel 2025). No numbers.
2. **Drawer, "nf-core/atacseq".** Partial rebuild with a paper replication (Punga 2026). No numbers.
3. **Footer, `[[QR: live results]]`.** A placeholder box. Swap it for a `data-qr` div and add the URL under `qr:` in `content/specimens.yml`.

## Open questions

1. **Hokken figure number.** The dossier says Fig 6A (manuscript numbering). The posted preprint (v. Oct 28) has it as **Supplementary Fig. S4A, p. 36**, and the poster uses S4A. The 0/15 claim is on **p. 18**; "guidance, not enforcement" is p. 16.
2. **1a "not yet re-run".** This comes from R2 and is marked inferred. No post-#701 re-run directory exists locally. Confirm before print.
3. **bacass and nf-core/demo.** They aren't in the dossier's evidence bank; they come from the §7 run-dir list. Both are development fixtures and both are local, unpublished runs. Are they OK to show? Should the runs be published so the live-results page can link them?
4. **No. 2 MRSA.** The dossier says the expert-spec workflows "pass gxwf". The run file is narrower, and the poster quotes it: the draft and the concrete subset validate, full validation was never reached, several phases were emulated, and Planemo never ran.
5. **Title word "Conversations".** The poster otherwise says "expert specification". Is that tension OK, or use a variant title?
6. **EGAPx.** The poster says gxwf passed `steps: {}`, but not that a fix exists (it is on a local branch only).
7. **Counts.** Corpus counts and "30 pattern workflows" are as of 2026-10-24. Re-check at print; `main` already has 31 verification workflows.
8. **node_modules in the vault.** `node_modules/` is about 28 MB and contains 72 `.md` files (no `index.md`). Obsidian indexes them, and they match the site's `PROJECT_FILES_PATTERN` (`projects/**/*.md`), so a site build would render them as project sub-files. `.gitignore` covers the directory. Delete it after the final export and reinstall with `npm ci` when needed.
