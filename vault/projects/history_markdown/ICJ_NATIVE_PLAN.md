# ICJ-Native Workflow Extraction — Implementation Plan

> **Date:** 2026-05-12
> **Branch:** `history_notebook_extract` (`jmchilton/galaxy`, currently at `b3c55e2d03`)
> **Predecessor:** Closed PR [galaxyproject/galaxy#22675](https://github.com/galaxyproject/galaxy/pull/22675) ("Allow extracting workflows by ID instead HID.")
> **Tracking issue:** [#21722](https://github.com/galaxyproject/galaxy/issues/21722) (ID-based extraction for cross-history)
> **Related research:**
> - `vault/research/Workflow Extraction Issues.md`
> - `vault/research/Component - Workflow Extraction Models.md`
> - `vault/research/Problem - YAML Tool Post-Hoc State Divergence.md`

---

## Why this exists

Closed PR 22675 added a parallel ID-based extraction endpoint (`POST /api/workflows/extract`, `extract_workflow_by_ids` → `extract_steps_by_ids`) that mirrors the HID path's "infer map/over from individual jobs" model:

1. Caller passes `job_ids` (any constituent job).
2. Server checks each `job.implicit_collection_jobs_association`, dedups via `seen_icj_ids` + `SELECT Job ORDER BY id LIMIT 1` to pick a representative.
3. Per-job connection keys later get rewritten via `find_implicit_input_collection` on output HDCAs.

That is the server reverse-engineering "this is part of a map" from data the caller already knew. The next iteration makes the **implicit collection itself** the unit of selection: callers pass `implicit_collection_jobs_ids` for mapped steps and `job_ids` only for non-mapped jobs. This:

- Eliminates the dedup + representative-job DB lookup.
- Turns `find_implicit_input_collection` from a post-hoc connection-key rewrite into an up-front input lookup.
- Removes the "silently drop per-job HDAs" comment block and the ICJ-membership inference entirely.
- Makes the public API stable across the future swap from `JobParameter`-derived params to `ToolRequest`/`Job.tool_state`-derived params.

The branch is **not** abandoned — the refactor scaffolding (helpers, schema model, route, service method, test mixin, ~all non-mapping tests) is reused. Only the mapped-job semantics change.

---

## Current branch state to build on

Reuse as-is (do not redo):

| File | Reuse |
|---|---|
| `lib/galaxy/workflow/extract.py` | `_walk_data_param_tree`, `_finalize_workflow`, `_original_hda`, `_original_hdca`, `_skip_output_assoc_name`, `BaseWorkflowSummary._check_state`, `__cleanup_param_values_by_id`, `IdKey`, `IdAssociations` typedefs |
| `lib/galaxy/schema/workflows.py` | `WorkflowExtractionByIdsPayload` (extend, don't rewrite) |
| `lib/galaxy/webapps/galaxy/api/workflows.py` | `POST /api/workflows/extract` route |
| `lib/galaxy/webapps/galaxy/services/workflows.py` | `WorkflowsService.extract_by_ids` + `_to_extraction_result` |
| `lib/galaxy_test/api/test_workflow_extraction.py` | `_ExtractionHelpersMixin`, `TestWorkflowExtractionByIdsApi` non-mapped cases, helpers |

Rewrite:

| File | Rewrite scope |
|---|---|
| `lib/galaxy/workflow/extract.py` | `extract_steps_by_ids` body — split into ICJ branch + job branch |
| `lib/galaxy/schema/workflows.py` | `WorkflowExtractionByIdsPayload` — add `implicit_collection_jobs_ids`, tighten validator |
| `lib/galaxy_test/api/test_workflow_extraction.py` | `test_extract_mapping_workflow_by_ids`, `test_extract_reduction_by_ids`, `test_subcollection_mapping_by_ids` — all switch from `job_ids=[mapped_job]` to `implicit_collection_jobs_ids=[icj_id]` |

Delete:

- `seen_icj_ids` dedup loop in `extract_steps_by_ids` (`extract.py:586-597`)
- The representative-job `SELECT` (same block)
- The implicit-map connection-key rewrite at `extract.py:657-664`
- The output-registration comment block at `extract.py:674-678`
- The `if output_hdcas:` branch entirely (collapsed into ICJ-branch logic)

---

## Target API shape

```python
# lib/galaxy/schema/workflows.py
class WorkflowExtractionByIdsPayload(Model):
    workflow_name: str
    from_history_id: Optional[DecodedDatabaseIdField] = None  # UI hint only
    hda_ids: list[DecodedDatabaseIdField] = []
    hdca_ids: list[DecodedDatabaseIdField] = []
    dataset_names: list[str] = []
    dataset_collection_names: list[str] = []
    job_ids: list[DecodedDatabaseIdField] = []                       # NEW semantics
    implicit_collection_jobs_ids: list[DecodedDatabaseIdField] = []  # NEW

    @model_validator(mode="after")
    def _at_least_one_input(self):
        if not (self.hda_ids or self.hdca_ids or self.job_ids or self.implicit_collection_jobs_ids):
            raise ValueError("At least one of hda_ids, hdca_ids, job_ids, implicit_collection_jobs_ids required")
        return self
```

Service-layer validation (runs after fetch, not in pydantic since it needs DB access):

1. For every `job_id`: if `job.implicit_collection_jobs_association is not None` → 400 with message "job %s is part of implicit collection jobs %s — pass via implicit_collection_jobs_ids instead".
2. Each `icj_id` and `job_id` must be unique within its list; across lists, no `job_id` may belong to any supplied `icj_id`.
3. Each `icj_id` must reference an ICJ whose `populated_state == "ok"` (reject `"new"` and `"failed"` with informative error).
4. Each `icj_id` must have at least one output HDCA (no-output ICJs have nothing to wire).

---

## Implementation in `extract_steps_by_ids`

Signature change:

```python
def extract_steps_by_ids(
    trans: ProvidesHistoryContext,
    job_manager: Optional[JobManager] = None,
    job_ids: Optional[list[int]] = None,
    implicit_collection_jobs_ids: Optional[list[int]] = None,  # NEW
    hda_ids: Optional[list[int]] = None,
    hdca_ids: Optional[list[int]] = None,
    dataset_names: Optional[list[str]] = None,
    dataset_collection_names: Optional[list[str]] = None,
) -> list[WorkflowStep]:
```

Body shape (replaces current ~110 lines from `# Resolve and dedup jobs` through `return steps`):

```
hda input steps    -> id_to_output_pair[("dataset",    original_hda.id)]
hdca input steps   -> id_to_output_pair[("collection", original_hdca.id)]

resolve work items (kept in submission order):
    for each icj_id:  fetch ICJ + its output_hdcas; access-check via output_hdca.history
    for each job_id:  fetch + access-check; reject if job has ICJ association
    sort all by representative-job.id ascending  (monotonic submission order)

for each work item in order:
    if ICJ:
        representative = icj.job_list sorted by ImplicitCollectionJobsJobAssociation.order_index, first
        tool_inputs, associations = step_inputs_by_id(trans, representative)
        # Rewrite collection-element associations to the parent input HDCA up-front.
        # The mapping is known directly: icj output_hdcas -> implicit_input_collections.
        for hdca in output_hdcas[0].implicit_input_collections:
            # ImplicitlyCreatedDatasetCollectionInput rows give us {name -> input_hdca}
            mapped_inputs[name] = _original_hdca(input_hdca)
        for key, input_name in associations:
            if input_name in mapped_inputs:
                key = ("collection", mapped_inputs[input_name].id)
            wire (step_input, other_step, other_name) if key in id_to_output_pair

        outputs: dedup output_hdcas by implicit_output_name, register each via original HDCA id.
    else:  # plain job
        tool_inputs, associations = step_inputs_by_id(trans, job)
        for key, input_name in associations:
            wire if key in id_to_output_pair
        outputs: job.output_datasets + job.output_dataset_collection_instances (current logic)
```

The wiring logic at the call site collapses to one loop because the key-rewrite now happens before wiring, not interleaved with it.

`step_inputs_by_id` itself does **not** change shape — it still returns `(tool_inputs, IdAssociations)`. The ICJ branch just calls it with the representative job.

---

## Files to touch (concrete checklist)

### `lib/galaxy/schema/workflows.py`
- [ ] Add `implicit_collection_jobs_ids: list[DecodedDatabaseIdField]` field.
- [ ] Update `_at_least_one_input` validator.
- [ ] No cross-field validator needed in pydantic (the job-has-ICJ check needs DB).

### `lib/galaxy/workflow/extract.py`
- [ ] Add `implicit_collection_jobs_ids` arg to `extract_workflow_by_ids` and `extract_steps_by_ids`.
- [ ] Implement ICJ-branch fetching + access check.
- [ ] Implement up-front `implicit_input_collections` lookup → `name -> input_hdca` map.
- [ ] Pick representative via `ImplicitCollectionJobsJobAssociation.order_index ASC, job_id ASC` (deterministic; falls back if `order_index` is absent).
- [ ] Reject `job_ids` whose job has an ICJ association (service-layer error before wiring, with message naming the ICJ id).
- [ ] Delete the `seen_icj_ids` block, the representative `SELECT`, and the `find_implicit_input_collection` rewrite that lives inside the wire loop.
- [ ] Delete the `# Implicit-map: register each unique implicit output HDCA ...` comment block (whole `if output_hdcas:` branch goes away).
- [ ] `__all__` add `"extract_workflow_by_ids"`, keep `"extract_steps_by_ids"` (already present).

### `lib/galaxy/webapps/galaxy/services/workflows.py`
- [ ] Pass `implicit_collection_jobs_ids=payload.implicit_collection_jobs_ids` to `extract_workflow_by_ids`.
- [ ] Cross-payload validation (job-has-ICJ rejection, duplicate-across-lists) lives here, before calling `extract_workflow_by_ids`. Raise `exceptions.RequestParameterInvalidException`.

### `lib/galaxy/webapps/galaxy/api/workflows.py`
- [ ] No change beyond docstring update on `extract_by_ids` to mention the new field.

### `lib/galaxy_test/api/test_workflow_extraction.py`
- [ ] Migrate mapped tests (`test_extract_mapping_workflow_by_ids`, `test_extract_reduction_by_ids`, `test_subcollection_mapping_by_ids`) from `job_ids=[mapped_job]` to `implicit_collection_jobs_ids=[icj_id]`.
- [ ] Add `_icj_id_for_job(self, job_id)` helper on `_ExtractionHelpersMixin` — uses `/api/jobs/{job_id}?full=true` (or whichever endpoint exposes `implicit_collection_jobs_id`) to look up the ICJ. If no API surfaces this today, fetch via `GET /api/jobs?implicit_collection_jobs_id=…` after first resolving the job, OR add a one-line lookup helper to `DatasetCollectionPopulator`. Confirm before implementing — see Unresolved Questions.
- [ ] Add new test `test_job_with_icj_via_job_ids_rejected` — pass a mapped job's id in `job_ids`, expect 400 with message naming the ICJ.
- [ ] Add new test `test_mixed_icj_and_member_job_rejected` — pass both `implicit_collection_jobs_ids=[icj]` and `job_ids=[member_job]`, expect 400.
- [ ] Add new test `test_icj_not_populated_rejected` — synthesize/wait-for an ICJ in `populated_state="new"` and expect 400. (May be hard to set up reliably from an API test; if so, push to unit test of the service method or skip with note.)

---

## Red-to-green test order

Per project convention (write tests first, then make them pass). Suggested commit cadence:

1. **Commit 1 — payload field + validator.** Add `implicit_collection_jobs_ids` to the model + the `_at_least_one_input` extension. Write `test_empty_payload_rejected` variant covering the new field path; existing tests pass unchanged. Green.
2. **Commit 2 — validator: reject mapped-job in `job_ids`.** Write `test_job_with_icj_via_job_ids_rejected` (red). Add service-layer check (green). At this point existing mapped tests (`test_extract_mapping_workflow_by_ids` etc.) break — that's expected, fix in next commit.
3. **Commit 3 — ICJ branch implementation.** Write/extend `test_extract_mapping_workflow_by_ids` for the new payload shape (red against commit 2 state). Implement ICJ branch in `extract_steps_by_ids`. Green.
4. **Commit 4 — port remaining mapped tests.** `test_extract_reduction_by_ids` + `test_subcollection_mapping_by_ids` switch to `implicit_collection_jobs_ids`. Green.
5. **Commit 5 — strip legacy inference.** Delete `seen_icj_ids` block, `find_implicit_input_collection` post-hoc rewrite, the `if output_hdcas:` branch in the output-registration section, and the speculative comment. All tests still green.
6. **Commit 6 — cross-list dedup + edge-case validators.** `test_mixed_icj_and_member_job_rejected`, `test_icj_not_populated_rejected` (if feasible).

Run after each commit: `./run_tests.sh -api lib/galaxy_test/api/test_workflow_extraction.py` — the full file should stay green.

---

## What still requires walking a representative job

Until [[Problem - YAML Tool Post-Hoc State Divergence]] is addressed:

- Tool parameters are reconstructed via `Tool.get_param_values(representative_job)` → `params_from_strings` → `JobParameter` rows.
- For YAML tools this is the **flat legacy representation**, not `Job.tool_state`.
- One-line site: representative selection in the ICJ branch.

When `Job.tool_state` / `ToolRequest.request_state` becomes the canonical post-hoc source (work in PRs 20935, 21828, 21842):

- Swap `step_inputs_by_id(trans, representative)` for an `ICJ.tool_request`-derived equivalent.
- The public API doesn't change.

Document this in `extract.py` next to the representative-job pick with a `# FIXME: source of truth for params; swap to Job.tool_state when post-hoc reader exists` comment referencing the issue.

---

## Out of scope (do not pull into this PR)

- **Paired-DCE `first_dataset_instance()` collapse.** Preexisting in legacy `__cleanup_param_values`. ICJ branch sidesteps the common case (mapping over `list:paired`) via the up-front `implicit_input_collections` lookup. The rare non-mapped paired-DCE case stays broken on both paths.
- **#21788 / #21789 / #13823 root causes.** These need `ToolRequest`-based extraction; documented in `Workflow Extraction Issues.md`.
- **Selenium / UI changes.** `WorkflowExtractionForm.vue` still passes representative-job IDs. UI rebuild is #17506. Add a note in the PR description that the new field is API-only for this PR.
- **Removing the legacy `extract_workflow` (HID) path.** Stays untouched.

---

## Bugs this PR directly fixes (cross-ref to research notes)

| Issue | How this PR helps |
|---|---|
| #21789 (dynamic nested collection misconnected) | ID-based wiring + up-front ICJ input lookup removes HID-based inference for mapped steps. |
| #13823 (multi-output copied collection downstream fail) | Outputs keyed by HDCA id, not HID; copy-history-membership stops mattering for mapped outputs. |
| #9161 (copied datasets break) | Already largely addressed by ID-based path; ICJ restructure removes one more HID source in the mapped case. |

Not fully fixed by this PR (still need ToolRequest):

- #21788 (empty collection → empty workflow) — needs request-level state, not job-level.
- #14541 (Extract Dataset tool missing) — association-chain issue, separate fix.

---

## Unresolved questions

- Naming: `implicit_collection_jobs_ids` (verbose, matches model) vs `icj_ids` (terse, less self-explanatory in OpenAPI). User to decide.
- ICJ access control: confirm "owner = output HDCA's history.user" is the right gate. Alternative: require every output HDCA's history to be readable by the user. Likely equivalent in practice.
- Is there an existing API surface that gives a client `(job_id) -> implicit_collection_jobs_id` mapping? If not, the test helper needs the populator to expose it. Worth asking before writing.
- `populated_state == "new"` rejection: is the assumption "you shouldn't extract an in-flight map" correct, or should we allow it for partially-completed maps?
- Do we want a feature flag for the validator that rejects mapped-job-id-in-`job_ids`, to soften the API break? (Probably no — the endpoint is new and unreleased; clean break is fine.)
- Should we add `populated_state` and `output_hdca_count` to the ICJ index endpoint (`/api/jobs?implicit_collection_jobs_id=…` or similar) so the UI can disambiguate before submitting? Out-of-scope for this PR but worth noting.

---

## References (in-repo)

- Branch state: commit `b3c55e2d03` on `history_notebook_extract`.
- Closed PR: https://github.com/galaxyproject/galaxy/pull/22675 (review comments from @mvdbeek that motivated this restructure).
- Current implementation to read: `lib/galaxy/workflow/extract.py:435-768`.
- HID-path reference (do not modify): `lib/galaxy/workflow/extract.py:119-234` (`extract_steps`).
- ICJ model: `lib/galaxy/model/__init__.py:2928` (`ImplicitCollectionJobs`).
- `ImplicitlyCreatedDatasetCollectionInput`: `lib/galaxy/model/__init__.py:2904`.
- `HDCA.find_implicit_input_collection`: search `lib/galaxy/model/__init__.py` for `def find_implicit_input_collection`.
- Existing TODO markers tracking the larger arc:
  - `lib/galaxy/workflow/extract.py:323` — "TODO track this via tool request model"
  - `lib/galaxy_test/api/test_workflow_extraction.py` near `test_empty_collection_map_over_extract_workflow` — "TODO: after adding request models we should be able to recover implicit collection job requests"



