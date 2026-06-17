# Figures

Canonical set = the figures actually referenced in `manuscript.md` ("### Figures"). Keep this file aligned with that section. "Asset status" tracks whether a real screenshot exists yet. Per-PNG source object IDs are in `figures/MANIFEST.md`; the (now-archived) capture pass is documented in `old/FIGURE_CAPTURE_REPORT.md`.

**Figure count:** the paper has **4 referenced figures** (Fig 1–4), all backed by captured panels and embedded in the manuscript. Final count: 4.

## Referenced figures (in the manuscript)

### Figure 1 — notebook beside extracted workflow
Rendered mobile-resistome notebook beside the extracted 14-step graph. The concrete instance of "history → notebook → graph → extracted workflow."
- Asset status: **COMPLETE**. Panels: `uc1_notebook_full.png` (notebook) + `uc1_fig1_workflow_graph.png` (14-step workflow `33b43b4e7093c91f`). Remaining: side-by-side layout in final art.
- Note: `uc1_notebook_full.png` was re-captured (1600×1000) with the UC1 history active in the right panel — the populated "MRSA mobile AMR context across isolates (clean)" history (28 active datasets), page `eafb646da3b7aac5`, history `48916fac0de9a85d`. The earlier shot showed an empty "Unnamed history" because the page editor's right panel renders the session's *current* history, not the page's source history; fix is to set the current history in-browser (`history/set_as_current?id=…`) before opening the editor.

### Figure 2 — embedded-output exemplar
The two mobile-resistome `ggplot2_heatmap2` heatmaps, captioned as extractable tool outputs (not pasted images) — the visual payoff for the auditability argument.
- Asset status: **COMPLETE**. Panels: `uc1_fig1_heatmap.png` (dataset `29e36fb8642bf5ed`) + `uc1_fig1_heatmap2.png` (dataset `579ae69ccbd17e45`); `uc1_fig1_heatmap2_full.png` is the 2000×2000 source. Note: matplotlib title "…by mobility context" is clipped at the right edge in the source PNGs (present in both, not a capture artifact).

### Figure 3 — extraction outcomes across vignettes
Multi-panel: (a) differential ATAC-seq application — notebook source + rendered on-graph figures beside the 13-step workflow extracted from it; (b) differential-ChIP caller/comparator split with a "analyst picks the two conditions" seam. Table 1 accompanies.
- Asset status: **COMPLETE** (panels). (a) `uc3_notebook_source.png` (editor source), `uc3_notebook_rendered_pca.png` + `uc3_notebook_rendered_volcano.png` (rendered on-graph image outputs), `uc3_notebook_rendered_tables.png` (on-graph tabular outputs), and `uc3_workflow_13step.png` (13-step workflow `ba751ee0539fff04`, both PCA/volcano figure branches via `graphicsmagick_image_convert` → `__EXTRACT_DATASET__`). (b) `uc2_fig3b_caller_5step.png` + `uc2_fig3b_comparator_29step.png`; optional reference `uc2_single_condition-pinned_34step.png`. Remaining: panel layout + the dashed seam arrow in final art.

### Figure 4 — agent authorship is attributable
Revision history of the mobile-resistome notebook (authored entirely via MCP): four agent-authored revisions badged `(AI)` above the initial pre-feature revision. The concrete instance of evidence layer 4.
- Asset status: **COMPLETE**. Panel: `uc1_revision_panel.png` (page `b887d74393f85b6d`). Caption honestly: shows agent authorship only; no real UC page carries the user/agent/restore mix, so do not stage synthetic provenance.

## Optional figures that would strengthen the paper (not currently referenced)

Listed roughly by cost-to-add given assets already in hand.

- **Report continuity (NOT captured).** Would show the notebook narrative carried into the extracted workflow's report. Procedure in `old/FIGURE_CAPTURE_REPORT.md`: run an invocation of `33b43b4e7093c91f`, then `GET /api/invocations/{id}/report` and screenshot beside `uc1_notebook_full.png`.
- **Notebook data model (no asset — diagram).** Page, PageRevision, ChatExchange, optional `history_id`, `edit_source`. Supports Implementation/Data Model.
- **Graph confirmation / prune view (no asset).** Only if that view is built — see the "Optional enhancement" item in `tasks.md`.

## Quality re-capture
`uc1_notebook_full.png` — **RESOLVED.** Re-captured with the UC1 history active in the right panel (see Figure 1 note above). The `uc2`/`uc3` notebook fulls are still **not in `figures/`** and carry the same right-panel defect when shot; regenerate them with the same `history/set_as_current` approach only if a notebook montage is wanted (UC2 page `42a2c611109e5ed3` / history `96d9e11f37f34b29`; UC3 page `a7e42332dab8f5db` / history `241d84796a24640a`). Neither is referenced in the manuscript today.

## Source PNGs
14 PNGs in `figures/` (source object IDs in `figures/MANIFEST.md`). The manuscript embeds them with note-relative paths (`![](figures/…png)`) — single source of truth, no `public/` mirror. Astro's content-collection image pipeline hashes/optimizes them into the build, and the same relative embeds render in Obsidian.
</content>
