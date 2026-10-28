# Thermo-nuclear code quality review

Verdict: no structural regression. The diff is small and lives in the right layer, `summarize_job_parameters` in the manager. It reuses `security_agent.can_access_dataset` / `can_access_collection` and the DCE show endpoint's rule. One finding was acted on: `can_access_data_input` re-dispatched on type and used a nullable mode, so it was rewritten as a typed, explicit per-type check. Behavior is unchanged. Everything else is declined for a stable target or left as a dev follow-up.

Head after fixup + autosquash: `fba59af067f` (baseline `2ba71466913` unchanged).

## Acted on

- **Double type dispatch / reassignment ladder in `can_access_data_input`.** The loop already branches on HDA/DCE/HDCA. The helper then ran a second `isinstance` chain that reassigned `item` (DCE→collection, HDCA→collection), with a `DatasetCollection` branch that existed only because of the reassignment. Now:
  - one explicit return per input type: HDA → `can_access_dataset(item.dataset)`; DCE → `child_collection or collection`; HDCA → `collection`;
  - no reassignment;
  - `item` is annotated with a local `DataInput = Union[HDA, DCE, HDCA]`, also used by `data_input_value`.
- **Nullable mode.** `user_roles = None` used to mean "admin". It is now an explicit `is_admin` flag, and `user_roles` is always a list. The cost is one roles lookup for admins, which is negligible.
- Fixup squashed into the change commit; `jobs.py` only.

## Declined / follow-ups

- **File size.** `jobs.py` (1962 lines) and `markdown_util.py` (1442) were already over 1k before this branch, and the branch adds about 25 lines. Decomposing them is not stable-branch work.
- **Duplicated DCE access rule.** `dce.child_collection or dce.collection` + `can_access_collection` now appears twice: here and in `DatasetCollectionsService.dce_content`. Recommended dev follow-up: one helper (on the collections manager or `security_agent`) that both call. Also on dev: a manager-level accessibility check covering HDA/HDCA/DCE (`HDCAManager` has no role-based one today). Both are left out of 25.1.
- **Keep `data_input_value`.** It owns the "id only" response shape at three call sites, so it is not a pass-through wrapper.
- **No single-dispatch rewrite of the loop.** Passing an access target from each loop branch, or using a dispatch table, would put the DCE rule at the call site and evaluate collection relationships for admins too. That is churn without fewer concepts.
- **Markdown `_data_input_text` keys on `name is None`.** `HistoryDatasetAssociation.name` is nullable in the model, so an accessible unnamed HDA would render "(not accessible)". Before this branch, `EncodedJobParameterHistoryItem.name: str` rejected a `None` name, so this case did not render correctly before either. Accepted. The schema documents `name` unset as "can't access".
- **Test helpers** (`_run_for_parameters_display`, `_data_parameter_values`, `_make_dataset_public`) stay local to the test class. `make_dataset_public_raw` callers elsewhere expect failures, so a populator-level asserting variant isn't worth adding on 25.1.
- Tests untouched.

## Validation

- `.venv/bin/mypy lib/galaxy/managers/jobs.py`: no errors in `jobs.py` (remaining output is environment stub noise in other files).
- black / ruff / isort / flake8 at 25.1 pins: clean.
- `test_markdown_export.py`: 29 passed.
- `test_jobs.py -k "parameters_display or rerun or dce_submission"`: 15 passed.
