# issue_20900_invocation_validation — implementation debrief

Branch `issue_20900_invocation_validation` at `9be940c74d0` (11 commits), off dev `4fe00d9e7ab`. Pushed to `jmchilton/galaxy`. Worktree: `~/projects/worktrees/galaxy/branch/issue_20900_invocation_validation`.

## Goal
#20900: reject bad workflow invocation requests at the API (400/403/404) before any side effects, instead of failing at scheduling as an `unexpected_failure`, a 500, or Sentry noise. The example in the issue is an int reaching a text `parameter_input` via `planemo run`.

## What's checked at submission now
**Parameter inputs** — `InputParameterModule.validate_input_value` in `modules.py`:
- Type checks.
  - text, color and directory_uri must be `str`.
  - integer accepts an int or an int string; float accepts int, float or a numeric string; boolean accepts a bool or `"true"`/`"false"`.
  - `bool` is rejected for int and float.
- `restrictions` are enforced through the select parameter's `from_json`. `suggestions` are not.
- A `TypeError` from a validator becomes a 400.
- `multiple` text values are checked one by one. This lives in `TextToolParameter.validate`, so the check at scheduling agrees with the one at submission.

**Data inputs** — `InputModule` and `InputDataCollectionModule.validate_input_content`:
- A dataset sent to a collection input is rejected.
- `collection_type` must pass `HistoryQuery.direct_match` or `can_map_over`, the same rule the run form uses.
- Deleted or purged HDAs and deleted HDCAs are rejected.

**Missing objects and access** — a missing hda, ldda, ld or hdca now gives a 404 instead of a 500, and an inaccessible one gives a 403 instead of an `assert`. Error messages name the step.

**Other request fields:**
- `scheduler` id must be known (`services/workflows.py`).
- `preferred_*object_store_id` is checked with `validate_preferred_object_store_id`.
- `on_complete` action names are checked against the DI-registered `WorkflowCompletionHookRegistry`.
- The landing request is resolved, with an ownership check, before anything is queued.

**Tools** — tools that are not workflow-compatible are rejected inside the existing missing-tools check. That check now looks each tool up once (`ToolLike.is_workflow_compatible` was added to the protocol).

**Ordering** — `build_workflow_run_configs` now validates everything first. That includes the batch, replacement-param, resource-param and effective-outputs checks, plus `populate_module_and_state` for step overrides and upgrade messages. Only then does it create histories, convert LDDAs and dereference URLs.

**Small fixes:**
- `no_add_to_history: false` is honored.
- The dead `step_parameters` check is removed.
- `workflow_parameter_invalid` is added to `FAILURE_REASONS_EXPECTED`.

## Design choices
- **Legacy `ToolParameter` path, not the typed `tool_util_models` models.** The typed models are strict (`StrictInt`/`StrictBool`), so they would reject the numeric strings the run forms may post. They also have no text/int `multiple`, and `directory_uri` is an `AnyUrl`.
  - The branch agrees with the tool request API on rejecting int→text and bool→int. It is deliberately looser on numeric strings.
  - `asbool`/`string_as_bool` were not usable: they accept yes/on/1, or never reject.
- **Checks live on the input modules,** so scheduling can share them later. They are not wired into `execute()`, because subworkflow parameter steps receive connected values there.
- **`populate_module_and_state` now runs twice per run:** once in validation, once in `queue_invoke`. This is in-memory only. Reusing the first result would depend on a hidden side effect that survives a commit, and the session expires on commit.

## Deliberately not done
- **A disconnected required input on a subworkflow is still not rejected at submission.** `test_subworkflow_missing_input_connection_error` (mvdbeek, bcd9bb2cc93) asserts that the invocation is created and then fails at runtime. Changing it needs John's OK.
- **Defaults are not type-checked.** Doing so could reject published workflows whose defaults the user can't fix.
- **An hdca sent to a dataset input is allowed.** That is input-level map-over, which `test_workflow_input_mapping` relies on.
- **`on_complete` `target_uri` is not checked.** No request-time validator fits, and `test_completion_export_config_accepted` accepts an unconfigured `gxfiles://` target.
- **Out of scope:**
  - optional-input items, which overlap `optional_input_gating`
  - import-time lints, e.g. `when` syntax, which belongs to `issue_23424_when_expression_validation`
  - format/extension checks (false positives)
  - unknown-key warnings (no warning channel)
  - batch size cap
  - `extra="forbid"`
  - scheduler retry-forever

## Review findings not acted on
- **Two tests the reviewer suggested trimming,** pending John's OK:
  - `test_workflow_parameter_invalid_is_expected_failure` only asserts a constant.
  - The six-case wrong-type API parametrization could shrink to two cases.
- **URL collection requests can still leave an orphan history.** `dereference_input_to_hdca` validates sample-sheet metadata after the history is created. Not fixed.
- **`InputParameterModule.execute` still catches only `ValueError`.** A connected value of the wrong type that reaches a validator at scheduling can raise an uncaught `TypeError`. This predates the branch.
- **`history="hist_id="` with an empty id** now names the new history `hist_id=` instead of using the default name.
- **`requires_materialization` across batch runs:** once one run in a batch needs it, all later runs are marked too. Dev behaves the same.

## Behavior changes to flag in the PR
- A required integer submitted as `""` is now a 400.
- Tool errors are now reported before parameter errors.
- The landing ownership check means an unclaimed private landing, or another user's landing, is refused. Public unclaimed landings still work.
- `WorkflowsService` now takes a `LandingRequestManager` and a `WorkflowCompletionHookRegistry` by DI.

## Tests
New API tests in `test_workflows.py`:
- wrong-type and string parameters
- restrictions
- validated text of the wrong type
- multiple text
- dataset given to a collection input
- incompatible collection type
- deleted inputs
- nonexistent inputs (hda, ldda, ld, hdca)
- library dataset input
- unknown scheduler
- object store that can't be selected
- unknown `on_complete` action
- unknown landing UUID
- tool that isn't workflow-compatible
- `no_add_to_history`
- no history created by an invalid request or an invalid step parameter

Also unit tests in `test/unit/workflows/test_modules.py` and `test_landing.py`, and a doctest on `TextToolParameter`. Nearly all were red, then green.

Runs, one at a time:
- Unit: 219 passed.
- API: 48 passed after review (71 and 27 in earlier runs).
- Landing and completion: 13 passed.
- Hierarchical object store integration: 28 passed.
- Framework workflows: 87 passed, 1 failed (`directory_index_1`), which fails the same way on base `4fe00d9e7ab`.

mypy (run from `lib/`) is clean on touched files, as are black, isort and ruff.

## Open
- Fork CI has not run.
- Decide on the subworkflow disconnected-input test, and on trimming the two tests.
