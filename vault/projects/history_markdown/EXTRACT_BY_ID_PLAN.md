---
type: plan
issue: galaxyproject/galaxy#21722
created: 2026-04-28
revised: 2026-04-29
status: in-progress
related_notes:
  - "[[Component - Workflow Extraction]]"
  - "[[Component - Workflow Extraction Models]]"
  - "[[Issue 17506 - Convert Workflow Extraction Interface to Vue]]"
  - "[[Workflow Extraction Issues]]"
  - "[[Workflow Extraction Multiple Histories]]"
---

# Plan: ID-Based Workflow Extraction (#21722)

Migrate workflow extraction from HID-based dataset/collection identification to ID-based, additive. New params live alongside HID params; HID path stays for back-compat. Cross-history extraction enabled from day one (permission-checked).

## Current State on `dev` (verified 2026-04-28)

- Mako extraction UI **removed** in d7576fde0a (March 2026); `templates/build_from_current_history.mako` gone, controller body deleted.
- Vue UI: `client/src/components/History/WorkflowExtractionForm.vue` — submits `dataset_hids` / `dataset_collection_hids` (typed payload, but still HIDs).
- New typed endpoint: `POST /api/histories/{history_id}/extract_workflow`
  - Schema: `WorkflowExtractionPayload` in `lib/galaxy/schema/workflows.py` — fields: `workflow_name`, `job_ids` (decoded DB IDs), `dataset_hids` (HIDs), `dataset_collection_hids` (HIDs), `dataset_names`, `dataset_collection_names`.
  - Handler: `extract_workflow_from_history` in `lib/galaxy/webapps/galaxy/api/histories.py:828`.
  - Calls `extract_workflow(...)` in `lib/galaxy/workflow/extract.py` unchanged.
- Legacy untyped `POST /api/workflows` with `from_history_id` still present in `api/workflows.py:278`. Still uses `dataset_ids`/`dataset_collection_ids` (HIDs, misnamed).
- Summary endpoint: `GET /api/histories/{history_id}/extraction_summary` returns `WorkflowExtractionSummary`.

## Goals

- Add `hda_ids` / `hdca_ids` (encoded DB IDs) to extraction request schema.
- New `extract_workflow_by_ids()` / `extract_steps_by_ids()` paths in `extract.py`.
- Path-param `history_id` becomes context-only when ID params present (cross-history allowed).
- Permission checks per item replace implicit "must be in this history" guard.
- Connection mapping keyed by `(content_type, db_id)` rather than HID.
- Fix copied-dataset breakage (#9161, #13823) and job-cache cross-history outputs.
- Vue UI submits encoded IDs (display still shows HID).
- **Out of scope**: deprecating HID params; implicit-conversion HID-disambiguation (separate priority).

## Endpoint Decision (resolved)

New endpoint: **`POST /api/workflow/extract`** (singular `workflow`, per user choice).

History-optional, ID-based payload only. Existing endpoints stay untouched for back-compat:
- `POST /api/histories/{history_id}/extract_workflow` — HID-based, history-scoped (legacy).
- `POST /api/workflows` w/ `from_history_id` — HID-based, untyped (legacy).

Note on naming: rest of the workflow API is plural (`/api/workflows/...`). Singular `/api/workflow/extract` is intentional per user; flag for review at PR time.

Vue UI: introduce a new client helper (e.g. `extractWorkflowByIds`) calling the new endpoint; replace the existing `extractWorkflowFromHistory` submit path.

## Files Touched

| File | Change |
|------|--------|
| `lib/galaxy/workflow/extract.py` | Add `BaseWorkflowSummary` (pulls `__original_hda` / `__original_hdca` / `__check_state` / warnings out of existing `WorkflowSummary`); add `WorkflowSummaryByIds`, `extract_workflow_by_ids`, `extract_steps_by_ids`, `step_inputs_by_id`. Existing `WorkflowSummary` becomes a `BaseWorkflowSummary` subclass with no behavior change |
| `lib/galaxy/schema/workflows.py` | New `WorkflowExtractionByIdsPayload` model (separate from existing `WorkflowExtractionPayload`) |
| `lib/galaxy/webapps/galaxy/api/workflows.py` | New endpoint `POST /api/workflow/extract` — body has optional `from_history_id`, `hda_ids`, `hdca_ids`, `job_ids`. Returns `WorkflowExtractionResult`. (No HID fields accepted — mixing impossible by construction.) |
| `lib/galaxy/webapps/galaxy/services/workflows.py` | Add `WorkflowsService.extract_by_ids(...)`. Controller stays thin. (Note: legacy HID controller currently inlines `extract_workflow(...)` directly; consider following up by moving that into the service too — out of scope for this PR.) |
| `client/src/api/histories.ts` (or new `client/src/api/workflows.ts`) | Add `extractWorkflowByIds(payload)` |
| `client/src/components/History/WorkflowExtractionForm.vue` | Track encoded IDs in selection; submit `hda_ids` / `hdca_ids`; HIDs only for display |
| `client/src/components/History/WorkflowExtractionForm.test.ts` | Update assertions (encoded IDs in payload) |
| `lib/galaxy_test/api/test_workflow_extraction.py` | New `TestWorkflowExtractionByIds` class |
| `lib/galaxy_test/unit/workflow/test_extract.py` (new) | Unit tests for `extract_steps_by_ids` |
| `lib/galaxy_test/selenium/workflow_extraction*.py` (if present) | Verify Vue UI submits encoded IDs |
| OpenAPI / generated TS schema | Regenerated artifacts (`schema.ts`) — automatic but call out review |

## API Surface

### Schema additions in `lib/galaxy/schema/workflows.py`

```python
class WorkflowExtractionByIdsPayload(Model):
    workflow_name: str
    from_history_id: Optional[DecodedDatabaseIdField] = None  # optional context only
    job_ids: list[DecodedDatabaseIdField] = []                # already DB IDs
    hda_ids:  list[DecodedDatabaseIdField] = []
    hdca_ids: list[DecodedDatabaseIdField] = []
    dataset_names: list[str] = []
    dataset_collection_names: list[str] = []

    @model_validator(mode="after")
    def _at_least_one(self):
        if not (self.hda_ids or self.hdca_ids or self.job_ids):
            raise ValueError("At least one of hda_ids, hdca_ids, job_ids required")
        return self
```

`fake_<id>` job IDs: **not needed in this payload.** Verified in `WorkflowExtractionJob` schema: fake-job entries serialize with `id=None`. The Vue form already treats them as input selections, not job selections. So in the new payload, fake-job outputs flow through `hda_ids`/`hdca_ids` only; `job_ids` stays clean `list[DecodedDatabaseIdField]`.

No HID fields on this model — mixing is impossible by construction (per design decision). Clients wanting HID semantics use the legacy endpoints.

### New endpoint

```
POST /api/workflow/extract
Body: WorkflowExtractionByIdsPayload
Returns: WorkflowExtractionResult
```

History scoping: payload-level optional `from_history_id` (UI context, not validation). All access decisions via per-item permission checks.

Legacy paths untouched:
- `POST /api/histories/{history_id}/extract_workflow` (HID-based, typed)
- `POST /api/workflows` w/ `from_history_id` (HID-based, untyped — leave as-is)

## Backend Implementation

### 1. `extract_workflow_by_ids` / `extract_steps_by_ids`

New top-level functions in `lib/galaxy/workflow/extract.py`. Mirror the structure of `extract_workflow` / `extract_steps` but:

- Inputs already decoded ints (pydantic `DecodedDatabaseIdField`).
- Resolve each `hda_id` -> HDA via `trans.sa_session.get`; `None` -> `ObjectNotFound`.
- Permission check: `trans.app.hda_manager.error_unless_accessible(hda, trans.user)`. Same for HDCAs via `hdca_manager`.
- For each `job_id`, `trans.app.job_manager.get_accessible_job(trans, job_id)` (already used elsewhere).
- Build `id_to_output_pair: dict[tuple[Literal["dataset","collection"], int], (WorkflowStep, str)]`.
- Inputs keyed by `(type, db_id)` of the **original** HDA/HDCA after walking the `copied_from_*` chain — so a job's `JobToInputDatasetAssociation.dataset` (which references whatever HDA the job actually saw) maps deterministically.
- For each selected job, after `step_inputs_by_id(trans, job)` returns `[((type, id), input_name), ...]`, look up in `id_to_output_pair`; on hit, wire `WorkflowStepConnection`.
- Tool outputs: register `id_to_output_pair[(type, output.id)] = (step, assoc.name)` so downstream jobs can connect.

### 2. `step_inputs_by_id`

Sibling of `step_inputs`. Same `tool.get_param_values` + `__cleanup_param_values` walk, but emit `(("dataset", hda.id), prefix+key)` for HDAs and `(("collection", hdca.id), prefix+key)` for HDCAs.

Split the cleanup walk by parameter type rather than reconciling against `JobToInputDatasetCollectionAssociation` after the fact:

- `DataCollectionToolParameter`: the value is an HDCA (or DCE wrapping one). Emit `("collection", hdca.id)` directly. Do **not** descend to leaf HDA via `first_dataset_instance()` — that's the HID-path's flaw (currently at `extract.py:454-458`).
- `DataToolParameter` whose value is an HDA: emit `("dataset", hda.id)`.
- `DataToolParameter` whose value is a DCE (single element from a job's collection input — implicit-map case): walk to parent HDCA via the DCE's `collection`, then up to the HDCA the job actually saw. If that lookup is fragile, fall back to `JobToInputDatasetCollectionAssociation` rows for unusual flatten-during-mapping cases — but check normal cases work without it first.

Refactor: pull the recursion in `__cleanup_param_values` into a helper that yields `(item, prefix+key)` events; HID and ID variants format keys differently.

### 3. `BaseWorkflowSummary` + `WorkflowSummaryByIds`

Step 3a: refactor existing `WorkflowSummary` into `BaseWorkflowSummary` + `WorkflowSummary(BaseWorkflowSummary)` first.

**Scope of the lift is narrow** — only pure helpers move to base:
- `__original_hda`, `__original_hdca`
- `__check_state`
- `warnings` set + `trans` / `sa_session` plumbing

What does **not** move: the `__summarize` traversal of `history.visible_contents`, `__summarize_dataset` / `__summarize_dataset_collection` (currently `extract.py:322-401`). Those entangle HID bookkeeping (`hda_hid_in_history`, `hdca_hid_in_history`) with `self.jobs` / `implicit_map_jobs` building; cleanly separating them is more work than this PR should bite off. `WorkflowSummaryByIds` builds its `self.jobs` differently (walking from supplied `job_ids` outward, not via `visible_contents`), so it doesn't need that code path.

Run full extraction test suite (unit + `test_workflow_extraction.py`) to confirm no regression before continuing.

Step 3b: add `WorkflowSummaryByIds(BaseWorkflowSummary)`:
- Validates `job_ids` are accessible (via `job_manager`).
- Computes representative jobs for implicit-map groups (jobs share `ImplicitCollectionJobs`; one represents).
- Provides `find_implicit_input_collection`-style lookup keyed by output HDCA id rather than HID.
- Does **not** iterate `history.visible_contents` — walks from supplied `job_ids` outward.

### 4. Implicit-map jobs

The HID path has special-case handling at `extract.py:172-176` (input rewrite via `find_implicit_input_collection`) and `:195-209` (output HDCA selection). Port carefully:

- Input rewrite: same `find_implicit_input_collection(input_name)` call; result is an HDCA whose `id` is the lookup key — `(("collection", input_hdca.id), input_name)`.
- Output side: same loop scanning `jobs[job]` pairs to find matching output HDCA; key by HDCA id.

### 5. Permission model

| Source | Check |
|--------|-------|
| `hda_ids[i]` | `hda_manager.error_unless_accessible` |
| `hdca_ids[i]` | `hdca_manager.error_unless_accessible` — HDCA-level only |
| `job_ids[i]` | `job_manager.get_accessible_job` |
| `from_history_id` (if given) | `history_manager.get_accessible` — context only |

Anonymous: blocked at API guard (extraction needs a real user).

## Frontend (`WorkflowExtractionForm.vue`)

Currently the form tracks selections by HID:

```ts
// dev
const selectedDatasets = getSelectedInputs("dataset");          // { hids, names }
// payload: { dataset_hids, dataset_collection_hids, job_ids }
```

Change:
- Track `Map<encodedId, {id, hid, name, type}>` per-type instead of HID lists.
- Display continues to use HID + name.
- `extractWorkflowFromHistory` API helper renamed/replaced with `extractWorkflowByIds(payload)` calling the new endpoint.
- Test (`WorkflowExtractionForm.test.ts`) updated to assert `hda_ids` / `hdca_ids` in submitted payload.

API summary endpoint (`extraction_summary`) already returns full output objects — verify it includes the encoded `id` field; if not, extend `WorkflowExtractionSummary` to include encoded ids alongside HIDs.

## Test Plan (red → green)

Write tests in this order; each must fail before implementation lands.

### Unit (`lib/galaxy_test/unit/workflow/test_extract.py`, new)

1. `test_extract_steps_by_ids_basic` — 1 input HDA, 1 tool job; verify `data_input` step + tool step + 1 connection.
2. `test_extract_steps_by_ids_collection` — 1 input HDCA mapped through tool.
3. `test_invalid_dataset_id_raises_object_not_found`.
4. `test_inaccessible_dataset_rejected` — second user's private HDA → `ItemAccessibilityException`.
5. `test_implicit_map_job_resolves_collection_input`.
6. `test_id_pair_uses_original_after_copy` — HDA copied A→B; passing copy's id resolves connection. **Important**: cover both directions — user passes pre-copy HDA id (A) AND user passes post-copy HDA id (B) — since `JobToInputDatasetAssociation.dataset` may point to either.
6b. `test_paired_collection_input` — `paired` collection mapped as input.
6c. `test_dce_as_data_param` — single DCE supplied to a `DataToolParameter` (the tricky case from §2 collection-element handling); ensure parent HDCA is recovered correctly.

### API (`lib/galaxy_test/api/test_workflow_extraction.py`, extend)

7. `test_extract_with_hda_ids` — happy path through HTTP.
8. `test_extract_without_from_history_id` — only `hda_ids`/`hdca_ids` set; succeeds.
9. `test_cross_history_extraction` — datasets from two histories owned by same user; succeeds.
10. `test_inaccessible_dataset_rejected` — another user's private HDA in payload → 403.
11. `test_copied_dataset_extraction_no_foreign_jobs` — regression for #9161: dataset copied A→B, tool run in B, extract from B; resulting workflow contains only the B job, B input.
12. `test_legacy_endpoint_still_works` — back-compat: `POST /api/histories/{id}/extract_workflow` with `dataset_hids` unchanged.
13. `test_request_param_missing_when_empty_payload` — 400 when no inputs/jobs.
14. `test_job_cache_cross_history_output` — run a tool in A, run again in B with cache hit, extract from B. **Pre-step**: write this test against current HID path on dev first to confirm it actually fails. Reviewer flagged that `__summarize_dataset` already walks `__original_hda` and may map original-id → B-hid correctly, so the HID path may already handle this. If green on dev, drop or recharacterize the test. Pattern after `test_run_cat1_use_cached_job_from_public_history` (`test_tools.py:1414`).

### Roundtrip

15. `test_roundtrip_basic_by_ids` — port one existing roundtrip helper to the new endpoint; confirm extracted workflow runs successfully on fresh history.

**Subworkflow roundtrip (#15b) dropped from this PR**: subworkflow-ness lives on the invocation, not on resulting jobs/datasets — extraction sees a flat post-run history regardless. No existing subworkflow extraction test to port. Punted to follow-up if needed.

### Vue / Selenium

16. `WorkflowExtractionForm.test.ts` — payload assertions: `hda_ids` / `hdca_ids` are encoded IDs, not HIDs.
17. Selenium roundtrip (if existing extraction selenium suite present) — UI extracts → run → result identical to old behavior in single-history scenario.

## Implementation Order

0. ✅ Refactor `WorkflowSummary` → `BaseWorkflowSummary` + `WorkflowSummary` subclass (helpers only — see §3); full existing extraction test suite green; commit. (df4339e966, a0ecf5312e)
0b. ✅ Land empty stubs + endpoint scaffold. (f0ded11559)
1. ✅ Tests #1, #3, #4 → `extract_steps_by_ids` skeleton + permission checks. (fd9f63fd71)
2. ✅ Tests #2, #5 → collection + implicit-map handling. (1787213de2)
3. ✅ Test #6 → copied-dataset / original-resolution path. (c08be7007b)
4. ✅ Tests #7, #8, #13 → schema + new endpoint wired. (e4100cc83a, 0e62499b2d, 4c7a90b17b)
5. ✅ Tests #9, #10, #11 → cross-history + perm rejection + #9161 regression. (b64cc45819, b04351a861)
6. ✅ Test #14 → job cache cross-history. (e5dbb3b9d8)
7. ✅ Test #15 → roundtrip helper port. (e5dbb3b9d8)
8. ✅ Vue: switch payload to `hda_ids`/`hdca_ids`, swap to `extractWorkflowByIds`, update `WorkflowExtractionForm.test.ts` (#16). Schema regen via `make update-client-api-schema`. Removed unused legacy `submitWorkflowExtraction` helper. (b7aec49113, e045b0a979)
9. **Deferred to CI** Selenium suite (#17) — local env lacks chromedriver/geckodriver and playwright backend hits driver_factory auto-detect. Existing Selenium suite was green on this branch under HID payload (per prior agent run); UI-level interactions unchanged so passthrough on CI expected. Back-compat (#12) covered by API test_legacy_endpoint_still_works.

11/11 by-ids API tests + 16/16 Vue unit tests passing as of 2026-04-29. Type-check clean.

Each step: small commit, full unit suite + targeted API subset before next step. Full `test_workflow_extraction.py` run before PR open.

## Risks / Edge Cases

- **HDCA element accessibility**: spec says check HDCA only. If individual elements were rebuilt from foreign HDAs (rare), perms could surprise. Acceptable: HDCA-level access is Galaxy's standard model.
- **`step_inputs_by_id` collection elements**: `__cleanup_param_values` flattens DCEs via `first_dataset_instance()` (`extract.py:454-458`). ID variant: split walk by parameter type — see §2 — emit HDCA id directly for `DataCollectionToolParameter` rather than reconciling against `JobToInputDatasetCollectionAssociation` after the fact.
- **Implicit conversions** (HID non-uniqueness, separate priority-1 issue): ID path naturally avoids ambiguity. Don't fix that bug here; ensure tests don't depend on the broken HID behavior.
- **Subworkflows**: subworkflow-ness lives on the invocation; extraction sees flattened post-run history. Out of scope for this PR — follow up if needed.
- **`step_inputs` `item.hid` post-copy**: HID path uses `item.hid` of the job's HDA, which after copy may sit in another history. ID path keys by `id` so this dissolves — but test #6 must explicitly cover the case where `JobToInputDatasetAssociation.dataset` points to the post-copy HDA in B while the user passes the pre-copy HDA id in A (and vice versa).
- **Input step ordering**: HID path inherits HID order naturally; ID path receives `hda_ids` in arbitrary client order. `attach_ordered_steps` orders via dependency graph (no risk to connection correctness), but canvas layout via `order_workflow_steps_with_levels` may produce different results across input orderings. Pass-through user order is fine; add a test that confirms two ID requests with the same inputs produce equivalent workflows.
- **FakeJob**: not relevant for new payload — fake-job outputs flow through `hda_ids`/`hdca_ids` (see §schema).
- **OpenAPI / TS schema regeneration**: run `make client-format` and the schema regen target; verify and commit `client/src/api/schema/schema.ts` changes.
- **`extraction_summary` response**: verified — `WorkflowExtractionOutput` already includes encoded `id` alongside `hid`. No backend change needed for the Vue switch.
- **Anonymous user guard**: don't reinvent. The legacy endpoint relies on authenticated trans + `manager.get_accessible`. Mirror that — let pydantic + the standard route auth apply.

## Resolved By Research (2026-04-28)

- **`extraction_summary` includes encoded IDs**: confirmed. `WorkflowExtractionOutput` (`lib/galaxy/schema/workflows.py`) has `id: EncodedDatabaseIdField` alongside `hid: int`. Vue form can switch with no backend change to the summary endpoint.
- **Job cache test deterministic**: `dataset_populator.run_tool(..., use_cached_job=True)` (see `lib/galaxy_test/api/test_tools.py:1321`+ for prior art e.g. `test_run_cat1_use_cached_job_from_public_history` which already runs across two histories). Test #14 patterned on these.
- **`fake_<id>` typing**: not needed. `WorkflowExtractionJob.id` is already `Optional[EncodedDatabaseIdField]` (None for fake jobs); the Vue form selects fake-job outputs as inputs, not as jobs. New payload's `job_ids` stays a clean `list[DecodedDatabaseIdField]`.

## Design Decisions (resolved 2026-04-28)

- **Endpoint**: `POST /api/workflow/extract` (singular, per user). Sibling to existing endpoints, history-optional.
- **Schema**: separate `WorkflowExtractionByIdsPayload` model (no HID fields → mixing impossible by construction).
- **Refactor scope**: introduce `BaseWorkflowSummary` now; existing `WorkflowSummary` becomes a subclass (no behavior change), `WorkflowSummaryByIds` joins as a sibling.
- **Mixed payload**: not possible — separate endpoint + separate schema.

## Unresolved Questions

- Anonymous-user / shared-history cross-history scenarios — punt to integration tests; should follow standard Galaxy access rules.
- Singular `/api/workflow/extract` vs convention `/api/workflows/...` — flag for review at PR time.
