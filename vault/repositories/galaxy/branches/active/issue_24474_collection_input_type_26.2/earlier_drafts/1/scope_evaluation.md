Run via Opus 5.5 at low effort.

# Scope evaluation: issue_24474_collection_input_type_26.2

**Recommendation: expand modestly.** Keep everything as implemented, and add three things. (1) Reject an incompatible collection edge at workflow scheduling time in `lib/galaxy/workflow/map_over.py`. Today such an edge gets a failed job at preparation. The branch already makes these invocations fail, so this only moves the failure earlier and reports it on the invocation. (2) Apply the same match-or-map-over rule to collections supplied for typed workflow `data_collection_input` steps when the invocation is requested. This is the other way an undeclared type gets in, and today it is not checked at all. (3) Add the dropdown's `column_definitions` compatibility check to `_check_collection_type`, so the run-time rule matches the dropdown rule the issue names. Leave three things out: rejecting dataset-only DCEs (their blast radius on reruns is unknown and no symptom has been reported), record `fields` matching (no matching rule exists to align with, so it would be a new feature), and editor-side changes (typed edges are already checked by the client).

## Possible Decompositions

The branch is about 330 lines: about 60 of production code, the rest tests. Planned land order:

1. **Baseline tests** (`b50680eaf60`): the accept matrix in `test_data_collection_parameters.py` and `test_build_map_over_collection_input_has_no_error`. They pass on `release_26.2` and could land alone.
2. **Tool parameter check**: `HistoryQuery.direct_match_type`/`can_map_over_type`, `_check_collection_type`, the batch-wrapper exemption, and the `test_tool_execute.py` reject tests. This is the issue proper.
3. **Workflow runtime map-over allowance**: `allow_map_over` through `check_param` and `modules.py`, plus the two `test_workflows.py` tests. It can't land without 2: without it, 2 regresses `test_run_map_over_with_step_parameter_dict`. So 2 and 3 can split into separate commits but not separate PRs.
4. *(If expanded)* **Earlier workflow rejection**: the `map_over.py` scheduling check and the invocation-request check on workflow inputs. `test_untyped_collection_input_incompatible_with_tool_fails_job` gets rewritten to assert an invocation failure. This could be its own follow-up PR on top of 2+3.

## Scopes considered

### A. As implemented

`DataCollectionToolParameter.from_json` rejects HDCAs, sub-collection DCEs and adapters whose type the parameter does not accept (via `HistoryQuery`). Unexpanded batch wrappers are exempt. Workflow runtime step parameters may also take collections the input can map over. An incompatible collection that a workflow edge passes straight through now fails at job preparation.

| Pros | Cons |
| --- | --- |
| <ul><li>Closes the issue's six-case table on every tool entry point (legacy, 21.01, tool request)</li><li>Single rule shared with the dropdown and `map_over.py` via `HistoryQuery`</li><li>Small production diff, already reviewed four times</li></ul> | <ul><li>A workflow edge that passes an incompatible collection through now fails as a job error, with the message in the output's `misc_info`. The invocation still schedules.</li><li>Typed workflow collection inputs still take any collection type at invocation time</li><li>The run-time rule ignores `column_definitions`, which the dropdown applies</li></ul> |

### B. Expand: reject at scheduling in `map_over.py` (recommended)

In `MapOverPlanner._find_collections_to_match`, a `dataset_collection` input whose replacement is an HDCA that neither direct-matches nor can map over raises `FailWorkflowEvaluation`. It does this outside `subworkflow_structure`, the same condition as the existing `direct_match` guard. The failure reuses `InvocationFailureWorkflowParameterInvalid` (`workflow_step_id` plus the same message as `details`), so no schema or client enum change is needed.

| Pros | Cons |
| --- | --- |
| <ul><li>Only moves a failure the branch already creates, so it breaks nothing new</li><li>The invocation shows a step-level error instead of a red dataset; no job is created</li><li>About 10 lines, reusing the same `HistoryQuery` call that's already there</li><li>Review 1 and the initial debrief both named this as the follow-up</li></ul> | <ul><li>`workflow_parameter_invalid` says "parameter step"; the wording is slightly off for a tool-step edge</li><li>The subworkflow-structure path skips `direct_match` today, so the check must stay out of that branch or it risks false positives</li><li>The existing workflow test has to be rewritten</li></ul> |

<details><summary>Details</summary>

The fall-through at `map_over.py:86-96` is what produces the late failure: `direct_match` false, `can_map_over` false, nothing added to `collections_to_match`, so the whole collection is bound to the step. The job-prep check (`_validate_incoming` → `from_json`) then rejects it with the same `HistoryQuery`, so a scheduling check with the same declared types can't reject anything the job-prep check would accept. Restrict it to `HistoryDatasetCollectionAssociation` replacements and leave DCE replacements, which only occur inside mapped subworkflows, on today's path. A new `FailureReason` (e.g. `collection_type_mismatch`) would be cleaner. But it touches `schema/invocation.py`, the client's invocation-message components, and the OpenAPI schema, which is too much for a 26.2 backport.

</details>

### C. Expand: check typed workflow collection inputs at invocation request (recommended)

When `run_request.py` resolves a `src: hdca` input for a `data_collection_input` step with a declared `collection_type`, it rejects with 400 any collection that the type neither accepts nor can map over. This is the same rule as `allow_map_over`. Untyped inputs skip the check.

| Pros | Cons |
| --- | --- |
| <ul><li>Same bug, other entry point: by inspection, `run_request.py` and `InputDataCollectionModule.execute` never consult `collection_type`</li><li>Typed inputs are where users hit the late failure, because the editor allows `paired`→`paired` and the problem only shows when a `list` arrives</li><li>Request-time 400, matching the tool path</li></ul> | <ul><li>Must allow mappable deeper collections: a `list:list` given to a `list` input currently flows on, and downstream steps map over it</li><li>Touches a third subsystem (invocation request); API-only, by inspection, untested</li><li>A little more release-branch surface</li></ul> |

<details><summary>Details</summary>

Using `direct_match` alone would break workflows that feed a nested collection to a typed input and rely on downstream implicit mapping. Use `direct_match_type or can_map_over_type`, the same pairing the branch already uses for runtime step parameters. Collections imported by URI (`DataRequestCollectionUri`) carry their own declared type and can be checked the same way, or left out for now. This is the piece to drop first if reviewers want a tighter PR.

</details>

### D. Expand: include `column_definitions` in the run-time check (recommended)

In `_check_collection_type`, after a direct match, apply `column_definitions_compatible` when the parameter declares `column_definitions`, exactly as `_classify_hdca` does for the dropdown.

| Pros | Cons |
| --- | --- |
| <ul><li>The issue asks for the dropdown's rule; the dropdown rule includes column definitions</li><li>About 4 lines, plus one unit case</li><li>Mostly matters for sample-sheet workflow inputs, which feed `column_definitions` into the same parameter class</li></ul> | <ul><li>Applies only to direct matches. A mapped-over `sample_sheet` has no per-element columns to compare.</li><li>Small chance of rejecting sample sheets that run today despite incompatible columns</li></ul> |

### E. Expand: reject dataset-only DCEs bound to a collection parameter (not recommended)

`_check_collection_type` returns early when a DCE has no `child_collection`. The alternative would be to reject it ("a dataset was supplied, but this parameter accepts a collection").

| Pros | Cons |
| --- | --- |
| <ul><li>Closes the last unchecked branch of `from_json`</li><li>Every legitimate producer (`_split_dataset_collection` for `single_datasets`, the workflow callback in `modules.py`) wraps these in `PromoteCollectionElementToCollectionAdapter`</li></ul> | <ul><li>The workflow callback's own guard shows bare DCEs did reach this point historically; job reruns from stored params could hit them</li><li>Behaviour is unchanged from the base and no symptom has been reported</li><li>Review 1 and its reviewer agreed to leave it</li></ul> |

### F. Expand: match record `fields` (not recommended)

Reject `record` collections whose `fields` differ from the parameter's declared `fields`.

| Pros | Cons |
| --- | --- |
| <ul><li>Would complete structural validation for record inputs</li></ul> | <ul><li>Neither `accepts()` nor the dropdown compares `fields`, so there is no existing rule to align with. This would be a new matching feature, not a fix.</li><li>Record field semantics (optional fields, ordering) are undefined in the type algebra</li></ul> |

### G. Expand: workflow editor / save-time edge validation (not recommended)

Validate connection types server-side when a workflow is saved or loaded.

| Pros | Cons |
| --- | --- |
| <ul><li>Would catch bad typed edges before any run</li></ul> | <ul><li>The client terminals already reject incompatible typed edges</li><li>Untyped inputs can't be judged at edit time by design; B and C catch them at run time</li><li>Large surface (workflow import, format2, modules); belongs in a dev-targeted feature</li></ul> |

### H. Contract: enforce only at request time, not at job preparation (not recommended)

Skip the check in `_validate_incoming` (job prep), so that workflow edges passing incompatible collections through behave as before.

| Pros | Cons |
| --- | --- |
| <ul><li>Leaves existing workflow behaviour on the release branch untouched</li></ul> | <ul><li>Keeps running jobs with a structure the tool didn't declare. The issue's whole point is that this is wrong.</li><li>Needs a new flag to tell request time from job prep, which adds complexity instead of removing it</li><li>B gives a better workflow outcome than either option</li></ul> |
