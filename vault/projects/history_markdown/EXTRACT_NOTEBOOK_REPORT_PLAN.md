# Notebook Extraction — Carrying the Markdown into the Workflow Report

> **STATUS: IMPLEMENTED** (branch `extract_next`). All of §1–§5 landed; tests green.
> Debrief: `EXTRACT_NOTEBOOK_REPORT_DEBRIEF.md`. Where the implementation diverged from
> the plan, the plan sections below are annotated inline with **DONE** / **NOTE**.
>
> - §1 label index → `workflow/extract.py`: `ExtractionLabelIndex`,
>   `extract_steps_by_ids_with_index`, `extract_workflow_by_ids_with_index`; `_WorkItem.icj_id`.
> - §1 reconcile + §2 rewrite orchestration → new `managers/workflow_extraction_report.py`
>   (`build_report_for_page`, `reconcile_report_labels`).
> - §2 rewriter → `managers/markdown_util.py`: `_ReportLabelRewriter` +
>   `rewrite_page_markdown_to_workflow_report`.
> - §3 wiring → `schema/workflows.py` (`from_page_id`, `report_title`, `report_warnings`),
>   `services/workflows.py::extract_by_ids` (+ `_load_report_page` gating).
> - §4 frontend → `WorkflowExtractionForm.vue` (+`schema.ts` hand-edited, +15 lines).
> - §5 tests → `test/unit/workflows/test_extract_report.py` (17),
>   `WorkflowExtractionForm.test.ts` (+2), `test_workflow_extraction.py::TestNotebookWorkflowExtractionReport` (3 live API).
> - **NOTE (atomicity, decided leave-as-is):** report is built *after* the workflow is
>   finalized/committed (reuses `extract_workflow_by_ids_with_index`). A rewrite failure would
>   leave a report-less workflow — accepted: reconcile guarantees resolution and `validate_galaxy_markdown` is a defensive backstop.
> - **Selenium (§5 last row) NOT yet done.**

## Where we are

The prior PR (`EXTRACT_NOTEBOOK_PR.md`) made `Extract Workflow` from a notebook
*seed the form*: it walks the page's referenced outputs/jobs back through provenance
and pre-checks the producing subgraph (`seeded`), pre-stars the displayed outputs
(`exposed`), and flags job-referenced uploads (`seed_warning`). It extracts the right
**inputs / outputs / steps** — but throws the notebook's prose and directives away.

Commit `30359cc` (step labels) added the missing piece: extracted **tool steps can now
carry stable labels** (`step_labels` on `WorkflowExtractionByIdsPayload`), alongside the
input labels (`dataset_names`) and output labels (`output_labels`) that already existed.

**This plan**: when extracting from a notebook, also carry the page's markdown into the
new workflow as its **report** (`workflow.reports_config["markdown"]`), rewriting every
internal-ID directive into a portable workflow-relative label directive.

```
page markdown (internal ids)            workflow report markdown (labels)
------------------------------          ----------------------------------
history_dataset_display(                history_dataset_display(
    history_dataset_id=1234)      -->       output="aligned_reads")
job_metrics(job_id=987)           -->   job_metrics(step="bwa_mem")
history_dataset_collection_display(     history_dataset_collection_display(
    history_dataset_collection_id=55)-->    input="samples")
```

The labels on the right are exactly the ones extraction already assigns to inputs
(`step.label`), workflow outputs (`workflow_output.label`), and tool steps
(`step.label`). The rewrite is the **inverse** of `resolve_invocation_markdown()`
(`markdown_util.py:1271`), which turns `output=`/`input=`/`step=` back into instance ids
at invocation time. We're moving the page from the *internal* representation to the
*workflow-relative* representation — the same direction the workflow-report authoring UI
produces by hand.

---

## The shape of the change

1. **`from_page_id` on the extract-by-ids payload.** When present, the service fetches
   the page's internal markdown, rewrites it against the labels the extraction just
   assigned, validates it, and stores it as the workflow's report.

2. **A label index out of `extract_steps_by_ids`.** Extraction already builds the
   content-key → `(step, output_name)` map it needs to wire connections. Return it (plus
   job-id/icj-id → step) so the rewriter can resolve a referenced id to its label
   without re-deriving anything.

3. **A directive-rewrite handler** in `markdown_util.py`, a sibling of
   `_ReferencedContentCollector`, that reuses the same `GalaxyInternalMarkdownDirectiveHandler`
   taxonomy: each `handle_*` resolves the directive's object → normalizes → looks up its
   label → returns the rewritten directive line. Unresolvable references are dropped with
   a warning rather than leaking an internal id into a portable document.

Nothing new is invented for resolution, normalization, or the directive walk — each
already exists and is reused.

---

## 1. Backend: the label index

`extract_steps_by_ids` (`workflow/extract.py:641`) already maintains
`id_to_output_pair: dict[("dataset"|"collection", original_id) -> (WorkflowStep, output_name)]`
— the connection-wiring map. It also applies labels: input `step.label` (from
`dataset_names`), `step.label` for tool steps (from `step_labels`), and
`create_or_update_workflow_output(label=...)` for exposed outputs (from `output_labels`).

Add a typed return so the constructed `WorkflowStep` objects are the single source of
truth for labels (avoid rebuilding a parallel label map from raw payload hints, which
would re-derive the input-name dedup and drift):

```python
@dataclass(frozen=True)
class ExtractionLabelIndex:
    content_to_step: dict[OutputLabelKey, tuple[WorkflowStep, str]]  # reuse id_to_output_pair
    job_to_step: dict[int, WorkflowStep]
    icj_to_step: dict[int, WorkflowStep]
```

- `content_to_step` **is** `id_to_output_pair` (already keyed by *original* id) — just
  returned.
- `job_to_step` / `icj_to_step`: populated in the work-item loop. Today `_WorkItem` drops
  the ICJ id after the sort; thread it through (add `icj_id: Optional[int]`) so an
  `implicit_collection_jobs_id` directive resolves to the same step a constituent
  `job_id` directive would.

Keep `extract_steps_by_ids` returning just `steps` for existing callers; add
`extract_steps_by_ids_with_labels(...) -> (steps, ExtractionLabelIndex)` (or a keyword
flag) used by the report path. `extract_workflow_by_ids` gains an internal hand-off of the
index when a report is requested.

### Resolving a referenced object to a label

Given a resolved object from the directive walk:

| Directive object | Normalize | Look up | Rewrite to |
|---|---|---|---|
| HDA | `("hda", _original_hda(hda).id)` | `content_to_step` | input step → `input="{step.label}"`; tool output → workflow-output label for `output_name` → `output="{label}"` |
| HDCA | `("hdca", _original_hdca(hdca).id)` | `content_to_step` | same input/output split |
| Job | fold to ICJ via `implicit_collection_jobs_association`, else plain | `icj_to_step` / `job_to_step` | `step="{step.label}"` |

The HDA/HDCA normalization mirrors `normalize_output_label_key` (`extract.py:586`); the
job→ICJ fold mirrors `_ReferencedContentCollector._record_job` (`markdown_util.py:782`).
Whether content is an **input** or an **output** ref is read off `step.type`
(`data_input`/`data_collection_input` → input; `tool` → output).

### Auto-label reconcile (decided: Q1 = auto-label)

The notebook's seeding closure guarantees every referenced item is *in* the extracted
subgraph (a referenced output is produced by a seeded step; a referenced input is a seeded
input row). So an item can be **in the subgraph but unlabeled** — a displayed tool output
the user never starred, or a step the user never named. Rather than drop the notebook's own
content, the report path **auto-labels** so the rewrite always resolves.

After steps are finalized, run a reconcile pass driven by the page's referenced ids
(`referenced_content_ids`, the same call `summary_from_page` uses):

- **referenced tool output** (HDA/HDCA) with no `workflow_output` label → call
  `create_or_update_workflow_output(output_name, label=<generated>)` on its step, exposing
  it as a workflow output. (This *does* add a workflow output the user didn't explicitly
  star — that is the accepted cost of a complete report; it only ever fires for content the
  notebook itself displays.)
- **referenced input** with `step.label is None` (lost to the input-name dedup) → assign a
  generated label.
- **referenced step** (`job_id`/`icj`) with `step.label is None` → assign a generated label.

**Label generation** reuses the existing `suggested_name`/`suggested_name_source` the
summary already computes (renamed → rendered-label → bare-label → port-name), falling back
to tool name; deduped against the shared step-label/output-label namespace with a numeric
suffix, and run through the same raw-reject validation as user labels
(`_validate_extraction_labels`). A truly unresolvable reference (outside the subgraph —
should not occur given seeding) is the only remaining drop-and-warn case, kept as a
defensive guard so a bare `history_dataset_id=` can never reach a portable report.

---

## 2. Backend: the rewrite handler (`markdown_util.py`)

A new `_ReportLabelRewriter(GalaxyInternalMarkdownDirectiveHandler)`, built exactly like
`_ReferencedContentCollector` (the directive-walk dispatch already resolves and
access-checks the HDA/HDCA/job before calling `handle_*`, and uses each handler's return
value as the replacement line — see `_walk_directives` / `_remap`, lines 262-409):

```python
class _ReportLabelRewriter(GalaxyInternalMarkdownDirectiveHandler):
    def __init__(self, label_index, security):
        self.index = label_index
        self.warnings: list[str] = []

    def _dataset_ref(self, container, hda):
        # After the auto-label reconcile (§1) every referenced item is labeled,
        # so ref is None only for a defensive out-of-subgraph case -> drop + warn.
        ref = self.index.content_ref(("hda", _original_hda(hda).id))  # -> ("input"|"output", label) | None
        if ref is None:
            self.warnings.append(...); return ("", False)   # defensive drop
        kind, label = ref
        return (f'{container}({kind}="{label}")\n', False)

    handle_dataset_display = handle_dataset_as_table = ... = _dataset_ref-bound
    def handle_dataset_collection_display(self, line, hdca): ...
    def _job_ref(self, container, job): ...   # -> step="label"
    handle_tool_stdout = handle_tool_stderr = handle_job_metrics = handle_job_parameters = _job_ref-bound
    # every other handler: passthrough (return the original line)
```

Public entry:

```python
def rewrite_page_markdown_to_workflow_report(trans, internal_markdown, label_index)
    -> tuple[str, list[str]]:
    rewriter = _ReportLabelRewriter(label_index, trans.security)
    markdown = rewriter._walk_directives(trans, internal_markdown)   # block-directive pass
    return markdown, rewriter.warnings
```

Mirror the collector's scope: **block (fenced) directives only** for V1 — `_walk_directives`
is the block pass; inline `${galaxy ...}` directives are out of scope here exactly as they
are for the seeding collector (open question Q3).

Non-content prose (headings, text, vega, etc.) passes through untouched: the rewrite only
touches the four ID-bearing directive families.

Validate the result with `validate_galaxy_markdown(markdown, internal=False)` before
storing, so a malformed rewrite fails loudly at extraction rather than at report render.

---

## 3. Backend: wiring it into extraction

`schema/workflows.py` — `WorkflowExtractionByIdsPayload`:

```python
from_page_id: Optional[DecodedDatabaseIdField] = None   # build a report from this notebook page
report_title: Optional[str] = None                       # defaults to workflow_name
```

`services/workflows.py::extract_by_ids`:

1. existing `_validate_extract_by_ids_payload` + `extract_workflow_by_ids` (now returning
   the label index when `from_page_id` is set).
2. if `from_page_id`:
   - load the page; **gate** like the summary endpoint — `400` if the page has no history,
     `403` if the user can't access it (reuse `summary_from_page`'s access checks /
     `PagesService`).
   - `content = page.latest_revision.content` (same fetch as `summary_from_page`,
     `workflow_extraction_summary.py:486`).
   - `markdown, warnings = rewrite_page_markdown_to_workflow_report(trans, content, index)`.
   - `stored.latest_workflow.reports_config = {"markdown": markdown, "title": report_title or workflow_name}`
     (same dict shape `generators/markdown.py:34-38` reads; same column set on import at
     `managers/workflows.py:863`).
   - return warnings in the result (extend `WorkflowExtractionResult` with `report_warnings`).

The report is generated **after** steps are finalized so it reads the labels actually
assigned (post-dedup, post-collision-raise).

---

## 4. Frontend

Minimal — the form already gathers `dataset_names` / `output_labels` / `step_labels` and
knows `fromPageId` (`WorkflowExtractionForm.vue:49`):

- Pass `from_page_id: fromPageId` (and optional `report_title`) in the extract-by-ids
  payload when extracting from a page.
- Surface `report_warnings` from the result (defensive/out-of-subgraph drops only, now
  rare given auto-label) as a toast / inline list.
- Auto-labeling lives in the backend, so the form needs no label-completeness guarantee.
  Still nice-to-have: pre-fill output/step labels for `exposed`/`seeded` rows from
  `suggested_name` so the *user-visible* workflow output labels match what the report will
  generate (otherwise the backend silently names auto-exposed outputs the user never saw).

`schema.ts` regen picks up the two new payload fields and `report_warnings`.

---

## 5. Testing strategy

Same layered discipline as the prior PR — test each concern at the cheapest faithful layer.

| Layer | Concern | Tests |
|---|---|---|
| **Rewriter** (unit) | directive → label substitution, normalization, job→ICJ fold, defensive drop | `TestReportLabelRewriter`: HDA→`output=`, HDCA→`input=`, `job_metrics`→`step=`, `implicit_collection_jobs_id`→`step=`, copied HDA normalized to original's label, out-of-subgraph ref → dropped + warning, prose/vega passthrough, multi-directive page |
| **Auto-label reconcile** (unit) | referenced-but-unlabeled item gets exposed/labeled; generated labels unique vs namespace | displayed-but-unstarred output → auto-exposed with `suggested_name`; unnamed referenced step → auto-labeled; collision with an existing label → suffixed |
| **Label index** (unit) | extraction returns correct content/job/icj → step+label mapping | extend extract unit tests: input label, exposed-output label, step label, ICJ step label all reachable by original id |
| **End-to-end report** (API) | real server: extract-from-page produces a report whose directives resolve | extend `TestNotebookWorkflowExtractionSummary` → `TestNotebookWorkflowExtractionReport`: extract, read back `reports_config.markdown`, assert `output=`/`input=`/`step=` present and no `history_dataset_id=`; **then run the workflow and render the report** (or `resolve_invocation_markdown`) to prove the labels resolve round-trip; map-over page → `step=` on the ICJ label; gating `400`/`403` |
| **Payload wiring** (vitest) | form sends `from_page_id`; surfaces `report_warnings` | `WorkflowExtractionForm` `from_page` block |
| **Wiring** (Selenium) | notebook → extract → workflow has a report tab/markdown | extend `TestNotebookWorkflowExtraction`: after extract, open the workflow report and assert the page's heading + a resolved embed render |

Red-to-green: write the rewriter unit tests against a hand-built label index first; then
the API round-trip (extract → render report) which is the real proof the labels resolve.

---

## 6. Reuse audit (what we are *not* building)

- **Directive walk / access checks / object resolution** — reuse
  `GalaxyInternalMarkdownDirectiveHandler._walk_directives`; the rewriter is a handler
  subclass exactly like `_ReferencedContentCollector`.
- **Label assignment** — already done by `extract_steps_by_ids`; we only *return* the map.
- **Normalization** (`_original_hda/_hdca`) and **job→ICJ fold** — reuse from extract.py
  and the collector.
- **Report storage + render** — `reports_config` dict + `MarkdownWorkflowMarkdownReportGeneratorPlugin`
  already exist; we only populate the dict.
- **Label→id resolution at run time** — `resolve_invocation_markdown` already does the
  inverse; our output is precisely its input. (Good regression target: rewrite then
  resolve should land back on equivalent instance directives.)

---

## Unresolved questions

- **Q1 — Unlabeled referenced item — DECIDED: auto-label.** Backend reconcile pass (§1)
  auto-exposes/auto-labels any referenced-but-unlabeled item from `suggested_name` so the
  report is always complete. Accepted cost: extraction may add workflow outputs the user
  didn't explicitly star (only ever for content the notebook displays). Remaining sub-question:
  should auto-exposed outputs be visibly reflected back in the form before submit (§4), or
  is silent backend naming fine for V1?
- **Q2 — Field name — DECIDED: `from_page_id`.** Implemented as the payload field; the client
  query param stays `from_page` (the form maps one to the other).
- **Q3 — Inline `${galaxy ...}` directives — V1: out of scope (block-only).** Matches the
  seeding collector. Still open whether to handle inline later via the embedded-container pass.
- **Q4 — Title source — V1: `report_title` payload → `workflow_name` fallback.** Page-title
  fallback not wired; still open.
- **Q5 — Separate endpoint vs. payload flag — DONE: payload flag.** `extract-by-ids` gained
  `from_page_id`; `_load_report_page` owns the gating (400 no-history / 403 no-history-access).
- **Q6 — Non-rewritable directives — V1: drop + warn.** Id-bearing non-portable directives
  (`history_link`, `workflow_display`/`image`/`license`, `invocation_*`) are dropped with a
  `report_warnings` entry; id-less directives pass through. Open whether any deserve richer handling.
- **Sub-question (open):** reflect auto-exposed outputs back in the form before submit, or leave
  silent backend naming for V1 (currently silent).
