# transit-grounded: CSHL BioData 2026 poster (concept A, Grounded)

A 44 × 44 in transit map. The four source types are lines: Methods text (M), Expert specification
(E), Nextflow (N) and CWL (C). They merge into one trunk of Mold stations, cross three interchanges
(the deterministic tools: Tool Shed, gxwf and Planemo) and end at a "Galaxy workflow" terminal.

- **Solid track:** a public demo has cleared that stage.
- **Dashed track:** no public demo has cleared it yet.
- **Hollow track:** planned (CWL).

Numbered service notices say where each line's journeys stop. The bottom row has three panels: the
DengueSeq journey record (its real workflow as a line diagram, the validator stamps and the real
open-requirements ledger), the map key (which teaches the system) and the depot (corpus counts and
the recompile loop).

## Rebuild

```sh
npm install        # once; playwright-core is pinned to 1.57.0 to use the cached chromium-1200
npx playwright-core install chromium   # only on a machine without that browser cached
npm run build      # content.yml + data -> poster.html -> poster.pdf -> preview.png + checks/*.png
```

You need `pdftoppm` (poppler) on your `PATH` for the PNGs. To change any text, edit `content.yml`
and rebuild. Layout lives in `style.css`. Map geometry (station x positions, line y positions,
solid/dashed extents) is the `MAP`, `T`, `SRC_Y`, `X` and `SOLID_TO` constants in `build.mjs`.

| Output | Description |
| - | - |
| `poster.pdf` | 3168 × 3168 pt (44 in), one page, all fonts embedded |
| `preview.png` | 1500 px |
| `checks/preview-25pct.png` | 1056 px, about a 25%-scale print, for the read-from-distance check |
| `checks/preview-gray.png` | greyscale check |

The build stops with an error if the DengueSeq ledger no longer has 19 entries, 5 open and 2
dropped, or if the run's gxwf or Planemo status changes. That keeps the printed text honest. If it
fails, update `journey.expect` in `content.yml` along with the text.

The build also prints an `OVERFLOW:` list. The `hero` and `src below` entries are glyph overhang
only and are harmless. Any `panel`, `notice` or `why` entry means text is clipped.

## Fonts

All fonts are SIL OFL, copied into `fonts/` from `@fontsource`:

- **Overpass** (400, 600, 700, 800, 900, and 400, 600, 800, 900 italic). It is derived from the US Highway Gothic
  signage face, which fits the transit theme.
- **Overpass Mono** (400, 600, 700).

A few glyphs (`●`, `→`, `−`) fall back to system Helvetica or Menlo, which are embedded in the PDF.
On a non-macOS build machine, check `pdffonts poster.pdf`.

Text sizes at full scale:

| Element | Size |
| - | - |
| Title | 176 px (132 pt) |
| Hero line | 122 px (92 pt) |
| Panel headings | 96 px (72 pt) |
| Body | 38 px or more (28.5 pt or more) |

Two exceptions are deliberate:

- Ledger tags are 34 px (25.5 pt). They are badges, not body text.
- "Why the interchanges decide" and "Works: …" are 40 px eyebrow labels, styled like "Journey
  record", not section headings.

## Colours

The line colours sit at different greyscale lightnesses. Every line also carries a lettered roundel,
so the lines stay distinct in greyscale (see `checks/preview-gray.png`). Saturated colour appears
only on thin strokes and small roundels.

| Line | Colour | L* |
| - | - | - |
| M (Methods text) | vermilion `#d2462e` | about 50 |
| E (Expert specification) | amber `#e3a21a` | about 72 |
| N (Nextflow) | navy `#17325e` | about 21 |
| C (CWL) | teal `#2f8f8c`, drawn hollow | |

The page uses warm paper `#f5f1e6`. The header band is near-black. Service notices use pale yellow
`#ffe68a`. `[[ASK]]` slots are hot pink `#ff4fa3` so they can't be missed. That pink must be gone
before print.

## Data sources

- **DengueSeq run:** `~/projects/foundry-runs/dengueseq-denv3/dengueseq-denv3-galaxy/`.
  - The build reads `open-requirements.ledger.yml` (the `entries:` block), `galaxy-workflow.gxwf.yml`
    (steps, Tool Shed repos and changesets), `galaxy-workflow-validation-result.json` and
    `workflow-test-result.json`.
  - It snapshots them to `data/dengueseq-run.json`, and builds from that snapshot when the run
    directory is absent. Override the path with `DENGUE_RUN=...`.
- **Corpus counts:** `DESIGN_DOSSIER.md` §4, as of `origin/main` on 2026-10-24.
  - I spot-checked them at `9f83fd55` (2026-10-28): 13 pipelines, 56 Molds and 69 skill
    directories, unchanged.
  - I didn't re-count everything. Re-check all the counts at print.
- **Recompile hash:** `git show 73af1f62` in `galaxyproject/foundry`, on
  `casts/claude/skills/discover-shed-tool/_provenance.json`. `content_hash` went from
  `256e3861…` to `2e5fa1f8…`.
- **Other material:** PR #701, the upstream PRs, CI (30 pattern workflows) and "0 of 15" (Baker et
  al. 2026, pp. 16, 18) all come from the dossier evidence bank. The DengueSeq citation is from the
  run's `source-selection.md`. The Karpathy gist URL is from `research/r1-foundry-system.md` §7.

## `[[ASK]]` and placeholder slots

1. **Notice 4, `[[ASK]] nf-core/rnaseq + atacseq`.** It is on the Nextflow line, and the map points
   to it with the pin labelled "2–4". It contains no numbers. If John signs off, the N track past
   the Draft loop could turn solid, and the card could gain the replication note.
2. **`[[QR: live results]]`.** This is the first QR cell in the footer. The URL is still to be
   decided. Set `url:` on the first `qr:` entry in `content.yml`.

## What's on the poster and what's left off (Grounded stance)

**On the poster:**

- all four lines, with CWL hollow and labelled "planned";
- EGAPx shown as partial, including the validator blind spot;
- sarek shown as in progress;
- the expert specs, with "Planemo never ran";
- DengueSeq's 5 open ledger items (2 of them deliberate drops), plus its not-yet items: the second
  test case wasn't run, and the paper's results haven't been replicated;
- Hokken, cited as already published.

**Left off:**

- bacass and demo-qc-trim run numbers. They aren't in the evidence bank and are unpublished.
- r2's "byte-identical consensus" claim. It isn't in the dossier, and the dossier says there is no
  replication yet.
- Any count of journeys or lines, to avoid implying an "N of M" rate.

## Open questions

1. The title uses "Conversations", but every label says "expert specification", per the dossier.
   OK?
2. Is the "Workflow brief + expert review" station fine as an optional stop on M, E and N? Only
   DengueSeq actually used it.
3. Interchange states are shown as `pass | fail`. The real closed sets also include `not-run`
   (gxwf) and `test-definition-missing` (Planemo). Show them in full?
4. Should the yellow notices and the pink `[[ASK]]` survive to a test print, or should `[[ASK]]` be
   dropped?
