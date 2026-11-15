Run via Claude Opus 5.5 at high effort.

# Thermo-nuclear review: wes_api_fixes_26_0

Acted on three findings: duplicated JSON-object parsing, an alias in `submit_run`, and a misplaced docstring line. Each was folded into the commit it belongs to. Five structural findings were not acted on: release-branch proportionality, or pre-existing structure the branch doesn't make worse. Reviewed at `adf14a0006a`. New head is `0bbc3e55ae8` on `release_26.0` (`9ae7ab9c1df`), not pushed. The child branch `wes_run_state_executor_error_26_0` was not touched and still sits on the old head.

## Not acted on

- **`test_wes.py` crosses 1000 lines (968 to 1106).** It is a single flat `TestWesApi` class, and the branch only appends tests. Splitting it on `release_26.0` would conflict with every merge forward. Recommended follow-up on `dev`: split by endpoint group (submission, runs/cancel, tasks).
- **`services/wes.py` is already past 1000 lines (1173 before, 1250 now).** The branch adds 77 lines, mostly small pure helpers. Recommended follow-up on `dev`: move request parsing (`_load_workflow_content`, `_parse_gxworkflow_uri`, `_parse_json_object`, `_parse_engine_parameters`, history selection) into its own module, and the task-row UNION query into another, leaving `WesService` as orchestration.
- **Engine parameters stay a loose `dict[str, Any]`.** A typed model (`history_id`, `history_name`, `preferred_object_store_id`, `use_cached_job: bool`) would remove the in-place `use_cached_job` rewrite and the `"key" in engine_params` probes in `_get_or_create_history`, `_generate_history_name` and Step 7. Pydantic's lax bool accepts `"yes"`, `"1"`, `"on"` and others, so this would widen accepted input on a release branch. The dict code is pre-existing and touches three call sites. Follow-up on `dev`.
- **`_discard_rejected_submission` sets `deleted = True` by hand instead of calling `WorkflowsManager.delete` / `HistoryManager.delete`.** Both managers' `delete` is `DeletableManagerMixin.delete`, a `setattr` plus commit, so behavior is identical today. `WesService` has no `HistoryManager` dependency and reaches the workflows manager only through the private `self._workflows_service._workflows_manager`. Adding a constructor dependency for an identical write isn't proportionate here. Follow-up: give `WesService` proper manager dependencies and route deletes through them.
- **`submit_run` is still one long method** that mixes workflow resolution (`gxworkflow://` vs import), history selection, invocation and the new cleanup. Extracting `_resolve_workflow(...) -> (invoke_workflow_id, instance, imported_workflow)` would make the cleanup scope obvious. That restructures pre-existing code the branch only wraps. Follow-up on `dev`.

Minor items considered and left alone: `TERMINAL_GALAXY_STATES` uses raw strings, matching `GALAXY_TO_WES_STATE` in the same file (deriving it from the WES states would need a fourth copy of the `GALAXY_TO_WES_STATE.get(...)` idiom or a helper touching pre-existing lines). `NO_REPLACEMENT_VALUE` repeats a literal that Galaxy also writes in `workflow/run.py` and `tools/parameters/basic.py`. A shared constant belongs in `tools/parameters/workflow_utils.py` on `dev`. The overflowing `use_cached_job` row in the docs table renders correctly.

## Changes made

| Commit (new SHA) | Change |
| --- | --- |
| `77b95d7775d` WES: cancelling a finished run leaves its state alone | Moved "Runs already in a terminal state are left unchanged." from between `Args` and `Returns` up into the `cancel_run` docstring's summary. |
| `c7b0d3501b6` WES: rejected submissions leave no workflow or history behind | Replaced the copy-pasted `_parse_engine_parameters` / `_parse_workflow_params` bodies with one `_parse_json_object(value, field_name)`; `_parse_engine_parameters` is now that plus the `use_cached_job` check, and `_parse_workflow_params` is gone (its call site uses `_parse_json_object` directly). Grouped the parsing helpers ahead of `_discard_rejected_submission`. Dropped the `stored_workflow` alias in the import branch (`imported_workflow = created_workflow.stored_workflow`). |

Other commits are unchanged: `2875e36a82f`, `3c2952bba2b`, `27d748a502c`. `0bbc3e55ae8` was only rebased.

## Tests and lint

- A direct check of the parsing helpers covered `None`, `""`, `"null"`, `"[]"`, `"3"`, invalid JSON, `{}`, boolean and string `use_cached_job`, and `"maybe"`. Results and error messages match the previous two functions.
- API tests, one per invocation, at the final tree: `test_wes_failed_submission_leaves_no_workflow_or_history`, `test_wes_submit_run_use_cached_job_boolean` and `test_wes_submit_run_format2_workflow` all pass. The cancel tests were not rerun, because that commit only moved a docstring line.
- `ruff`, `black --check` and `isort --check` are clean on `wes.py` and `test_wes.py`. `ruff` is also clean on `wes.py` at every commit in the series. `mypy` on both files reports nothing new. The only `wes.py` line flagged is the pre-existing `import yaml` (missing `types-PyYAML` stubs in the local venv). The other errors are in modules the venv lacks stubs for.

<details>
<summary>Full review</summary>

### Verdict

The branch is small and mostly well shaped. Each fix is local to the WES service, new logic sits in module-level pure functions rather than inline branches, and nothing leaks into Galaxy's shared invocation, model or manager layers. The release-branch constraint (don't change native API behavior) is respected: the `NoReplacement` mapping and the terminal-state cancel guard are both WES-only, and the debrief explains why. One real piece of duplication, plus two legibility nits, were fixed. The remaining findings are structural debt that predates the branch.

### 1. Copy-pasted JSON-object parsing (fixed)

`_parse_engine_parameters` and `_parse_workflow_params` were the same function twice: empty gives a default, `json.loads` raises `MessageException("Invalid JSON in <field>")`, JSON `null` gives a default, a non-dict raises `RequestParameterInvalidException("<field> must be a JSON object")`. They differed only in field name, in the default (`{}` vs `None`) and in the `use_cached_job` step. Extracted `_parse_json_object(value, field_name) -> Optional[dict]`. Engine parameters become `_parse_json_object(...) or {}` plus the boolean coercion. The workflow-params wrapper disappears.

### 2. Redundant alias in the import branch (fixed)

`stored_workflow = created_workflow.stored_workflow; imported_workflow = stored_workflow; invoke_workflow_id = stored_workflow.id` held two names for one object, and `stored_workflow` wasn't used afterwards on that path. Now `imported_workflow = created_workflow.stored_workflow; invoke_workflow_id = imported_workflow.id`.

### 3. Docstring sentence between `Args` and `Returns` (fixed)

`cancel_run`'s new contract sentence sat between docstring sections. Moved it into the summary. The inline comment stays because it gives the why: Galaxy's own `cancel()` rewrites completed and failed invocations.

### 4. Cleanup structure in `submit_run` (accepted)

The `tuple[History, bool]` return from `_get_or_create_history` exists only to drive cleanup, and `created_history` is set from the flag. Alternatives considered:

- Infer "created" from `"history_id" not in engine_params`. This duplicates the branch condition inside `_get_or_create_history`.
- Commit nothing until the invocation succeeds, so a rollback discards everything. This would delete `_discard_rejected_submission` entirely. It isn't available: `_get_or_create_history` commits (the "Postgres tests in CI fail without this commit" comment), `build_workflow_from_raw_description` commits, and so does `invoke_workflow`. Making the import and invocation transactional would mean changing shared workflow-creation code.
- Let `InvokeWorkflowPayload.new_history_name` create the history. The native path leaks the same way (`_get_target_history` runs before `_normalize_inputs` in `run_request.py`).

The explicit flag is the most direct option left. The broad `except Exception` with re-raise is right, because the cleanup must cover validation errors from `invoke_workflow` of every type. The swallowed-and-logged failure inside `_discard_rejected_submission` keeps the original error as the response.

### 5. Hand-rolled soft delete instead of managers (follow-up)

See "Not acted on". Behavior is identical to `DeletableManagerMixin.delete`. The real problem is that `WesService` lacks manager dependencies and reaches through `_workflows_service._workflows_manager` / `_workflow_contents_manager`, which predates the branch.

### 6. Loose engine-parameter dict (follow-up)

See "Not acted on". The branch adds one more shape assumption (`use_cached_job` is now a `bool` after parsing). It confines that to `_parse_engine_parameters`, the right place in the current design. A typed model is the code-judo move, but it changes accepted input on a release branch.

### 7. File sizes (follow-up)

`test_wes.py` crosses 1000 lines in this branch. `wes.py` was already over. Neither growth is spaghetti: tests are appended and service additions are standalone helpers. Decomposition is still warranted on `dev`, where it won't fight merge-forward.

### 8. `submit_run` length (follow-up)

The method was already a numbered-step script. The branch adds a try block around Steps 5 to 8 and pre-import parsing at the top. Both read clearly, and the comments say why. Extracting workflow resolution would shrink it substantially, but that is a refactor of pre-existing code.

### 9. Smaller observations (no action)

- `_get_invocation`'s anonymous check duplicates `list_runs`' own check with a different message. Unifying them touches pre-existing `list_runs`.
- `TERMINAL_GALAXY_STATES` is coupled to `GALAXY_TO_WES_STATE` only by a comment. It is acceptable as an explicit, boring list.
- Test helpers `_cancel_wes_run` and `_assert_cancel_leaves_state` earn their keep: four call sites and two call sites with four assertions each.
- `test_wes_cancel_run_failed_workflow` polls WES status with `wait_on`, which exercises the API under test. Fine.

</details>
