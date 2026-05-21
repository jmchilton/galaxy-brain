# Manuscript Polish TODO

Working list of things needed to lift `manuscript.md` from second-pass draft to submission-ready. Keep this file honest: if a claim is not ready, park the work here instead of bending the prose around missing evidence.

## Highest-Leverage Work Still Ahead

### Axis 1 - Prove the notebook-driven extraction story with one worked vignette

The manuscript's strongest claim is that the notebook can guide workflow extraction and seed a workflow report. The architecture is plausible, but the current evidence is not yet paper-grade. This needs one end-to-end vignette that a reviewer can inspect.

- [ ] Choose a demo history with enough structure to make graph extraction meaningful, ideally 6-12 jobs and at least one collection.
- [ ] Write a polished Galaxy Notebook for that history with embedded references to the meaningful outputs.
- [ ] Capture the backward provenance closure from notebook-referenced artifacts.
- [ ] Show the graph confirmation step, including at least one prune or confirm action.
- [ ] Extract the workflow and show the notebook narrative carried into the workflow report.
- [ ] Decide whether this is implemented evidence or prototype evidence, then normalize manuscript language accordingly.

### Axis 2 - Add a real scientific vignette, not only a toy history

A synthetic screencast proves mechanics but not value. A real lab or training analysis would materially strengthen a Genome Research / Methods framing.

- [ ] Identify a PhD contributor or domain collaborator with an analysis history suitable for documentation.
- [ ] Convert that analysis into a notebook with embedded outputs and a clear interpretation section.
- [ ] Record what the notebook adds beyond the raw history: selected outputs, rationale, result interpretation, and report continuity.
- [ ] Add a short vignette subsection or figure panel.
- [ ] If this cannot land, mark it as a limitation and retreat the target framing if needed.

### Axis 3 - Keep chat in its lane

The old conference abstract leaned hard on agents. The paper should make agents a strong use case but not the central contribution.

- [ ] Sweep manuscript for places where "AI", "agent", or "chat" carries the main claim.
- [ ] Rephrase those passages so the notebook/revision/artifact layer carries the claim.
- [ ] Keep one crisp agent-authorship vignette showing `edit_source="agent"` and reviewable section-level diffs.
- [ ] Avoid any benchmark-like claims about model quality unless actual evaluation exists.

### Axis 4 - Terminology normalization

The source docs use "History Notebooks", "history pages", "Pages", "Reports", and "Galaxy Notebooks". The paper needs one vocabulary.

- [ ] Use `glossary.md` as the term source of truth.
- [ ] Replace manuscript uses of "History Notebook" with "Galaxy Notebook" unless quoting old language.
- [ ] Use "Page" only for backend/model/API implementation discussion.
- [ ] Use "Report" only for standalone Pages.
- [ ] Check figures, captions, and abstract for the same terminology.

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

- [ ] Figure 1: Conceptual model - history, notebook, artifact references, provenance graph, extracted workflow, workflow report.
- [ ] Figure 2: UI workflow - history panel entry, notebook editor, embedded dataset directive, rendered preview.
- [ ] Figure 3: Revision provenance - manual edit, agent proposal, accepted section patch, restore.
- [ ] Figure 4: Notebook-driven extraction - referenced output to backward graph closure to confirmed workflow.
- [ ] Figure 5, optional: Unified Page model - Report vs Galaxy Notebook context without exposing too much implementation detail.

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

- [ ] Tighten the abstract after evidence is known; current abstract is a broad resource abstract.
- [ ] Add a more concrete final paragraph to the Introduction once the vignette is selected.
- [ ] Replace "Evaluation Plan" with "Evaluation" once figures and demo data exist.
- [ ] Decide whether "Methods" stays separate or folds into Implementation for the target venue.
- [ ] Add author list, affiliations, ORCIDs, corresponding author, acknowledgements, funding, competing interests, and data availability.
- [ ] Replace all `[TODO]` and "must be verified" language before external circulation.
- [ ] Run a style pass for active voice and remove architecture-document residue.

## Honest Risks in the Current Draft

- [ ] The implemented notebook system and the notebook-driven extraction story are at different maturity levels. Do not imply both are equally complete until the extraction demo is real.
- [ ] A reviewer may see "notebooks" and expect executable Jupyter-like cells. The Introduction and Discussion need to make the execution/document separation explicit.
- [ ] A reviewer may see "agent" and expect an AI evaluation. Keep the agent claim scoped to authoring provenance and reviewable document output.
- [ ] The unified Page model is elegant but not itself a publishable contribution. Keep it in Implementation, not the abstract's center of gravity.
- [ ] Embedded artifact references support reproducible communication only if identifier stability and sharing semantics are clear. Confirm behavior under history sharing, import, and workflow extraction.

## Fallback Trim Plan

If retreating from Genome Research / Resource to Bioinformatics Original Paper:

- [ ] Keep one strong vignette rather than three authoring modes.
- [ ] Collapse implementation detail into a single section.
- [ ] Keep notebook-driven extraction as the main differentiator if the demo is real; otherwise demote it to future work.
- [ ] Shorten related work to one paragraph each on Galaxy, notebooks, workflows, and agents.

If retreating to Application Note:

- [ ] Center the paper on "history-attached Galaxy markdown notebooks with revisions and artifact embeds."
- [ ] Drop most agent detail.
- [ ] Drop notebook-driven extraction unless implemented and screenshot-ready.
- [ ] Use one figure and one concise availability section.
