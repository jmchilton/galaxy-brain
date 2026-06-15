# Figure capture TODO — for the agent in the `history_pages` worktree

Hand-off list for the agent with MCP access to the local Galaxy (worktree `/Users/jxc755/projects/worktrees/galaxy/branch/history_pages`, MCP `galaxy-notebooks`). Everything below should be obtainable from the existing UC1/UC2/UC3 histories, notebooks, and extracted workflows — no new analysis.

**Already captured** (in `vault/papers/galaxy-notebooks/figures/`): `uc1_notebook_full`, `uc1_fig1_heatmap`, `uc3_volcano_embed`, `uc3_volcano_as_pdf_directive`, `uc3_pca_embed`, `uc3_pca_as_pdf_directive`. (The `uc2`/`uc3` notebook fulls were generated but not kept — regenerate if a notebook montage is wanted.)

**Known UC1 IDs** (from `usecases/UC1_PAPER_INTEGRATION.md`): notebook page `eafb646da3b7aac5`; extracted workflow `33b43b4e7093c91f`; heatmaps `29e36fb8642bf5ed` (have) / `579ae69ccbd17e45` (need); history `48916fac0de9a85d`. UC2/UC3 IDs: pull from `usecases/UC2_DEBRIEF*.md` / `UC3_DEBRIEF*.md`, or `list_pages` / `list_workflows` via MCP.

For every capture: record the source object ID in a one-line manifest beside the PNG, use the light theme, a consistent window width, and 2× (retina) resolution.

> **STATUS (capture pass complete):** all P1 done; P2 revision panel done; report continuity + quality re-captures documented but not done. Details/caveats in `FIGURE_CAPTURE_REPORT.md`; source IDs in `figures/MANIFEST.md`.

## P1 — completes the three referenced manuscript figures (highest value)

- [x] **Figure 1, graph half** — `uc1_fig1_workflow_graph.png` (workflow `33b43b4e7093c91f`, all 14 nodes).
- [x] **Figure 2, second heatmap** — `uc1_fig1_heatmap2.png` (+`_full`), dataset `579ae69ccbd17e45`, matched to `uc1_fig1_heatmap.png`.
- [x] **Figure 3a — ATAC before/after** — `uc3_fig3a_workflow_degenerate.png` (2 inputs/0 tools, extracted from the off-graph notebook's two re-uploaded PNG references) + `uc3_fig3a_workflow_5step.png`. Same zoom.
- [x] **Figure 3b — ChIP caller/comparator** — `uc2_fig3b_caller_5step.png` + `uc2_fig3b_comparator_29step.png` + optional `uc2_single_condition-pinned_34step.png`.

## P2 — strengthening captures (optional, cheap from these histories)

- [ ] **Report continuity** — NOT done; needs an invocation render. Procedure in `FIGURE_CAPTURE_REPORT.md`.
- [x] **Revision provenance / agent authorship** — `uc1_revision_panel.png` (page `b887d74393f85b6d`, 4 agent revisions badged `(AI)`). CAVEAT: shows agent authorship but not the user/agent/restore mix nor the GATA1-null correction — no real UC page carries all three `edit_source` kinds (see report).
- [ ] **PDF renderer figure** — skipped; the four existing UC3 PDF shots already cover it.

## Quality re-captures (worth redoing the notebook fulls)

- [ ] NOT done — requires switching the session's current history first (the editor's right panel shows the *current* history, not the page's source history). Procedure + UC history IDs in `FIGURE_CAPTURE_REPORT.md`. (`uc2`/`uc3` notebook fulls are also currently absent from `figures/` — regenerate together with this fix.)
- [ ] Both full-app + content-cropped shots per notebook — see report.

## Not capturable here (assembly/drawing, noted for completeness)

- Figure 3 panel composition (dashed seam arrow, before/after layout) — assembled from the P1 graph captures.
- Data-model and authoring-modes diagrams — drawn, not captured (see `figures.md` optional list).
</content>
