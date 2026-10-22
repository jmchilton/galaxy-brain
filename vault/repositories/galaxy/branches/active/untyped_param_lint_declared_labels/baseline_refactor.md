No refactoring of the base branch was performed.

This pass re-hardens the branch after its re-scope onto `release_26.1` with the backend fix. The client refactor `e9b935736d4` from the first pass (`earlier_drafts/1/baseline_refactor.md`) already comes before the fix. The backend fix contains nothing that would be worth a commit of its own with base behavior kept. History is unchanged, so no backup ref was needed.

## Candidates considered (backend `ToolModule.get_informal_replacement_parameters`, `e953ff7344a`)

- **Loop reshape** (inner `add` loop → `set.update(re.findall(...))`). With base behavior kept, it still has to loop over every PJA argument, so all it does is fold one 2-line inner loop. Compare the client refactor, which earned its own commit: it removed the duplicated `substring(2, -1)` slicing and the unused `getParameterFromMatch`. Not split out.
- **`newname` None guard** (`(pja.action_arguments or {}).get("newname") or ""`). This changes behavior: on base, a `None` argument raises in `re.findall`. It only exists because the fix reads `newname`, so it stays with the fix.
- **Docstring**: it states the new rename-only rule, so it stays with the fix.
- **Polymorphic "names this action substitutes" hook** on the action classes: the thermo-nuclear review deferred this to a dev follow-up. Not revived.
- **Elsewhere:**
  - `_yaml_workflow_run_form` is already in baseline `6c9eb77d2fe`.
  - The `navigation.yml` additions are new selectors for the E2E test, not a refactor.
  - The client fix `6fd00c8e64a` contains only behavior change: the label skip and the rename-only scan.

## Commits (unchanged, base `origin/release_26.1` `d808b6425b8`)

1. `f3775945b2e` Baseline tests for editor untyped workflow parameter lint
2. `6c9eb77d2fe` Baseline tests for run form rename replacement parameters
3. `e9b935736d4` Extract replacement parameter names with one capture-group helper
4. `6fd00c8e64a` Don't flag rename parameters backed by a parameter input in editor lint
5. `5fcd37e1fc0` Add E2E test that extracting an untyped rename parameter clears lint
6. `e953ff7344a` Only report rename post job action replacement parameters

`git diff origin/release_26.1 6c9eb77d2fe` touches only test files: `parameters.test.ts`, `test_fixtures.ts` and `test_workflows.py`. So both baselines run against base product code.

## Verification

| Commit | Client vitest (Editor + workflowStepStore, node 22.20.0) | `test/unit/workflows/` | API `-k test_run_form_replacement_parameters` |
|---|---|---|---|
| `f3775945b2e` | 271/271 | 121 passed, 1 skipped | n/a |
| `6c9eb77d2fe` | skipped (no client change) | n/a | 1/1 (baseline passes) |
| `e9b935736d4` | 271/271 | n/a | n/a |
| `e953ff7344a` | 273/273 | 121 passed, 1 skipped | 2/2 |

- `test/unit/workflows/` has no diff against base. Running it is only a sanity check.
- API tests ran one at a time through `pytest` directly, with the standard backend-test env (`GALAXY_TEST_TOOL_CONF` = sample + functional tools).
- That the fix test is red on base `modules.py` was confirmed in `test_challenges_debrief.md`. It was not repeated here.
- E2E was not run.
- Nothing was pushed.
