# Implementation debrief

**STATUS: READY.** Base `release_26.1` (`d808b6425b8`, retargeted in place from `dev`), head `e953ff7344a`, pushed to `jmchilton`. Issue galaxyproject/galaxy#24379.

## Final implementation

Runtime only substitutes `${name}` in `RenameDatasetAction.newname`, and a labelled `parameter_input` fills it. Editor lint and run form now follow that rule.

1. `f3775945b2e` Baseline tests for editor untyped workflow parameter lint (`parameters.test.ts` controls; `createTestStep` fixture options)
2. `6c9eb77d2fe` Baseline tests for run form rename replacement parameters (`_yaml_workflow_run_form` API helper)
3. `e9b935736d4` Extract replacement parameter names with one capture-group helper (client, base behavior)
4. `6fd00c8e64a` Editor lint: skip rename `${label}` backed by a parameter input; scan only rename `newname`; tool state still flagged
5. `5fcd37e1fc0` E2E: extract untyped rename parameter clears lint (+ `canvas_loading` selector, absent on 26.1)
6. `e953ff7344a` Backend `ToolModule.get_informal_replacement_parameters`: rename `newname` only (None-safe)

User-visible side effects (call out in PR body): run form no longer prompts for `${X}` only in non-rename PJAs (runtime ignored them); workflow attributes "Parameters" list shrinks the same way.

## Process

- Initial client-only fix on `dev` → first hardening pass (`earlier_drafts/1/`). Scope evaluation recommended expansion: backend narrowing + retarget to `release_26.1`.
- Re-scope: original kept as `untyped_param_lint_declared_labels_alt_original_scope` (`alts/original_scope.md`); see `implementation_rescope_debrief.md`. Normal review (`subagents/normal_review.md`) fixed two 26.1 rebase slips in the E2E (displaced `@selenium_only`, missing selector).
- Re-harden: test challenges moved backend tests unit → API and dropped one redundant client test; E2E polish no change; Codex no findings; thermo-nuclear generalized API helper + tightened backend loop; no baseline refactor; second scope evaluation: keep; screenshots captured.
- Thermo-nuclear dropped the helper's "exactly one tool step" unpack; kept as is since `steps[1]` with non-empty expected lists can't pass on the wrong step.

## Tests

- Client vitest (Editor + `workflowStepStore`, node 22.20.0): 273/273; red on base for fix tests.
- Backend `test/unit/workflows/`: 121 passed, 1 skipped.
- API `test_run_form_replacement_parameters_*`: 2/2; fix test red on base (`['a','d','t'] == ['a']`).
- E2E `test_best_practices_extract_untyped_rename_parameter`: Playwright + Selenium green on 26.1; red on base at final `ok` check.
- No CI yet.

## Deferred

- `extract_untyped_parameter` reuse existing labelled input instead of adding duplicate (needs type check + integration test).
- Dev follow-ups: per-action "substituted names" hook (drops `"RenameDatasetAction"` string checks in `modules.py`, `refactor/execute.py`); move ~6 inline run-form tests onto `_yaml_workflow_run_form`; share `${...}` regex with `Run/model.js`.
