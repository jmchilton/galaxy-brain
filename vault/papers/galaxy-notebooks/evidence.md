# Evidence

Current evidence snapshot for `manuscript.md`. The manuscript now treats notebook-driven extraction, report continuity, and external-agent notebook authorship as delivered behavior, not as an evaluation plan.

## Delivered System

- History-attached Pages via `Page.history_id`.
- Revision provenance via `PageRevision.edit_source`.
- Page-scoped chat via `ChatExchange.page_id`.
- History-aware notebook assistant tools.
- Shared editor, diff, revision, rendering, and API paths for notebooks and standalone reports.
- MCP notebook operations for external-agent authoring, with agent edits recorded as `edit_source="agent"` and restores as `edit_source="restore"`.

## Vignette Evidence

- **Vignette 1: mobile resistome.** Four-isolate *S. aureus* ARG-to-insertion-sequence context analysis. Notebook-referenced on-graph tables and heatmaps extract to a 14-step, 9-output, sample-agnostic workflow that re-runs byte-identical to the validated original.
- **Vignette 2: differential ATAC-seq.** Corces 2016 hematopoiesis count-matrix analysis contrasting erythroblast and B-cell accessibility. Notebook-referenced PCA, volcano, significant-peak, and ranked top-gained outputs extract to a 13-step, 6-output workflow that reproduces the 45,620 significant-peak result and lineage master-regulator loci.
- **Vignette 3: differential ChIP.** TAL1 G1E-versus-megakaryocyte binding analysis. A single extraction reproduces the analysis but is condition-pinned; reusable decomposition yields a 5-step map-over peak caller and 29-step pairwise comparator.

## Evidence Layers

- **Implementation completeness:** migrations, API, frontend, assistant tools, revision behavior, MCP operations, and test coverage.
- **Worked notebook artifacts:** Figures 1-3 show notebooks with on-graph outputs, not pasted figures.
- **Workflow handoff:** Table 1 and SI Workflows S1-S5 show extracted workflow structure, clean inputs, exposed outputs, and re-run behavior.
- **Agent authorship:** Figure 4 shows MCP-authored revisions recorded as agent-authored notebook revisions.

## Remaining Evidence Gaps

- Exact Galaxy PR number(s), commit range, and release target.
- Current test counts by layer.
- Final venue-specific availability/data-availability handles.
- Optional report-continuity screenshot showing notebook narrative inside an extracted workflow report.
