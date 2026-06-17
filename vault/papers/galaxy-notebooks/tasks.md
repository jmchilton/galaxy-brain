# Manuscript Polish TODO

Working list of things needed to lift `manuscript.md` from second-pass draft to submission-ready. Keep this file honest: if a claim is not ready, park the work here instead of bending the prose around missing evidence.

## Highest-Leverage Work Still Ahead

Extraction itself is delivered and evidenced by three real, paper-worthy analyses (S. aureus mobile resistome PRJDB8599, TAL1 differential ChIP, differential ATAC-seq). The "prove extraction with a worked vignette" and "find a domain contributor" goals are closed, and there is **no remaining required build work** for the paper.

### Optional enhancement: graph confirmation / prune view

The manuscript has been softened so it no longer depends on this: the Extraction section now describes a three-step flow (identify → backward walk → extract) and frames a read-only, selectable confirm/prune graph view as a natural human-in-the-loop *addition*, explicitly noting the reported results came from page-based extraction. So the draft is honest and complete whether or not this view ever ships. This item is **entirely optional**.

How it would slightly strengthen the paper:

- Turns the human-in-the-loop claim from a described affordance into a *shown* one — a reviewer skeptical of "agent/automated extraction" sees an explicit human checkpoint before a workflow is created.
- Gives a concrete answer to "what if the backward walk over-captures?" — a prune action visibly removes an unwanted branch (e.g. the optional Bakta enrichment in the mobile-resistome case, already noted as outside the 14-step core).
- Adds one selection/confirmation figure that visually distinguishes this path from free-text workflow synthesis.

Where it would slot in (if built):

- **Extraction section** — restore step 3 to the flow (identify → walk → *confirm/prune* → extract) and drop the "page-based, no confirm view" caveat sentence.
- **Implementation → Frontend** — one paragraph describing the read-only selectable graph view (distinct from the Workflow Editor).
- **Figures** — a new figure or a panel on Figure 3 showing a confirm/prune action; `figures.md` Figure 3 already sketches "graph confirmation" as a panel.
- **Table 1 / Evidence** — optionally a "pruned nodes" data point per vignette (e.g. Bakta pruned in the mobile-resistome case), which the current table omits.

- [ ] (optional) Build the read-only selectable graph confirmation view and capture a confirm/prune figure; then apply the four slot-in edits above.

Already delivered (kept for record):

- [x] Demo histories with extractable structure (collection map-over, on-graph figures).
- [x] Polished notebooks with embedded references to meaningful outputs.
- [x] Backward provenance closure captured from notebook-referenced artifacts.
- [x] Workflow extracted with the notebook narrative carried into the seeded report.
- [x] Implemented-vs-prototype decision made; manuscript language normalized to "implemented."
- [x] Agent authorship delivered via the notebook MCP (`edit_source="agent"`); chat/agents kept as an authoring path, no model-quality claims.
- [x] Terminology normalized against `glossary.md` (Galaxy Notebook / Report / Page; MCP).

## Evidence and Numbers to Fill In

- [ ] Exact Galaxy PR number(s), commit range, and release target for Galaxy Notebooks.
- [ ] Current Selenium E2E test count and behavior list.
- [ ] Current API integration test count and behavior list.
- [ ] Current agent unit/history-tool/chat-manager test counts.
- [ ] Current Vitest component/store/diff test counts.
- [ ] Number of notebook routes and API endpoints.
- [ ] Demo history size: datasets, collections, jobs, notebook revisions, and extracted workflow steps.
- [ ] Agent-authorship demo: number of proposed edits, accepted/rejected sections, and resulting revision records.
- [ ] Workflow extraction demo: selected artifacts, recovered graph nodes/edges, pruned nodes, final workflow steps.

## Figures

Canonical set is the four figures referenced in `manuscript.md`; detailed spec and asset inventory live in `figures.md`, archived capture report in `old/FIGURE_CAPTURE_REPORT.md`.

- [x] Figure 1 — notebook beside extracted workflow. Panels captured + embedded (`uc1_notebook_full.png` + `uc1_fig1_workflow_graph.png`). Remaining: side-by-side layout in final art.
- [x] Figure 2 — embedded-output exemplar (two heatmaps). Both captured + embedded (`uc1_fig1_heatmap.png` + `uc1_fig1_heatmap2.png`).
- [x] Figure 3 — extraction outcomes across vignettes. Panels captured + embedded (ATAC notebook/results/13-step workflow; ChIP caller/comparator). Remaining: panel layout + the dashed-seam arrow in final art.
- [x] Figure 4 — agent authorship is attributable. `uc1_revision_panel.png` captured, promoted to a referenced figure, and embedded (honest caption: agent revisions only).
- [x] Capture pass complete and panels embedded in the manuscript (served via `site/public/figures/`).

Still open from the capture pass (all optional / polish):

- [ ] Report-continuity capture (notebook narrative → extracted workflow report) — procedure in `old/FIGURE_CAPTURE_REPORT.md`.
- [x] Quality re-capture of `uc1_notebook_full.png` with the real UC history loaded — done (UC1 history active in right panel). UC2/UC3 notebook fulls still uncaptured and would need the same fix, but neither is referenced in the manuscript.
- [x] PDF-renderer mechanism dropped from the manuscript: ATAC-seq figures are now presented as on-graph image outputs (PDF→PNG via in-graph `graphicsmagick_image_convert` → `__EXTRACT_DATASET__`), extraction is a 13-step workflow, and the renderer-extension/`history_dataset_as_pdf`/PyMuPDF discussion and comparison figures were removed.
- [x] Promote the **agent-authorship** revision panel → now Figure 4 (honest caption: 4 agent revisions; no synthetic provenance).
- [ ] Data-model and authoring-modes diagrams (no assets; would need drawing).

## Citations and Literature

- [ ] Verify foundational Galaxy citations: original Galaxy paper, 2018 update if used, 2024 update.
- [ ] Verify computational notebook citations: Jupyter, notebook pain/reproducibility studies, literate programming.
- [ ] Add workflow/report/provenance citations relevant to narrative plus executable workflows.
- [ ] Add reproducible research practice citations without overloading the introduction.
- [ ] Add AI-agent bioinformatics citations cautiously; prefer a short paragraph and avoid unstable claims.
- [ ] Convert placeholder inline citations in `manuscript.md` to the final reference keys.
- [ ] Decide whether to use author-year prose references only or add BibTeX alongside notes in `references.md`.
- [ ] Find a stronger source for Galaxy workflow reports than GTN/docs, or explicitly mark those citations as documentation.
- [ ] Find a Galaxy-specific citation or implementation reference for history-to-workflow extraction; otherwise keep YesWorkflow/noWorkflow as conceptual neighbors only.
- [ ] Add electronic/computational lab notebook literature outside Jupyter/R Markdown if it gives better language for history-attached narrative.
- [ ] Find empirical evidence that poor methods/reporting communication blocks reuse of bioinformatics analyses.

## Manuscript Hygiene

- [x] Tighten the abstract after evidence is known; current abstract is a broad resource abstract.
- [ ] Add a more concrete final paragraph to the Introduction once the vignette is selected.
- [x] Replace "Evaluation Plan" with "Evaluation" once figures and demo data exist. (Done as "Evidence" — covers both the delivered layers and the still-pending ones.)
- [ ] Decide whether "Methods" stays separate or folds into Implementation for the target venue.
- [ ] Add author list, affiliations, ORCIDs, corresponding author, acknowledgements, funding, competing interests, and data availability.
- [ ] Replace all `[TODO]` and "must be verified" language before external circulation.
- [ ] Run a style pass for active voice and remove architecture-document residue.
- [ ] Re-confirm Supporting Information artifacts (recipes, `.ga` workflows, tool-install YAMLs) against the merged Galaxy release and trim to the target venue's length limit. (Removed the "will be re-confirmed … before submission" hedge from the SI section.)
- [ ] Decide venue framing — full resource claim vs. narrower application-note. Manuscript now asserts the resource claim outright, with breadth as future work; the "application-note fallback" hedge was removed from the Discussion.

## Honest Risks in the Current Draft

- [ ] The implemented notebook system and the notebook-driven extraction story are at different maturity levels. Do not imply both are equally complete until the extraction demo is real.
- [ ] A reviewer may see "notebooks" and expect executable Jupyter-like cells. The Introduction and Discussion need to make the execution/document separation explicit.
- [ ] A reviewer may see "agent" and expect an AI evaluation. Keep the agent claim scoped to authoring provenance and reviewable document output.
- [ ] The unified Page model is elegant but not itself a publishable contribution. Keep it in Implementation, not the abstract's center of gravity.
- [ ] Embedded artifact references support reproducible communication only if identifier stability and sharing semantics are clear. Confirm behavior under history sharing, import, and workflow extraction.
- [x] PDF live-view/baked-view mismatch no longer a manuscript concern: the in-core PDF renderer extension was dropped in favor of presenting figures as on-graph image outputs (PDF→PNG via an in-graph conversion step). No PDF rendering claim remains to scope.
