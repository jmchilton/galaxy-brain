# UC1 debrief 2 — clean extractable rebuild, live rendering, contributions (2026-06-14)

Second debrief for use case 1 (MRSA mobile-AMR, issue #12). The first debrief (`UC1_DEBRIEF.md`) covers the original interactive build and appends the clean-rebuild section; this document is the standalone session-2 writeup focused on **extractability, live notebook rendering, and the reusable Galaxy contributions** — the material most relevant to the Galaxy Notebooks paper.

## One-line takeaway

UC1 is the **cleanest notebook→workflow extraction showcase** of the three: a genuine collection map-over analysis whose entire notebook (including both figures) extracts to one fully-connected, sample-agnostic workflow with a flawless report rewrite. It is the concrete exemplar of the paper's "narrative seeds reuse" claim.

## Clean rebuild & extraction (verified)

- History `MRSA mobile AMR context across isolates (clean)` `48916fac0de9a85d`; notebook page `eafb646da3b7aac5`; extracted workflow `33b43b4e7093c91f`.
- Built entirely as a collection map-over: one `list` of 4 combined chr+plasmid FASTAs (single `/api/tools/fetch`) → staramr / ISEScan / Integron Finder (all mapped) → awk→BED ×2 → SortBED ×2 → `bedtools closest -d` (mapped) → Collapse Collection → two `tp_awk` END-block pivots → two `ggplot2_heatmap2` PNGs. No pasted matrices, no duplicate staramr.
- **Page-based extraction (#22860): 18 summary rows, 14 seeded, 9 exposed outputs, 8 map-over (ICJ) steps, 0 warnings / 0 seed_warnings / 0 invalid.** Extracted `.ga`: **14 steps (1 input + 13 tools), every input_connection resolves (zero dangling), 9 workflow outputs, report rewritten with 0 leftover instance ids.**
- Science reproduced **byte-identical** to the validated original (closest collection identical across all 4 isolates; context matrix byte-identical; location matrix cells identical). The load-bearing headline holds: `aac(6')-aph(2'')` is IS6-adjacent on the plasmids of KUN1163/KUH140046 but IS256-adjacent on the KUH180129 chromosome.
- **Reproducibility gotcha worth citing:** ISEScan's `remove_short_is` default (`false`) kept partial/unclassified (`family=new`) elements and injected spurious distance-0 IS overlaps (25 vs the validated 17 for KUN1163); `remove_short_is=true` restores the byte-identical result. A single tool-parameter default silently changed a figure — a clean example of why the *displayed, on-graph* artifact (not a pasted screenshot) is what makes the analysis auditable.

## Live notebook rendering review (Playwright, dev client)

- **On-graph figures render correctly in the live notebook.** Both `ggplot2_heatmap2` PNGs display via `history_dataset_as_image`; the teal (plasmid) cells visibly carry the comparative headline. This is direct visual evidence that "every displayed figure is a real tool output" is achievable and reads well.
- **Refinement — collection-display noise.** `history_dataset_collection_display` of the staramr collections renders each element's `misc_info`/stderr (here, the emulated-container `amd64 ... does not match host arm64` warning + PointFinder log) as prominent code blocks, four times per collection. The TSV table content would be more useful; for tabular collections prefer `history_dataset_as_table` (collapsed/combined) or have the collection display surface the data peek. This also makes the rendered notebook long.

## Reusable Galaxy contributions (this UC's relevance)

UC1 did not require a code change — which is itself the point: it is the **happy path** that the existing extraction machinery handles end-to-end. It is the control/baseline against which UC2 (which forced the `_original_hda` extraction fix) and UC3 (which forced the PDF-rendering work) are the harder cases.

## Paper relevance

- Strongest single piece of evidence for the **notebook-driven workflow extraction** section: a real multi-tool map-over analysis where the *referenced outputs + provenance graph* recover a complete, runnable, sample-agnostic workflow with a connected report.
- Figure candidates: (a) the rendered notebook with the two on-graph heatmaps; (b) the extracted 14-step workflow graph beside the notebook, illustrating "documented outputs → reusable workflow."
- Supports the design-goal claims "reference artifacts, not just describe them" and "let narrative seed reuse" with a concrete, quantified instance.

## Open refinements / next

Collection-display rendering (above); optional Bakta structural-confirmation as a non-extractable enrichment; a JBrowse locus view.
