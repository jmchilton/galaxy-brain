# UC7 — FT-MS molecular-formula assignment & van Krevelen chemical space — drive debrief

Driven via `/drive-scenario` against local Galaxy (backend 8080, dev client 5173), 2026-06-20.

## TL;DR

- **Cleanest UC yet.** All 9 RECETOX `MFAssignR` tools were already installed at the exact
  shipped pins (`1.1.2+galaxy*`) — **no version migration**, the shipped IWC
  `mfassignr.ga` imported and invoked unchanged. 10-step linear chain, every job green.
- **MVP is a faithful reproduction + a genuinely good figure.** From one 30,401-peak
  negative-mode mass list: noise estimate → isotope filter → first-pass CHO → recalibration
  → final assignment → **van Krevelen diagram** (the money shot). 3,036 unambiguous CHO
  formulas; the VK cloud is centered exactly where natural dissolved organic matter sits.
- **The recalibration story is quantitative and real.** Mean absolute mass error on
  assigned formulas tightens **1.39 ppm (first pass) → 0.49 ppm (after recalibration)** —
  ~3× sharper. That is the QC narrative, backed by the `MZplot`.
- **Stretch landed on-graph.** An `tp_awk` pass bins each unambiguous formula by its van
  Krevelen region → a quantitative compound-class composition table:
  **lignin/CRAM-like 57.2%**, protein/amino-sugar 12.4%, tannin 12.2%, lipid 9.6%,
  condensed-aromatic 5.1%, carbohydrate 1.8%, unsaturated-HC 1.5%, other 0.2%. A textbook
  DOM fingerprint — the qualitative plot turned into a ranked number.
- **Honest framing throughout:** descriptive single-sample characterization (no condition
  contrast); assignment is partial (**3,263 unassigned vs 3,036 unambiguous, ~52% of the
  candidate masses scored** — far fewer relative to the 25,675 monoisotopic peaks, most of
  which never reach a candidate formula); shipped chemistry is **CHO-only** so heteroatom-class
  binning would be degenerate; region boundaries are literature conventions.
- **Clean linear extraction.** Walking the provenance backward from the VK plot recovered the
  whole assignment+recalibration workflow as a 10-step `.ga` that round-trips clean — the
  no-map-over extraction story the collection-heavy vignettes don't show.

## Artifacts

- **History** `4a56addbcc836c23` (30 datasets).
- **Page** `b847e822bdc195d0`, slug `uc7-ftms-van-krevelen-molecular-formula`
  (`/published/page?id=b847e822bdc195d0`), published. 7 sections, all genuine on-graph
  directives (`history_dataset_as_image` / `_as_table`).
- **Extracted workflow** `UC7_mfassignr_van_krevelen_extracted.ga` (10 steps; from-history
  provenance extraction; re-import round-trips clean, 9 tool steps + 1 data input, all
  connections intact).
- **Figures** (usecases dir): `uc7_van_krevelen.png` (money shot, 2100²),
  `uc7_mzplot_recal.png` (recalibration error-m/z QC), `uc7_snplot.png` (S/N QC),
  `uc7_page_full.png` (whole published page).

## Pipeline as driven

1. **Upload** `mfassignr_input.txt` (Zenodo 13768009) via `/api/tools/fetch` — 30,401 peaks
   (mass + intensity), negative mode.
2. **Import + invoke** shipped `mfassignr.ga` unchanged (single "Feature table" input).
3. **Noise** — `KMDNoise` = 346.07 (carried forward; `HistNoise` = 317.35 concordant);
   `SNplot` QC figure.
4. **Isotope filter** — `IsoFiltR` → 25,675 monoisotopic / 4,726 isotopologue peaks.
5. **First-pass CHO** — `MFAssignCHO` → 3,097 formulas as recalibration anchors.
6. **Recalibration** — `RecalList` → `FindRecalSeries` → `Recal`; `MZplot`; mean |err_ppm|
   1.39 → 0.49.
7. **Final assignment** — `MFAssign` (CHO-only) → 3,036 Unambig / 0 Ambig / 3,263 None +
   `plots` collection (VK, MSgroups, errorMZ, msassign). The money-shot VK is the **final**
   MFAssign element `cd04f282f6a11f18` (hid28) — *not* the near-identical first-pass CHO VK
   (hid24); they sit adjacent in the history, so embed by the MFAssign-created id.
8. **Stretch** — `tp_awk_tool` bins Unambig by O/C (col 35) + H/C (col 36) into VK regions →
   compound-class composition table.
9. **Extraction** — from-history workflow extraction (job_ids backward from VK) → 10-step
   `.ga`; round-trip re-import verified.

## Gotchas / notes

- **From-history extraction API id formats are mixed** (legacy controller): `job_ids` must be
  **encoded** ids (controller decodes them); `dataset_ids` must be **raw HID integers**
  (e.g. `[1]`), passed through and `int()`-ed in `extract_steps`. Passing encoded dataset ids
  → `ValueError: invalid literal for int()`; passing raw int job ids → "unable to decode".
  An empty `job_ids`/`dataset_ids` extraction silently yields a 0-step workflow.
- **Page directives reject `title=`** on `history_dataset_as_table` (400 "Invalid argument to
  Galaxy directive [title]") — drop the arg.
- **Full-page screenshot can blank large images** mid-capture (they showed as pink boxes);
  the images were actually `complete` (2100²) — re-shoot after confirming `img.complete`.
- **Shipped MFAssign is CHO-only** (`Nx=0, Sx=0, Px=0, Ox=30`) → 3,029 CHO + 7 CH; the
  meaningful composition axis is van Krevelen region, not heteroatom class. Enabling N/S/P
  would extend the stretch.
- **`Ambig=0` is a config artifact** (`ambig_bool=off`), not absence of ambiguity —
  multi-candidate masses fall into `None`. Stated honestly on the page.

## Key IDs

History `4a56addbcc836c23`; input h5… `82cdcb0c41950210` (hid1). SNplot `8eb3358bbd1313c6`
(hid6), monoisotopic `hid7`, first-pass CHO Unambig `hid10`. MZplot `0453c666c6590847`
(hid18). Final Unambig `3e2dfd57e568189f` (hid20), None `04f11d4cb8d28870` (hid22), VK
`cd04f282f6a11f18` (hid28). VK composition `174eabd470156671` (hid31). Extracted workflow
`UC7_mfassignr_van_krevelen_extracted.ga`.
