---
type: research
subtype: design-problem
tags:
  - research/design-problem
  - galaxy/tools
  - galaxy/tools/yaml
  - galaxy/tools/runtime
  - galaxy/tools/testing
  - galaxy/api
  - galaxy/workflows
  - galaxy/models
  - galaxy/testing
status: draft
created: 2026-04-28
revised: 2026-04-28
revision: 1
ai_generated: true
summary: "Rerun, job display, export, workflow extract read legacy JobParameter rows via basic.py, not Job.tool_state — no YAML tool tests prove they agree"
related_notes:
  - "[[PR 19434 - User Defined Tools]]"
  - "[[PR 20935 - Tool Request API]]"
  - "[[PR 21828 - YAML Tool Hardening and Tool State]]"
  - "[[PR 21842 - Tool Execution Migrated to api jobs]]"
  - "[[PR 18758 - Tool Execution Typing and Decomposition]]"
  - "[[Component - YAML Tool Runtime]]"
  - "[[Component - Tool State Specification]]"
  - "[[Component - Tool State Dynamic Models]]"
  - "[[Component - Workflow Extraction]]"
  - "[[Component - Workflow Extraction Models]]"
  - "[[Component - Tool Testing Infrastructure]]"
  - "[[Component - API Tests Tools]]"
  - "[[Component - E2E Tests - Writing]]"
  - "[[Problem - Workflow Test Collection Inputs]]"
---

# YAML Tool Post-Hoc State Divergence

YAML tools now produce a Pydantic-validated structured state at execution time
(`Job.tool_state`, [[PR 21828 - YAML Tool Hardening and Tool State]]), but every
post-hoc reader of "what was run" — tool form rerun, job display UI, history
import/export, workflow extraction — still reconstructs parameters from the
legacy `JobParameter` rows via `params_from_strings` in
`lib/galaxy/tools/parameters/basic.py`. Two parallel representations of the
same job exist, only one is validated, and YAML tools have no end-to-end tests
proving they agree.

---

## Where the divergence lives

The structured-state work (PRs [[PR 20935 - Tool Request API|20935]],
[[PR 21828 - YAML Tool Hardening and Tool State|21828]],
[[PR 21842 - Tool Execution Migrated to api jobs|21842]]) hardened the request
→ runtime path:

```
JobRequest → RequestToolState → RequestInternalToolState
   → RequestInternalDereferencedToolState → JobInternalToolState
   → Job.tool_state (persisted, Pydantic-validated)
   → runtimeify() → tool evaluation
```

`UserToolEvaluator.build_param_dict()` consumes `Job.tool_state` via
`runtimeify` (`lib/galaxy/tools/evaluation.py:1089`,
[[PR 21828 - YAML Tool Hardening and Tool State]]).

But the legacy parameter pipeline still runs in parallel: `Tool.execute()` also
populates the `JobParameter` rows, written via `params_to_strings` from
`basic.py`. Every post-hoc reader uses those rows, never `Job.tool_state`.

### Tool model entry point — legacy only

`Tool.get_param_values(job)` at `lib/galaxy/tools/__init__.py:2656-2662`:

```python
def get_param_values(self, job: Job, ignore_errors: bool = False) -> dict:
    param_dict = job.raw_param_dict()  # JobParameter rows
    return self.params_from_strings(param_dict, ignore_errors=ignore_errors)
```

`Job.raw_param_dict()` (`lib/galaxy/model/__init__.py:2177-2179`) reads from
`self.parameters` — the legacy `JobParameter` table. `params_from_strings`
routes through `basic.py` per-parameter `from_json`/`to_json`. `Job.tool_state`
is never consulted on this path.

### Consumers that go through `get_param_values(job)`

| Consumer | Call site | Purpose |
| --- | --- | --- |
| Job display UI | `lib/galaxy/managers/jobs.py:2073-2078` (`summarize_job_parameters`) | "Tool Parameters" panel on completed jobs |
| Tool form rerun | `lib/galaxy/tools/__init__.py:3093` (`Tool.to_json(job=…)`) | Pre-fill the tool form when rerunning a job |
| Workflow extraction | `lib/galaxy/workflow/extract.py:422-430` (`step_inputs`) | Build workflow steps from past jobs |
| Job export | `lib/galaxy/model/__init__.py:2282-2301` (`Job.to_dict_for_export` via `raw_param_dict()`) | Serialize legacy params alongside `tool_state` |

### Job export/import — both paths written, only legacy read

`Job.to_dict_for_export` (`lib/galaxy/model/__init__.py:2260-2302`) emits **both**
`job_attrs["tool_state"] = self.tool_state` (line 2277) and
`job_attrs["params"] = …` (line 2301, derived from `raw_param_dict`).

On import:

- `_set_job_attributes` (`lib/galaxy/model/store/__init__.py:1681-1701`) restores
  `tool_state` as a column copy.
- `_normalize_job_parameters` + `add_parameter` (`:1344-1347`) rebuild the
  `JobParameter` rows from the legacy `params` dict.

Both representations round-trip, but no consumer cross-checks them, and rerun /
display / extract on the imported job will use only the legacy path.

### Where the structured state *is* used at runtime

- `Job.copy_from` (`lib/galaxy/model/__init__.py:1808`) — copies the column.
- `UserToolEvaluator.build_param_dict` (`lib/galaxy/tools/evaluation.py:1089`)
  via `runtimeify` — first-job evaluation only.
- The legacy `to_cwl` fallback fires when `Job.tool_state` is `None` (same file,
  `:1116`).

That is the entire structured-state read surface today. Everything users see
*after* the job runs comes from `basic.py`.

---

## Why this matters for YAML tools specifically

For XML tools, `basic.py` parameter classes are the source of truth — there is
no other representation, so "what `basic.py` says" and "what ran" cannot
disagree by construction.

For YAML tools, the structured Pydantic models in
`lib/galaxy/tool_util_models/parameters.py` and the runtime conversion in
`lib/galaxy/tools/runtime.py` are the source of truth
([[PR 21828 - YAML Tool Hardening and Tool State]]). `basic.py` is a coercion
layer over a flattened, pipe-delimited job representation, and the YAML
parser's `value_state_representation = "test_case_json"` flatten step at
`lib/galaxy/tool_util/parser/yaml.py:340-342` is one place where structured →
flat conversion already happens for tests. The flatten path was not designed
to be lossless.

Concrete divergence risks:

1. **Collection runtime metadata** — `column_definitions`, `fields`,
   `has_single_item`, `columns` are preserved on the `Job.tool_state` side
   ([[PR 21828 - YAML Tool Hardening and Tool State]] runtime conversion) but
   not represented in the legacy `JobParameter` flat encoding. Rerun, extract,
   and display lose them.
2. **Comma-separated / discriminated collection types** (`list,paired`,
   `paired_or_unpaired`) — round-trip fidelity through `params_from_strings`
   for `data_collection` parameters with comma-separated `collection_type` is
   not exercised in the test suite for YAML tools.
3. **DCE source type** — added by [[PR 21828 - YAML Tool Hardening and Tool State]]
   for subcollection mapping (`{src: "dce", id: …}`). Whether `basic.py`
   `DataCollectionToolParameter.from_json` round-trips DCE references via the
   flat `JobParameter` encoding is not tested for YAML tools.
4. **Tool form rerun** ([[PR 21842 - Tool Execution Migrated to api jobs]])
   submits via `POST /api/jobs` with the new structured request, but its
   pre-fill comes from `Tool.to_json(job=…)` which reconstructs from legacy
   `JobParameter` rows. A rerun is therefore a round-trip
   structured → flat → structured, with no test that the second structured
   form equals the first.

---

## Test coverage gap

Existing API/E2E coverage for these post-hoc paths is XML-tool-only.

### API tests

| File | YAML / user-tool coverage |
| --- | --- |
| `lib/galaxy_test/api/test_workflow_extraction.py` | None — only `class: GalaxyWorkflow` cases with XML tools |
| `lib/galaxy_test/api/test_exports.py` | None for YAML/UserTool jobs |
| `lib/galaxy_test/api/test_tool_execute.py` / `test_tool_execution.py` | Heavy structured-state coverage on the *request* side ([[PR 20935 - Tool Request API]]), nothing on rerun / extract / re-import |

### Selenium / E2E

| File | YAML / user-tool coverage |
| --- | --- |
| `lib/galaxy_test/selenium/test_custom_tools.py` | Create + run only (`test_create_custom_tool`, `test_run_custom_tool`) |
| `lib/galaxy_test/selenium/test_workflow_extraction.py` | XML tools only |
| `lib/galaxy_test/selenium/test_history_export.py` | XML tools only |

The new tool form ([[PR 21842 - Tool Execution Migrated to api jobs]]) consumes
the structured request schema. Whether it correctly *displays* a YAML-tool
rerun pre-fill depends on the legacy `Tool.to_json` path producing a structured
form the new client can submit. There is no E2E test of:

- Run YAML tool → rerun from history → form pre-fills → submit → second job's
  `Job.tool_state` equals the first.
- Run YAML tool → export history → import → rerun.
- Run YAML tool → extract workflow from history → workflow step parameters
  match.

---

## What hardening would look like

### API-level invariants to assert

For a representative matrix of YAML tools (`gx_data_user`,
`gx_data_multiple_user`, `gx_boolean_user`, `gx_select_multiple_one_default_user`
from [[PR 21828 - YAML Tool Hardening and Tool State]] plus the 14 collection
shapes in `test/functional/tools/parameters/`):

1. **Rerun fidelity** — submit a job, GET `/api/tools/{id}/build?job_id=…`, POST
   the resulting state to `/api/jobs`, assert `Job.tool_state` of job 2 ==
   `Job.tool_state` of job 1 (modulo HID/encoded-id differences). Catches
   structured → flat → structured loss.
2. **Display fidelity** — submit a job, fetch job display
   (`/api/jobs/{id}?full=true` → `summarize_job_parameters`), assert displayed
   parameters reconstruct to the same Pydantic-validated state. Today display
   pulls only from legacy rows; the assertion forces an explicit reconciliation
   step.
3. **Workflow extract fidelity** — submit job(s), extract workflow from
   history, assert workflow step `tool_state` for the YAML step round-trips
   through the workflow runner to a `Job.tool_state` equal to the original.
4. **History export round-trip** — export, import, assert imported
   `Job.tool_state` and reconstructed-from-`params` state both equal the
   original, and that rerun on the imported job still works.

These should run for every YAML tool shape that XML tests already cover at the
API layer (`test_tools.py`, `test_workflow_extraction.py`, `test_exports.py`).

### E2E invariants to assert

In Selenium / Playwright (extending `test_custom_tools.py`):

1. Create user-defined YAML tool → run → click rerun → submit → job 2 succeeds
   and matches job 1.
2. Run YAML tool → "Extract Workflow" UI flow → run extracted workflow → job
   succeeds.
3. Run YAML tool → export history → re-import → rerun from history.

These exercise the **new tool form** ([[PR 21842 - Tool Execution Migrated to api jobs]])
against jobs whose pre-fill comes from the legacy `basic.py` path —
the exact divergence point.

### Longer-term direction

The clean fix is to make `Job.tool_state` the source of truth for post-hoc
consumers when present, falling back to `params_from_strings` only for jobs
predating the column. That requires:

- A `runtimeify`-symmetric `from_runtime_state(job)` for the form/extract/display
  consumers, parallel to the existing runtime-side conversion.
- Workflow extraction model ([[Component - Workflow Extraction Models]]) to
  accept structured tool state directly rather than reconstructing via
  `params_to_strings` (`lib/galaxy/workflow/extract.py:429`).
- Job display UI to render from the structured state (matching the form).

The tests above are the prerequisite — without them we can't tell whether the
two paths agree, and any switchover will silently regress XML tools or YAML
tools.

---

## Unresolved questions

- Does `params_from_strings` round-trip `data_collection` with comma-separated
  `collection_type` for YAML tools? Likely no test today.
- Does the legacy flat encoding represent `dce`-source elements for
  subcollection mapping? Behavior of `DataCollectionToolParameter.to_json` /
  `from_json` for DCE refs in YAML-tool jobs is unverified.
- For collection runtime metadata (`column_definitions`, `fields`,
  `has_single_item`, `columns`), is there any path back from `JobParameter`
  rows to a structured shape, or is it lost on the rerun/extract/display path?
- `to_cwl` fallback at `evaluation.py:1116` — when does `Job.tool_state` end up
  null for a YAML-tool job in practice (besides pre-21828 jobs)?
- Should workflow extraction emit `tool_state` directly from `Job.tool_state`
  for steps whose tool is a YAML tool, even before broader migration?
- Does history export's dual emission (`tool_state` + `params`) need a
  consistency check at export time, or is it acceptable to let them drift and
  only validate on consumption?
