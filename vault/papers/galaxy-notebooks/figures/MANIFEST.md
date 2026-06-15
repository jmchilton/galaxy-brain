# Figure capture manifest

Source object IDs for each PNG in this directory. Reference server: local Galaxy 26.2.dev0 (worktree `history_pages`). Captured via Playwright MCP against the dev client (`http://localhost:5173`), light theme, 1600×1000 window. Workflow graphs captured from the Workflow Editor canvas (`.workflow-canvas`), cropped to the node bounding box.

## Previously captured (unchanged)
| File | Source object |
|---|---|
| `uc1_notebook_full.png` | UC1 notebook page `eafb646da3b7aac5` (history `48916fac0de9a85d`) |
| `uc1_fig1_heatmap.png` | UC1 heatmap dataset `29e36fb8642bf5ed` (first mobile-resistome matrix), 2000×2000 downscaled to 463×464 |
| `uc3_volcano_embed.png` / `uc3_volcano_as_pdf_directive.png` | UC3 volcano PDF (live `<embed>` vs `history_dataset_as_pdf` rasterized) |
| `uc3_pca_embed.png` / `uc3_pca_as_pdf_directive.png` | UC3 DESeq2 diagnostics PDF page 1 (PCA): live embed vs directive |

> `uc2_notebook_full.png` / `uc3_notebook_full.png` were generated earlier but are not currently in `figures/` — regenerate alongside the quality re-capture (UC2 page `42a2c611109e5ed3` / history `96d9e11f37f34b29`; UC3 page `a7e42332dab8f5db` / history `241d84796a24640a`).

## Newly captured (this pass)
| File | Source object | Notes |
|---|---|---|
| `uc1_fig1_workflow_graph.png` | extracted workflow `33b43b4e7093c91f` (14 steps) | Fig 1 graph half; pairs with `uc1_notebook_full.png` |
| `uc1_fig1_heatmap2.png` | dataset `579ae69ccbd17e45` ("heatmap2", second mobile-resistome matrix), 2000×2000 → 463×464 | matches `uc1_fig1_heatmap.png` style |
| `uc1_fig1_heatmap2_full.png` | same dataset, full 2000×2000 | high-res source for layout |
| `uc3_fig3a_workflow_degenerate.png` | workflow `4b187121143038ff` (2 inputs, 0 tools) | Fig 3a "before"; extracted from off-graph page `36ddb788a0f14eb3`, whose only references are two re-uploaded PNG datasets (`64ed206b5444cf1a` DESeq2 PCA, `e1a34e8a9807a4ae` Volcano). Same default zoom as the "after" panel. |
| `uc3_fig3a_workflow_5step.png` | extracted workflow `0a248a1f62a0cc04` (5 steps) | Fig 3a "after"; same zoom as degenerate panel |
| `uc2_fig3b_caller_5step.png` | extracted workflow `3f5830403180d620` (5 steps) | Fig 3b map-over peak caller |
| `uc2_fig3b_comparator_29step.png` | extracted workflow `e85a3be143d5905b` (29 steps) | Fig 3b pairwise comparator |
| `uc2_single_condition-pinned_34step.png` | extracted workflow `03501d7626bd192f` (34 steps) | Fig 3b optional reference (single condition-pinned extract) |
| `uc1_revision_panel.png` | page `b887d74393f85b6d` revision history (5 revisions) | evidence layer 4 / agent authorship. Badges: `(AI)` = `edit_source="agent"`, `(Unknown)` = pre-feature/initial revision. See report caveat. |

## Clean / extractable page + history IDs (for any further captures)
| UC | page | history |
|---|---|---|
| UC1 MRSA | `eafb646da3b7aac5` | `48916fac0de9a85d` |
| UC2 TAL1 | `42a2c611109e5ed3` | `96d9e11f37f34b29` |
| UC3 ATAC | `a7e42332dab8f5db` | `241d84796a24640a` |
