# Figure capture report — response to FIGURE_CAPTURE_TODO.md

Capture pass run against the local Galaxy (26.2.dev0, worktree `history_pages`) via Playwright MCP on the dev client (`localhost:5173`), light theme, 1600×1000 window. All new PNGs are in `figures/`; source IDs are in `figures/MANIFEST.md`.

## P1 — DONE (all four referenced manuscript figures completed)

| TODO item | File(s) | Status |
|---|---|---|
| Fig 1, graph half (14-step) | `uc1_fig1_workflow_graph.png` | ✅ all 14 nodes, cropped to node bbox |
| Fig 2, second heatmap | `uc1_fig1_heatmap2.png` (matched 463×464) + `uc1_fig1_heatmap2_full.png` (2000×2000) | ✅ dataset `579ae69ccbd17e45` |
| Fig 3a, ATAC before/after | `uc3_fig3a_workflow_degenerate.png` (2 inputs/0 tools) + `uc3_fig3a_workflow_5step.png` | ✅ same zoom → read as a pair |
| Fig 3b, ChIP caller/comparator | `uc2_fig3b_caller_5step.png` + `uc2_fig3b_comparator_29step.png` + `uc2_single_condition-pinned_34step.png` (optional ref) | ✅ |

**How the degenerate "before" was produced (worth knowing for the caption / methods).** There was no stored degenerate workflow. The off-graph ATAC notebook is page `36ddb788a0f14eb3`; its only content directives are two `history_dataset_as_image(...)` references, both pointing at **re-uploaded PNG datasets** (`64ed206b5444cf1a` "DESeq2 PCA genome-wide", `e1a34e8a9807a4ae` "Volcano genome-wide") — Data-Fetch uploads with no creating tool job. Extracting a workflow seeded by exactly those two HDAs (`POST /api/workflows/extract`, `hda_ids=[…]`) yields workflow `4b187121143038ff`: **two input nodes, zero tools** — the literal degenerate result. The 5-step "after" is the on-graph extract `0a248a1f62a0cc04`. So the before/after pair is a real, reproducible artifact of the same analysis, not a mock-up. (This also independently confirms the paper's claim: the off-graph notebook seeds 2 dead inputs / 0 tools; the numbers in the draft match.)

## P2 — partial

| TODO item | Status |
|---|---|
| Revision provenance / agent authorship | ✅ `uc1_revision_panel.png` — see caveat below |
| Report continuity (UC1 workflow report) | ⛔ not done — see below |
| PDF renderer composite | ⏭️ skipped (the four existing UC3 PDF shots already cover it; composite is assembly, not capture) |

**Revision panel caveat (important for how you caption it).** The MRSA page `b887d74393f85b6d` has 5 revisions; the panel badges them `(AI)` (= `edit_source="agent"`, 4 of them) and `(Unknown)` (the initial pre-`edit_source` revision). It is clean, real, and on-message for **agent authorship** (evidence layer 4) — an entire scientific notebook authored across four agent edits. BUT it does **not** show the `user` + `agent` + `restore` mix the TODO asked for ideally, and it is **not** the UC2 GATA1-null interpretive correction. I checked the candidates:
- No real UC page carries all three `edit_source` kinds. The UC pages are either all-agent (MRSA: 4×agent) or single-revision (the "clean, extractable" UC2/UC3 finals).
- The full `user`/`agent`/`restore` variety exists only in **synthetic test pages** (e.g. `c385e49b9fe1853c` alternates `null`/`agent`; the "Restore Test" page `417e33144b294c21` is where restore-source revisions live) — those have no scientific content, so they'd make a weaker figure.
- The GATA1-null correction is described in `usecases/UC2_DEBRIEF*.md` but is not isolated as a single labeled revision on a clean UC2 page in this server state.

If you want the *ideal* figure (a real scientific revision showing user→agent→restore), it would need to be staged deliberately: take a clean UC2 page, make a user edit that states the GATA1 claim, an agent edit that corrects it to the GATA1-null framing, then a restore — capturing the panel after. I did not stage this (it would manufacture provenance for a figure). Flagging the decision for you.

**Report continuity (not done) — exact procedure if you want it.** The claim is "the notebook narrative travels into the extracted workflow's report." The extracted workflows here were produced with the page carried in as the report (`from_page_id`), so the report exists on the workflow. Viewing/screenshotting it cleanly needs either the workflow-report editor or an invocation report render — neither is a one-click read-only view in this build, so I left it. Lowest-friction path: run an invocation of `33b43b4e7093c91f`, then `GET /api/invocations/{id}/report` (or `.pdf`) and screenshot the rendered report beside `uc1_notebook_full.png`.

## Quality re-captures — NOT done (procedure documented)

The TODO asks to redo the `uc*_notebook_full.png` shots so the **actual UC history** (not an empty "Unnamed history") shows in the right panel. I did not complete these because the page editor's right-hand panel shows the **current user history**, not the page's source history — so it requires switching the session's current history first, which the dev client does via UI, not a clean REST call. Procedure to finish:
1. In the client, switch current history to the UC history (UC1 `48916fac0de9a85d`, UC2 `96d9e11f37f34b29`, UC3 `241d84796a24640a`) via the history switcher.
2. Open the notebook: `/pages/editor?id=<page>` (UC1 `eafb646da3b7aac5`, UC2 `42a2c611109e5ed3`, UC3 `a7e42332dab8f5db`).
3. Capture a full-app shot (proves it lives in Galaxy, history populated) **and** a content-cropped shot (clean figure body). The content body element is the MarkdownEditor preview; crop to it for the clean version.

The existing `uc*_notebook_full.png` remain usable in the meantime (the only defect is the empty history panel on the right edge).

## Notes / gotchas for the next capturer
- Navigating **away from the Workflow Editor** fires a `beforeunload` dialog (unsaved-changes guard) — the `browser_navigate` call times out; accept the dialog with `browser_handle_dialog`.
- The **activity bar floats over the left edge of `.workflow-canvas`**; when cropping, clamp the left edge to ≥ ~44px (image-coords) or zoom out once so the leftmost node clears it.
- Large graphs (29/34 steps) overflow the canvas at default fit — click **Zoom Out** once or twice, then re-measure the node bounding box before cropping.
- Heatmap datasets are 2000×2000 PNGs; grab them at full res via `GET /api/datasets/<id>/display?to_ext=png` and downscale, rather than screenshotting the rendered `<img>`. (The matplotlib title "…by mobility context" is clipped at the right edge in the *source* PNG — present in both heatmaps, not a capture artifact.)
