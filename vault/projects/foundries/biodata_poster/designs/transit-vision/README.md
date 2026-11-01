# transit-vision: Galaxy Workflow Foundry network map

Design agent #2. Concept **A. Transit map**, stance **Visionary**. CSHL Biological Data Science 2026,
44 in × 44 in, 1 in safe margin.

## The idea

The whole poster is a transit network map. Three source lines run into **one shared track** and
end at a single **Galaxy Workflow** terminal. The lines are Methods text (M), Expert description (E)
and Nextflow (N). Each one has a real Foundry route through a human-reviewed workflow brief
(`*-to-workflow-brief`, then `workflow-brief-to-galaxy`). The theory is carried by the map's own
symbols, and the key at the bottom ("How to read the map = how the Foundry works") teaches it:

| Map symbol | Idea (dossier §3) |
| - | - |
| Line | a route (pipeline); all routes share downstream stations |
| Station | a Mold compiled into a skill with a provenance record (Karpathy's LLM wiki, extended) |
| Interchange | a deterministic tool (Tool Shed, gxwf, Planemo) decides, not the model |
| Service notice | the open-requirements ledger: gaps are output |
| Depot + maintenance track | fix the knowledge, recompile |
| Terminal | a native Galaxy workflow; build provenance and execution provenance |

Hero line (readable at 25%): *Writing a correct workflow is a knowledge problem, not a syntax
problem. The model translates. The tools decide. The gaps are written down.*

**Route ≠ journey.** A coloured line only means the route exists. Exactly one **journey**, a real
run with a timetable and tool verdicts, is drawn: DengueSeq, as the pale band on the M line. The
poster therefore implies no success rate.

## Included, and left out (Visionary stance)

- **Included:**
  - **DengueSeq** (held out). Its real timetable comes from `foundry-run.yml`; the arrived workflow
    is drawn from `galaxy-workflow.gxwf.yml` with all 7 changeset pins. Also shown: gxwf / Planemo
    PASS, and the 5 open ledger items as service notices.
  - **Recompile instances.** `73af1f62`, with the hash `256e3861…→2e5fa1f8…`, at the Tool Shed.
    PR #701, which regenerated 8 skills, at Planemo.
  - **Upstream fixes:** IUC #8808 and gxwf 1.15.0.
  - **Preprint evidence:** 0/15, "Skills are guidance, not enforcement", and 30 agents → 18
    pipelines (Fig 1). Hokken is cited as "earlier on this line" (Fig S4A), without implying a
    first-pass statistical model.
  - **Corpus counts** as of 2026-10-24.
- **Left out:** sarek, EGAPx, CWL, the validator blind spot, MRSA/ATAC as journeys (Planemo never
  ran), demo-qc-trim and bacass (local, partial), the DengueSeq direct arm, and the README-generator
  count variants. The Visionary stance drops these partial results instead of hedging them.
- **Wording choices:**
  - "Expert specification", never "interview", on the map. Station labels are plain English, not
    Mold slugs.
  - DengueSeq's source is stated as "the paper and its linked code, scoped by an expert", not
    "methods text alone".
  - No replication claim is made.
- **Title:** dossier option 1, *From Papers and Conversations to Runnable Galaxy Workflows*, the
  submitted wording family. No result on the poster is a conversation, and nothing near the E line
  says "conversation". If John wants a literal title, a candidate is *From Papers and Expert
  Descriptions to Runnable Galaxy Workflows*.

## `[[ASK]]` and placeholder slots

1. **`[[ASK]]` Nextflow-line journeys**, the hatched box beside the N line: nf-core/rnaseq and
   nf-core/atacseq (Anton). They need sign-off. To omit them, delete the `<div class="abs ask note">`
   block in `poster.html`; nothing else depends on it.
2. **`[[QR: live results]]`**, the dashed box in "Board here". When the URL exists, add it to
   `QR_TARGETS` in `build.mjs` and swap the placeholder `<div class="code ph">` for
   `<div class="code"><!--@qr:live--></div>`.

## Build

```sh
npm install        # once: playwright, qrcode, js-yaml, @fontsource/overpass(-mono)
npm run build      # extract real data -> render HTML -> poster.pdf -> previews
npm run render     # re-render only (uses committed data/*.json; no run dirs needed)
```

Playwright uses the cached Chromium in `~/Library/Caches/ms-playwright` (playwright 1.64.1 →
chromium-1248). Previews use poppler's `pdftoppm`.

Outputs:
- `poster.pdf`: 3168 × 3168 pt, vector, fonts embedded;
- `preview.png`: 1500 px;
- `build/preview-gray.png`: the greyscale check;
- `build/preview-25pct.png`: the 25% legibility check;
- `build/poster.html`: the assembled page.

The build prints a warning in three cases, so watch for them after editing copy:
- `OVERFLOW:` a text box spills;
- `HEADING <72pt or clipped:` a `.heading` element is under 72 pt or cut off;
- `OUTSIDE SAFE MARGIN:` an element lies outside the 1 in margin.

`node_modules/` (gitignored) sits inside the Obsidian vault. Delete it after building, or exclude it
from the vault, if Obsidian or the site glob picks it up.

### Where to edit

| What | File |
| - | - |
| All prose (header, hero, callouts, depot, notices, key cards, references) | `poster.html` (plain HTML; colours are CSS variables in `:root`) |
| Map geometry, station names, line labels | `map.mjs` (`LINES`, `trunk`, `vals`; coordinates in inches) |
| Arrived-workflow strip | `wfgraph.mjs` (data-driven from `data/dengueseq.json`) |
| Provenance ticket text, QR targets | `build.mjs` |
| Real data | `data/*.json`, regenerated by `extract.mjs` |

## Data sources

All are read-only, and recorded in each JSON's `_source`.

- **`data/dengueseq.json`**, from `~/projects/foundry-runs/dengueseq-denv3/`. Galaxy run repo
  `6737777`, brief run repo `c7172f2`, review `6b8b630`. Files read:
  - `galaxy-workflow.gxwf.yml`: steps, tool pins, inputs, outputs;
  - `galaxy-workflow-validation-result.json`: gxwf `--connections --strict`, 7/7;
  - `workflow-test-result.json`: Planemo 0.75.47, 1/1 test, 7/7 jobs ok;
  - `open-requirements.ledger.yml`: 19 entries, 5 open (2 `kind: dropped`), 14 resolved;
  - both `foundry-run.yml` files: phase timestamps, 7 loop iterations.

  Expert-review facts (10 open questions, 1 edited) come from `review.md`.
- **`data/provenance.json`**, from `galaxyproject/foundry` `origin/main`
  (`casts/claude/skills/discover-shed-tool/_provenance.json`) and the diff of commit `73af1f62`.
- **Preprint** (Baker et al. 2026): p.2 and Fig 1 (30 agents, 18 pipelines, 29 of 30 diverged);
  p.16 ("Skills are guidance, not enforcement"); p.18 (0 of 15); p.8, p.19 and Fig S4A (Hokken,
  60-step workflow).
- **Corpus counts** (420 / 56 (27 reviewed) / 13 / 69 / 51): dossier §4, `origin/main` 2026-10-24.
  They are footnoted on the poster.
- **PR #701, IUC #8808, galaxy-tool-util-ts #204/#205, gxwf 1.15.0:** dossier §4.

## Fonts and colour

- **Fonts:** Overpass (400–800, plus italics) and Overpass Mono (500–700), both SIL OFL via
  `@fontsource`, copied into `build/fonts/` at build time. A few symbols (→ ≠) fall back to
  embedded system fonts (Lucida Grande, Menlo, Helvetica). Every font is embedded as CID TrueType;
  check with `pdffonts poster.pdf`.
- **Lines:** navy `#1F3A6B` (M), amber `#E9A419` (E, with a dark edge), green `#3D8B5A` (N).
  Their greyscale lightness is distinct: dark, light, mid.
- **Paper:** `#F6F3EA`. The only large saturated area is the near-black hero band.
- **Type sizes:** body at least 28 pt; station labels about 33 pt; headings (map key cards, depot, notices, line origins, "Board here") 72 pt; title 124 pt.

## Open questions

1. Title: keep "Conversations" (submitted family) or use the literal "Expert Descriptions"?
2. The `[[ASK]]` Nextflow journeys: fill them, or delete the box?
3. Live-results URL for the 4th QR?
4. The Hokken "earlier on this line" note: keep it, or drop it to avoid echoing the Orbit posters next door?
5. Re-count the corpus figures at print? `origin/main` moved to `9f83fd55` on 2026-10-28.
6. DengueSeq is not on Foundry `main`. Should the run dirs be published before the QR codes point
   people at the repo?
