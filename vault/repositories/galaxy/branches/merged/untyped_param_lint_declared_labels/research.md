# Research: editor flags `${label}` renames that a parameter input already fills

Read on `dev` at 0073b5e9224. Not reproduced in the UI or via jest (no `node_modules` in worktree).

## Verdict

Real bug, narrower than "every `${...}`": false positive for **rename PJAs** whose `${name}` matches a `parameter_input` step label. Tool-state `${...}` flags are correct (runtime never fills them from parameter inputs).

## What runtime does

- Rename only: `RenameDatasetAction._gen_new_name` (`lib/galaxy/job_execution/actions/post.py`) substitutes from `replacement_dict`. Other PJAs ignore it.
- `WorkflowProgress.effective_replacement_dict()` (`lib/galaxy/workflow/run.py:709`) merges `replacement_params` with `runtime_replacements`, populated from each labelled `parameter_input` step's value (`run.py:~697`).
- Tool state `${X}`: only the legacy expanded run form fills it client-side; the API never does.

## Precedent: the run form already exempts declared labels

`client/src/components/Workflow/Run/model.js:129-133`: PJA `replacement_parameters` matching `parameterInputLabels` don't get a workflow-parameter prompt. Tool-form `${X}` values (`model.js:120-127`) always do. The editor should apply the same rule.

## Editor side

- `getUntypedWorkflowParameters` (`client/src/components/Workflow/Editor/modules/parameters.ts:77`) regex-matches every `${...}` in tool-form values and in every PJA argument; never looks at step labels.
- Also flags non-rename PJA args (tags etc.), which runtime never substitutes. The extract fix only handles rename PJAs (`_iterate_over_rename_pjas`), so a tag-only `${X}` would fail extract with "Failed to find ${X}...". Separate, smaller issue; possibly in scope.

## User-visible symptom

1. Rename `${p} name`, no input `p` → lint warns; "extract untyped parameter" adds parameter input `p`, leaves rename as `${p}` (`refactor/execute.py:326`, `test_refactoring_legacy_parameters_without_tool_state`).
2. Lint re-runs and warns again on `${p}` — the fix never clears the warning.
3. Clicking fix again adds a second input labelled `p`. `_apply_add_step` doesn't check uniqueness; save should fail with `DuplicatedIdentifierException("Duplicated step label 'p'...")` (`managers/workflows.py:2159`). Unverified that refactor hits that path.

## Proposed fix

In `getUntypedWorkflowParameters`, collect labels of `parameter_input` steps; skip PJA rename matches whose name is one of them. Keep tool-state matches. Optionally restrict PJA scanning to `RenameDatasetAction.newname`.

## Test plan (red → green)

- New jest test for `getUntypedWorkflowParameters`: steps with `parameter_input` labelled `p` + tool step with rename PJA `${p} name` → expect no parameter `p`. Fails on `dev`.
- Controls: same without the input → flagged; tool-state `${p}` with the input present → still flagged.
- Existing: `useLinting.test.ts` ("correctly identifies untyped parameters").
