# UC5 — Per-object CD11b morphometric cohort (control vs 4-oxo-RA): debrief + recipe

Driven live through a local Galaxy (v26.2.dev0) via the Playwright MCP + tools API, per `/drive-scenario`.
Scenario input: `UC5_IHC_issue.md` (GitHub issue #28). Goal: object-level IHC morphometrics as a
collection map-over, embedded on-graph, extracted to a reusable workflow.

- **History:** `92391ba43dd7fcf4` ("UC5 IHC CD11b morphometric cohort")
- **Page (notebook):** `59c76a119581e190`
- **Extracted workflow:** `b472e2eb553fa0d1` → `UC5_IHC_CD11b_DAB_extracted.ga` (10 steps, 0 warnings)

---

## TL;DR

The object-level pipeline runs end-to-end as a clean 6-element collection map-over and extracts to a
0-warning, 10-step, byte-identical-on-re-run workflow — **the extraction/engineering result is solid**.

The **science is NOT clean** (corrected after adversarial review). The faithful-to-IWC pipeline (eosin
channel + per-image Otsu) gave a biologically *inverted* result; switching to **DAB channel + a single
fixed optical-density threshold** flips it to the "expected" direction (4-oxo-RA: CD11b⁺ area 3.03%→0.12%,
objects 242→67) — **but this magnitude is confounded, not a validated effect.** The treatment batch's DAB
channel is ~10× dynamic-range-compressed (per-object max DAB ≈0.12 vs control ≈1.50), so a fixed 0.1
threshold sits at treatment's ceiling and *mechanically* forces it near-empty regardless of true biology.
The honest signal is **small and normalization-dependent** — a stain-normalization re-derivation (below)
collapses the apparent effect: from 26× (raw) to **3.7× (hematoxylin-mean loading control) down to ~1.2×
(hematoxylin-p99 control, i.e. essentially none)**. One of three treated replicates (`treatment_3`) is a
clear **non-responder** (it equals/exceeds controls after normalization). **Conclusion: no robust drug
effect can be claimed from this data+method — at best a weak, normalization-choice-dependent trend.**

## Stain-normalization re-derivation (added per user request, after review)

Attempted the genuine fix — real stain normalization before measuring DAB. Findings:

- **Textbook Macenko is degenerate on this data.** The estimated stain matrix has two near-collinear
  vectors (the CD11b sections are hematoxylin-dominated with sparse DAB, so the OD angular spread is too
  small to separate two stains). So automatic Macenko/Vahadane is not a reliable fix here.
- **Hematoxylin as a loading control (the defensible normalization)** — rescale each image's DAB by the
  factor that matches its hematoxylin to a reference (H = nuclei = biology-invariant), then measure DAB
  %area > 0.1 OD. The result is **highly sensitive to which H statistic sets the scale**:

  | normalization | control %DAB | treatment %DAB | C/T ratio |
  |---|---|---|---|
  | raw (the shipped pipeline) | 3.03 | 0.12 | **26.1×** |
  | H-**mean** loading control | 2.98 | 0.81 | **3.7×** |
  | mean DAB optical density | — | — | **1.8×** |
  | H-**p99** loading control | 2.52 | 2.05 | **1.2×** |

- **`treatment_3` is a non-responder** under every normalization (raw 0.32%; H-mean 2.40%; H-p99 5.03% —
  above the control mean). So even the modest H-mean trend rests on `treatment_1/2` only.

**Bottom line:** the drug-effect magnitude is not identifiable from this 6-ROI, two-batch dataset with these
tools — it swings from "huge" to "none" depending on an unconstrained normalization choice, and 1/3 treated
replicates contradicts it. A defensible claim needs matched-acquisition data (same scanner/staining batch)
or a calibration target, not post-hoc normalization. The re-derivation was done off-graph (numpy/skimage)
because no reliable on-graph stain-normalization / image-math tool is installed; wiring it on-graph would
encode a non-result.

---

## What was done

1. **Inputs.** Built one `list` collection `IHC ROIs` (6 × 600×600 tiff) from the shipped Zenodo URLs via
   `/api/tools/fetch` — identifiers `control_1..3` (Zenodo 20271100), `treatment_1..3` (20157596).
2. **GO/NO-GO probe (1 image).** Deconvolve → split → threshold → label → features on `control_1`,
   over all 3 HED channels, to (a) confirm multi-object label maps and (b) settle the stain channel.
3. **Cohort map-over (faithful-to-IWC).** Ran the IWC chain over all 6: color deconvolution (`rgb2hed`)
   → split (`axis=C`) → extract channel `index=1` → Otsu threshold → label (CCA) → per-object features.
4. **Found the confound** (see below); **switched to the principled DAB pipeline** and re-ran the cohort.
5. **On-graph aggregation.** `collapse_dataset` (add sample-id column) → `datamash` (per-sample
   count / stained-area / median morphology) → `ggplot2_heatmap2` cohort figure; masks → PNG via
   `graphicsmagick_image_convert` for embedding.
6. **Page.** Built a notebook embedding the input collection, control-vs-treatment segmentation masks,
   a per-object feature table, the per-sample summary, and the cohort heatmap — every artifact on-graph.
7. **Extraction.** Selective extraction by `job_ids` (the clean DAB chain only, excluding probe/eosin
   cruft) → 10-step, 0-warning `.ga`; re-invoked on the same input for the science-identical check.

---

## The central finding: a batch confound, and the principled fix

**Symptom.** With the faithful IWC pipeline (channel `index=1`, per-image Otsu), treatment ROIs produced
**more** "objects" than control (1881–2790 vs 105–288) — the opposite of the expected drug effect.

**Diagnosis (per-channel pixel stats on the deconvolved images).** *All three* treatment HED channels —
including **hematoxylin** (nuclear counterstain, present regardless of drug) — are ~10× weaker than
control (e.g. H-channel max 1.8 → 0.20). Treatment originals never reach black (min RGB ~40 vs 0), i.e.
compressed optical-density range → uniformly weak deconvolution → **per-image Otsu on the near-blank
treatment stain channel thresholds sensor noise into thousands of 1–2 px speckles.** A cross-batch
acquisition artifact, not biology. The object/distribution view is what *exposed* it (a single per-image
% area would have hidden or inverted it) — which still showcases the paper's "distributions over one
number" thesis, with a methods-caution payoff.

**Principled fix.**
- **Use the DAB channel (`index=2`)**, not the skimage-"eosin" channel (`index=1`). IWC's `index=1` is
  incidental for control and not the principled DAB readout.
- **Replace per-image Otsu with a single fixed optical-density threshold (0.1) for all 6 images** — an
  absolute "pixels above a fixed CD11b OD" measure that is batch-robust (well above background p90≈0.04,
  below genuine stain p99≈0.2).
- **Partial validity check (NOT a full substitute for stain normalization):** hematoxylin **mean** OD is
  nearly identical across arms (0.030 vs 0.031). This shows comparable *average* counterstain, but it is
  **blind to the DAB dynamic-range gap** that drives the effect (see caveat below) — equal mean H does not
  establish comparable DAB dynamic range. (These H/DAB pixel stats were computed off-graph from the raw
  TIFFs with `tifffile`, so they are **not reproducible from the history** as stored — a gap to close.)

**Result (principled DAB pipeline):**

| arm | mean objects | mean % stained area | median obj area | per-object **max** DAB intensity |
|---|---|---|---|---|
| control (vehicle/DMSO) | 242 | 3.03 % | ~21 px | ~1.50 |
| treatment (4-oxo-RA) | 67 | 0.12 % | ~9 px | ~0.12 |

The ~26× area / ~3.6× object reduction is the headline, **but it is confounded — read the caveat.** The
"max DAB intensity" column (1.50 vs 0.12) is **not a clean biological readout**; it is the *fingerprint of
the ~10× cross-batch DAB compression*, and a fixed 0.1 threshold applied at treatment's ceiling re-encodes
that compression as the result. Treatment "objects" are mostly noise (52–73% are 1–2 px) and their median
intensity (≈0.105) sits right at the 0.1 floor. Eccentricity is similar across arms (~0.87–0.92). The
*defensible* effect, controlling for equal hematoxylin, is the **~2× lower mean DAB OD** — suggestive of a
real but modest reduction in infiltrate amount; the ~26× figure overstates it.

---

## Recipe (how to redo)

Preconditions: `/drive-scenario` env (backend 8080, dev 5173, **no** test-tools flag), `ihc-morphometrics-tools.yml`
installed (all imgteam + devteam/column_maker + bgruening/text_processing + iuc/collection_element_identifiers
+ nml/collapse_collections; plus `iuc/ggplot2_heatmap2`, `bgruening/graphicsmagick_image_convert`). Admin key from
`database/universe.sqlite`. Map-over via the raw `/api/tools` batch form: `{"input":{"batch":true,"values":[{"src":"hdca","id":<hdca>}]}}`.

1. **Upload** the 6 ROIs as a named `list` via `/api/tools/fetch` (targets → hdca, elements `src:url`).
2. **Color deconvolution** map-over: `ip_color_deconvolution`, `convtype=rgb2hed`.
3. **Split** map-over: `ip_split_image`, `axis=C`, `squeeze=false` → nested `list:list` (6×3 channels).
4. **Extract DAB channel:** `__EXTRACT_DATASET__` with `which=by_index, index=2` (0-based), batched with
   `map_over_type:"list"` to map the outer list → flat list of 6 DAB channels.
5. **Threshold** map-over: `ip_threshold`, `th_method|method_id=manual`, `threshold1=0.1`.
6. **Label** map-over: `ip_binary_to_labelimage` (v0.7.3), `setup|method=cca`.
7. **Features** map-over (paired linked batch): `ip_2d_feature_extraction`, `setup|mode=with-intensities`,
   `labels=<labelmaps>`, `setup|intensities=<DAB channels>`, full feature set incl. `mean_intensity`.
8. **Aggregate (on-graph):** `collapse_dataset` (`one_header=true`, `add_name=true`, `place_name=same_multiple`)
   → `datamash` (`grouping=1`; count/sum/median ops) → `ggplot2_heatmap2` (`zscore_cond|zscore=cols`, PNG).
9. **Embed:** `graphicsmagick_image_convert` masks → PNG; build the Page with `history_dataset_collection_display`,
   `history_dataset_as_image`, `history_dataset_display` directives.
10. **Extract:** `POST /api/workflows` `from_history_id` + curated `job_ids` (clean DAB chain only) +
    `dataset_collection_ids=[1]`. Re-invoke via `POST /api/workflows/{id}/invocations` for the identity check.

---

## Table 1 metrics

| metric | value |
|---|---|
| steps | 10 (1 input collection + 9 tools) |
| map-over steps | 6 (deconvolve → split → extract → threshold → label → features) |
| reduction/scalar steps | 3 (collapse, datamash, heatmap) |
| exposed outputs | terminal heatmap (no extra exposed) |
| dangling inputs | 0 |
| report/extraction warnings | **0** |
| science-identical re-run | **byte-identical** per-sample summary (invocation `0a248a1f62a0cc04`, history `eaa9b06464bd346f`, 39/39 jobs ok) |

---

## Figures

- `uc5_report_source.png` — notebook **source** (galaxy `*_display` / `*_as_image` directives).
- `uc5_report_rendered_full.png` — full **rendered** report.
- `uc5_report_rendered_masks.png` — headline **rendered** panel: control mask dense with CD11b⁺ regions vs
  near-black treatment mask (embedded on-graph segmentation outputs).
- `uc5_report_rendered_heatmap.png` — **rendered** cohort heatmap (control/treatment blocks).
- `uc5_workflow_graph.png` — **extracted workflow** (10 steps; feature step shows dual Label-map + Intensity inputs).

---

## Changes to make next time

- **Skip the eosin/Otsu detour.** Go straight to **DAB channel (`index=2`) + fixed OD threshold**; keep the
  per-image-Otsu run only as the deliberate "what goes wrong" contrast if telling the methods-caution story.
- **Add explicit stain normalization** (Macenko/Reinhard) if/when an imgteam tool is available, instead of
  relying on the hematoxylin-equivalence argument — would make the cross-batch comparison airtight and let
  per-image Otsu work.
- **Object distribution plots.** No box/violin plotter was installed (only `ggplot2_heatmap2`); install an
  `iuc/ggplot2_*` boxplot to add per-object area/eccentricity/intensity distributions by condition.
- **Drop `count_objects` (0.0.5-2)** — it errors on the newer giatools label format; derive objects-per-sample
  from the feature-table row count (done here) or via `datamash count`.
- **Particle-size filtering.** Raw CCA over-segments into 1–2 px speckle; the fixed OD threshold suppresses
  most of it, but a small min-area filter (or `imagej2_analyze_particles_binary size>=N`) would further clean
  the per-object distributions for morphology claims.
- **More starting ROIs / true cohort.** n=3 per arm is illustrative, not powered; source additional ROIs (and
  a real multi-core TMA for the stretch) for a stronger cohort claim.

## Caveats (the central one first — added after adversarial review)

- **The cross-batch confound is NOT fully fixed; the fix re-encodes it.** Treatment per-object **max** DAB
  ≈ 0.12–0.18 vs control ≈ 1.50 — the *same ~10× compression* seen across all channels (incl. hematoxylin
  max) in the eosin/Otsu failure. A single fixed 0.1 threshold applied to a channel whose entire treatment
  range tops out near 0.12 mechanically forces treatment near-empty, independent of true CD11b biology.
  So the ~26× area reduction is **confounded with acquisition gain**, not a validated effect size. This is
  arm-unfair: the threshold was effectively calibrated on control (p99 of *control* stain) and applied to a
  treatment arm whose whole distribution is 10× lower.
- **Not robust at n=3.** `treatment_3` (166 objects, 0.32% area) partially responds — within ~2× of
  `control_3`'s area. The big "26×" mean is carried by `treatment_1/2` collapsing to ~0.01%.
- **Object count and % area are the *least* robust readouts here**, not the anchors — both are dominated by
  the gain artifact and by speckle (52–73% of treatment objects are 1–2 px; no min-area filter was applied).
  The most defensible comparison is **hematoxylin-controlled mean DAB OD (~2×)**, which is far more modest.
- **Proper fix (not done):** real stain normalization (Macenko/Reinhard) or per-image OD rescaling so any
  threshold is applied on comparable dynamic ranges, then re-derive. Until then, do not assert a causal
  drug-effect magnitude — frame as a methods-caution vignette where neither pipeline cleanly separates
  biology from batch.
- n = 3 per arm — per-object distributions are large but biological replication is small.
