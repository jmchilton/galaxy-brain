# UC2 debrief 2 — clean extractable rebuild, live rendering, contributions (2026-06-14)

Second debrief for use case 2 (TAL1 peaks → candidate genes, issue #13). The first debrief (`UC2_DEBRIEF.md`) covers the original build, the extraction-test analysis, and appends the clean rebuild + the two-workflow split; this document is the standalone session-2 writeup focused on **extractability, the code fix it forced, live rendering, and paper relevance**.

## One-line takeaway

UC2 is the **robustness case**: a differential (two-condition) analysis that (a) validated the `list:list` map-over-reduce restructure for MACS2, (b) **drove a real Galaxy extraction-correctness fix** (`_original_hda` dropping collection-operation steps), and (c) showed the irreducible limit of "one notebook → one *reusable* workflow" for 2-way comparisons — cleanly resolved by a two-workflow split.

## Clean rebuild & extraction (verified)

- History `TAL1 peaks to candidate genes (clean, extractable)` `96d9e11f37f34b29`; notebook page `42a2c611109e5ed3`.
- Clean uploads: 6 FASTQ fetched from Zenodo directly into **two `list:list` collections** (condition→replicate) + the mm10 RefSeq BED. Bowtie2 map-over → BAM `list:list`.
- **Validated the `list:list` MACS2 restructure live** (the recipe flagged "verify before banking"): passing two `list:list` to MACS2's two `multiple="true"` inputs with `map_over_type:"list"` does outer-map (condition) + inner-reduce (pool replicates), linked on the outer key → one MACS2 step, two condition narrowPeaks. Naive `batch:true` instead flattens to all leaves (replicates not pooled) — the encoding matters.
- Science reproduced **exactly**: G1E 261 / mega 150 peaks; common 39 / G1E-only 222 / mega-only 110; promoter-bound `Group` gene lists Gata1 (G1E-only), Fli1+Tal1 (mega-only), Cbfa2t3 (common); figure bin counts identical (figure closest uses `ties=first`).
- **Extraction outcomes (both verified):**
  - *Single workflow* `03501d7626bd192f` (post-fix): 34 steps, **zero dangling**, with the Extract-Dataset bridge wired through — the comparison seam is **condition-pinned** (`identifier=G1E`/`mega`) but runs.
  - *Two-workflow split* (fully reusable): **WF1 peak caller** `3f5830403180d620` (5 steps, two `list:list` reads → Bowtie2 ×2 → MACS2 → condition peaks list; sample-agnostic) + **WF2 comparator** `e85a3be143d5905b` (29 steps, 4 inputs → 3-way intersect → Group gene lists + datamash figure; no condition-name pinning). Both connected, edges resolve.

## The extraction-correctness fix this UC forced (key contribution)

- Root cause (DB-confirmed): a `__EXTRACT_DATASET__` output HDA carries **both** `copied_from` (its source collection element) **and** its own creating job. `galaxy.workflow.extract._original_hda` walked `copied_from` unconditionally, so `summarize` and the page-extraction closure normalized the extracted dataset back to its source and **dropped the Extract Dataset step**, leaving the downstream comparison input-less (dangling). A UI "Extract" produced a broken workflow.
- Fix (`lib/galaxy/workflow/extract.py`): `_original_hda`/`_original_hdca` stop walking `copied_from` when the content has its own `creating_job_associations` — a passive copy has none and still normalizes; a `DatabaseOperationTool` output (Extract Dataset, Unzip, …) is kept as a real step. Generalizes to every collection-operation tool. Unit-tested + a Selenium E2E test (`test_notebook_keeps_extract_dataset_step`) asserting the step survives with its edges.

## Live notebook rendering review (Playwright, dev client)

- The distance-to-TSS heatmap (`ggplot2_heatmap2` PNG) renders cleanly; both candidate-gene-list `history_dataset_display` cards render with the markers (Gata1, Fli1) and Download/Import affordances. No warnings, no broken displays.

## Paper relevance

- The honest counterpoint to UC1 in the **extraction** section: a *differential two-condition* analysis is the one shape where "notebook → one *reusable* workflow" hits a real topology limit (an irreducible 2-way element comparison). The paper can state this limit precisely and show the clean resolution: split into a map-over caller + a pairwise comparator.
- Evidence that the extraction machinery is **robust and improvable**: a real use case surfaced a correctness bug (`_original_hda`) that was root-caused and fixed with tests — supports the implementation/test-coverage narrative.
- Demonstrates structural encoding of experimental design (`list:list` condition→replicate) driving map-over+reduce without metadata-aware tools — useful for the "reference artifacts / structure for reuse" discussion. (Sample sheets remain the hand-authored ideal but are not an extraction target; the nested `list:list` is.)

## Open refinements / next

Surface `__EXTRACT_DATASET__` in the extraction summary automatically (the fix makes it seed; the summary-walk could also recognize collection-op steps generically); JBrowse locus view; RNA-seq expression stretch.
