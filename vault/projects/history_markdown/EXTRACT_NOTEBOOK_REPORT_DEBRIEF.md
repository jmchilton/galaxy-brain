# Notebook Extraction Report — Implementation Debrief

Implements `EXTRACT_NOTEBOOK_REPORT_PLAN.md`. Carries a notebook page's markdown into the
extracted workflow as its report (`workflow.reports_config["markdown"]`), rewriting every
internal-id directive into a portable workflow-relative label directive.

## What shipped

**Backend**

- `workflow/extract.py`
  - `ExtractionLabelIndex` dataclass (`content_to_step` = the existing `id_to_output_pair`,
    plus `job_to_step` / `icj_to_step`) with `content_label_arg` / `job_label_arg` resolution.
    Holds live `WorkflowStep`s so labels assigned by reconcile are read back.
  - `_WorkItem` gained `icj_id`; the work-item loop now records job/ICJ → step.
  - `extract_steps_by_ids` split into a shared impl + thin wrappers; added
    `extract_steps_by_ids_with_index` and `extract_workflow_by_ids_with_index`. Old
    signatures preserved (delegate through).
- `managers/markdown_util.py` — `_ReportLabelRewriter(GalaxyInternalMarkdownDirectiveHandler)`,
  sibling of `_ReferencedContentCollector`. Content → `input=`/`output=`, job → `step=`
  (regex sub of the id token). Id-less directives pass through; id-bearing non-portable
  directives (history/workflow/invocation links) drop with a warning. Public
  `rewrite_page_markdown_to_workflow_report` runs the block walk + `validate_galaxy_markdown`.
- `managers/workflow_extraction_report.py` (new) — `build_report_for_page` +
  `reconcile_report_labels`. Drives off `referenced_content_ids` (same call the summary uses);
  auto-exposes referenced-but-unstarred tool outputs and auto-labels unnamed inputs/steps,
  generating labels from `suggested_output_name` deduped against the shared namespace.
- `schema/workflows.py` — payload `from_page_id` + `report_title`; result `report_warnings`.
- `services/workflows.py` — `extract_by_ids` loads+gates the page (mirrors the summary
  endpoint: 400 no-history, 403 no-history-access), extracts with the index, builds the
  report, stores `reports_config`, returns warnings.

**Frontend**

- `WorkflowExtractionForm.vue` sends `from_page_id` from the `from_page` query param; surfaces
  `report_warnings` as a warning toast.
- `schema.ts` — three fields hand-added in existing style (full regen reformatted the whole
  file under a different prettier printWidth; reverted to keep the diff to +15 lines).

## Tests (all green)

- `test/unit/workflows/test_extract_report.py` — 17 unit tests: rewriter mechanics
  (substitution/drop/passthrough), index resolution (input/output/step, job→ICJ fold, copy
  normalization), reconcile (expose unstarred, label unnamed, dedup suffixing).
- `WorkflowExtractionForm.test.ts` — +2 (sends `from_page_id`; warning toast). 45 pass.
- `lib/galaxy_test/api/test_workflow_extraction.py::TestNotebookWorkflowExtractionReport` —
  3 live API tests: output+job rewrite (asserts `output=`/`step=` present, no `history_dataset_id=`/
  `job_id=`, and the `output=` label is a real workflow output), ICJ job directive → `step=`,
  400 on page without history. All pass.

## Decisions / notes

- Q1 = auto-label (per user): reconcile may add workflow outputs the user didn't star, but only
  for content the notebook displays. Drop+warn survives only as a defensive out-of-subgraph guard.
- Report is built AFTER the workflow is finalized/committed (reuses
  `extract_workflow_by_ids_with_index`). A rewrite failure would leave a report-less workflow —
  theoretical given reconcile guarantees resolution + the defensive validate. Could move report
  building before finalize for atomicity if desired (would expose `_finalize_workflow`).
- Block (fenced) directives only, matching the seeding collector (inline `${galaxy ...}` out of
  scope — Q3).

## Still open (from plan)

- Q3 inline directives, Q4 page-title as report title, Q5 separate endpoint vs payload flag,
  Q6 richer handling of non-portable directives (currently drop+warn). Sub-question: reflect
  auto-exposed outputs back in the form before submit.
- Selenium coverage (open workflow report tab after extract) not yet added.
