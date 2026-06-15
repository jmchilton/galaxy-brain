# Figures

Canonical set = the figures actually referenced in `manuscript.md` ("### Figures"). Keep this file aligned with that section. "Asset status" tracks whether a real screenshot exists yet; capture-ready IDs and source PNGs are listed so production does not hunt.

**Figure count:** the paper has **3 referenced figures** (Fig 1–3), plus at most ~1 optional one (the PDF-renderer figure). The 6 source PNGs in `figures/` are panels/candidates, not six figures — the four UC3 PDF shots compose into a single optional figure. Final realistic count: 3, or 4 with the PDF-renderer figure.

## Referenced figures (in the manuscript)

### Figure 1 — notebook beside extracted workflow
Rendered mobile-resistome notebook beside the extracted 14-step graph. The concrete instance of "history → notebook → graph → extracted workflow."
- Asset status: **PARTIAL**. Notebook half captured (`uc1_notebook_full.png`). Workflow-graph half not captured — capture workflow `33b43b4e7093c91f`.

### Figure 2 — embedded-output exemplar
The two mobile-resistome `ggplot2_heatmap2` heatmaps, captioned as extractable tool outputs (not pasted images) — the visual payoff for the auditability argument.
- Asset status: **PARTIAL**. One heatmap captured (`uc1_fig1_heatmap.png`, dataset `29e36fb8642bf5ed`). Second heatmap not captured — dataset `579ae69ccbd17e45`.

### Figure 3 — extraction outcomes across vignettes
Multi-panel: (a) differential ATAC-seq before/after — off-graph notebook seeding 2 inputs / 0 tools vs on-graph seeding the 5-step DAG; (b) differential-ChIP caller/comparator split with a dashed "analyst picks the two conditions" seam. Table 1 accompanies.
- Asset status: **NOT STARTED**. Needs extracted-workflow graph captures or a composed diagram; none of the current PNGs are workflow graphs.

## Optional figures that would strengthen the paper (not currently referenced)

Listed roughly by cost-to-add given assets already in hand.

- **PDF renderer extension (assets READY — cheapest high-value add).** Demonstrates the Implementation "PDF tool output → display + extract" contribution, which currently has no figure. Pairs the live `<embed>` view (PDF chrome) against the rasterized `history_dataset_as_pdf` directive, and single-page (volcano) vs multi-page page-selection (PCA, page 1 of 5). The PCA embed shot also visibly shows the known multi-page "peek" residual the manuscript admits. Assets: `uc3_volcano_embed.png`, `uc3_volcano_as_pdf_directive.png`, `uc3_pca_embed.png`, `uc3_pca_as_pdf_directive.png`. Slots beside the Implementation PDF-renderer paragraph.
- **Notebook data model (no asset — diagram).** Page, PageRevision, ChatExchange, optional `history_id`, `edit_source`. Supports Implementation/Data Model.
- **Authoring modes / revision provenance (no asset — diagram).** Human solo, human + in-app agent, external agent via MCP, all writing one revisioned document; `edit_source` distinguishing manual/agent/restore. Supports Authoring Modes and the Discussion review benefit.
- **Graph confirmation / prune view (no asset).** Only if that view is built — see the "Optional enhancement" item in `tasks.md`.

## Capture-ready IDs (UC1, from UC1_PAPER_INTEGRATION.md)
notebook page `eafb646da3b7aac5`; extracted workflow `33b43b4e7093c91f`; heatmaps `29e36fb8642bf5ed` / `579ae69ccbd17e45`; history `48916fac0de9a85d`. UC2/UC3 analogues live in their debriefs.

## Source PNGs
Copied into `figures/` in this directory (6 files, the panels with a real chance of use): `uc1_notebook_full`, `uc1_fig1_heatmap`, `uc3_volcano_embed`, `uc3_volcano_as_pdf_directive`, `uc3_pca_embed`, `uc3_pca_as_pdf_directive`. The two extra notebook fulls (`uc2`/`uc3`) were not kept — regeneration from the `history_pages` worktree is cheap if a notebook montage is ever wanted. Still-missing captures are listed in `FIGURE_CAPTURE_TODO.md`.
</content>
