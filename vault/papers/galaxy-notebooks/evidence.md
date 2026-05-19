# Evidence

## Implemented System

- History-attached Pages via `Page.history_id`.
- Revision provenance via `PageRevision.edit_source`.
- Page-scoped chat via `ChatExchange.page_id`.
- History-aware notebook assistant tools.
- Shared editor, diff, revision, and API paths for notebooks and standalone reports.

## Prototype Evidence Needed

- Notebook-driven workflow extraction demo for GCC.
- Graph selection or backward-closure prototype from notebook-referenced outputs.
- Extracted workflow report seeded from notebook content.
- Clear before/after comparison against flat history-list extraction.

## Quantitative/Concrete Claims To Gather

- Test counts by layer.
- Number of routes/API endpoints touched.
- Small demo history size: number of datasets, jobs, notebook revisions, extracted workflow steps.
- Time or interaction comparison is optional; a high-fidelity demo may be enough for a preprint.

## Risks

- If extraction is too rough, phrase it as prototype evidence and keep the core paper grounded in the durable notebook/revision model.
- If chat distracts reviewers, move chat details later and lead with notebook-to-graph-to-workflow.
