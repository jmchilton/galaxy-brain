# Re-scope debrief

## Re-scope

Expanded per `earlier_drafts/1/scope_evaluation.md` (scopes 2 + 3):
- Retargeted in place `dev` → `release_26.1` (4 client commits rebased onto `d808b6425b8`). Original kept as `untyped_param_lint_declared_labels_alt_original_scope` (`3d381403e21`, see `alts/original_scope.md`).
- Backend: `ToolModule.get_informal_replacement_parameters` (`lib/galaxy/workflow/modules.py`) now reads `${...}` only from `RenameDatasetAction` `newname`, matching runtime (`post.py`; only rename uses `replacement_dict`), the editor lint and `_iterate_over_rename_pjas`. `SubWorkflowModule` aggregates child steps, so it narrows too.

## Rebase sanity check

`pnpm install` (lockfile sync), then on node 22.20.0 with `--no-experimental-webstorage`: `vitest run src/components/Workflow/Editor src/stores/workflowStepStore.test.ts` gave 30 files, 274/274 passing. The rebase needed no fixes.

## Caller audit

- The only backend caller is `managers/workflows.py` (run form model, `step_model["replacement_parameters"]`).
- The only client consumer is `Run/model.js:129`. It uses the list only to decide which workflow-parameter prompts to add.
- `run_request.py` passes `replacement_params` from the payload straight into `replacement_dict`. It is never checked against this list, so API-supplied params can't be rejected.
- No schema model declares the field.
- Existing `${...}` test workflows (`replacement_parameters_*.gxwf.yml`, `optional_param_default_value`, legacy `.ga`) use only rename, or use tool state for `${...}`.
- I also checked `test/` and the workflows embedded in `.py` files (`workflow_fixtures.py`, `test_workflow_run.py`, `test_workflows.py`). Every `${...}` there is a rename or `newname`, or is markdown `${galaxy ...}`, and nothing asserts on non-rename prompts. mypy is clean on `modules.py`.
- User-visible change: the run form stops prompting for `${X}` that appears only in non-rename actions (tags etc.). Runtime ignored those values anyway.

## Tests (red → green)

The tests are in `test/unit/workflows/test_modules.py`:
- `test_tool_informal_replacement_parameters_from_rename` (baseline commit): rename `${a} ${b}` → `[a, b]`. Passes before and after.
- `test_tool_informal_replacement_parameters_ignore_non_rename_actions` (fix commit): rename `${a}` plus tag `${t}` plus change-datatype `${d}` → `[a]`. Red before the fix (`['t', 'd', 'a'] == ['a']`), green after.
- The full `test/unit/workflows/` suite passes: 123 passed, 1 skipped.
- Env: `.venv` symlinked to the main clone, `PYTHONPATH=lib`, `-p no:asyncio`.
- E2E was not rerun.

## Commit order

The backend baseline was reordered with a scripted rebase to sit right after the client baseline. Tree identical to the pre-reorder HEAD.

```
f3775945b2e Baseline tests for editor untyped workflow parameter lint
439fc23cef5 Baseline tests for tool step informal replacement parameters
ff309d6e43f Extract replacement parameter names with one capture-group helper
0ab9af61e8e Don't flag rename parameters backed by a parameter input in editor lint
1d1638243b2 Add E2E test that extracting an untyped rename parameter clears lint
2d6dc2f5099 Only report rename post job action replacement parameters
```

Not pushed.

## Deferred

- Scope 4: deduplicating `extract_untyped_parameter` against an existing labelled `parameter_input` (`refactor/execute.py`). It is out of scope. The editor no longer offers the fix for the reported case, and the change needs a type check plus an integration test. It belongs in a follow-up.
- PR body should mention that the attributes "Parameters" list and the run-form prompts now both follow the rename-only rule.
