# Test challenges debrief (re-harden after re-scope)

Fresh pass over the re-scoped branch on `release_26.1`. Three changes:
- Moved the two backend unit tests up to the API layer (run form download).
- Dropped one client unit test that another unit test and the E2E test already cover.
- Left the E2E test unchanged.

Rewrote local history. Both "Baseline tests" commits are still first and pass on base. Nothing pushed. The pre-rewrite head is saved as `backup/untyped_param_pre_challenge2`.

| SHA | Commit |
|---|---|
| `f3775945b2e` | Baseline tests for editor untyped workflow parameter lint (unchanged) |
| `37846773cb9` | Baseline tests for run form rename replacement parameters (was the `test_modules.py` unit baseline) |
| `98e3404ed2e` | Extract replacement parameter names with one capture-group helper |
| `00bc82bf130` | Don't flag rename parameters backed by a parameter input in editor lint (redundant test dropped) |
| `77afe064534` | Add E2E test that extracting an untyped rename parameter clears lint (unchanged) |
| `c6bee9917cf` | Only report rename post job action replacement parameters (red unit test replaced by red API test) |

## Backend: unit → API

**Why it moved:** the old tests in `test/unit/workflows/test_modules.py` called `ToolModule.get_informal_replacement_parameters` with a `MockTrans` and a mocked tool. The behavior users see is `replacement_parameters` in the run form payload (`managers/workflows.py`, `style="run"`). No API test asserted that field, and `_download_workflow(style="run", history_id=...)` already has precedents. That matches the process rule "could easily be tested by an API test, so rewrite it there". The assertions are the same, so this is not a weakening.

**What changed:**
- `test_modules.py` now has no diff against base. The `__tool_module_with_post_job_actions` helper is gone too.
- New helper `_run_form_tool_step_replacement_parameters(workflow_yaml)` in `BaseWorkflowsApiTestCase`. It uploads the workflow, downloads the run form, picks out the single tool step and returns its sorted `replacement_parameters`. Both tests use it.

| Test | Commit | On base `modules.py` | On branch |
|---|---|---|---|
| `test_run_form_replacement_parameters_from_rename`: rename `${a} ${b} suffix` gives `["a","b"]` | baseline | passes | passes |
| `test_run_form_replacement_parameters_ignore_non_rename_actions`: rename `${a}`, `add_tags` `name:${t}`, `change_datatype` `${d}` gives `["a"]` | fix | **fails**: `['a','d','t'] == ['a']` | passes |

I ran both: on the branch, then again with `modules.py` checked out from `origin/release_26.1`. The red test fails at its own assertion. Upload and download still work when the datatype is `${d}`.

## Client vitest (`modules/parameters.test.ts`)

**Dropped:** "skips a rename parameter filled by a parameter input with that label". Two other tests already cover it:
- "flags only undeclared names in a mixed rename" tests the same skip on the same name, plus the per-name split. It also catches an "all or nothing" implementation that the dropped test would miss.
- The E2E test covers the same end-to-end behavior: after extraction, `${replaceme}` with input `replaceme` is no longer flagged.

**Kept (4 tests):**

| Test | Rule | On base `parameters.ts` |
|---|---|---|
| flags rename with no matching input | control | passes (baseline) |
| flags only undeclared names in mixed rename | per-name skip | **fails**: `['sample','replicate']` vs `['replicate']` |
| flags tool state even with matching input | tool state not exempt | passes (baseline) |
| ignores non-rename PJA args | rename-only scan | **fails**: `['sample']` vs `[]` |

- I kept "flags rename with no matching input" even though the mixed and E2E tests touch the same rule. It is the only baseline that pins PJA rename flagging on base. The mixed test is red on base, and the `lint_steps.json` fixture only has a tool-state `${...}`.
- Against the client README and `writing_tests.md`: there are no mocks, no mounting and no faked layout. The steps come from the shared `createTestStep` builder, and the tests go through the public function. Nothing to rewrite there, and no implementation refactor is needed: `getUntypedWorkflowParameters` is already a pure function over `Steps`.

## E2E (`test_workflow_editor.py::test_best_practices_extract_untyped_rename_parameter`)

**Unchanged and not run**; the later E2E polish step reruns it.
- It reuses `WORKFLOW_RENAME_ON_REPLACEMENT_PARAM` and the navigation component selectors.
- It wraps the final lint check in `retry_assertion_during_transitions` and waits for the canvas loading shade before acting.
- It has no `@selenium_only`, so it must pass under both Selenium and Playwright.
- It is red on base by reasoning (confirmed empirically in the first pass): the extract adds input `replaceme`, but lint still flags `${replaceme}`.

**Not added: a run-form E2E for the backend change.** The new API test checks the payload the run form consumes, and `Run/model.js` logic is unchanged.

## Results

- Backend unit tests (`PYTHONPATH=lib pytest -p no:asyncio test/unit/workflows/`): 121 passed, 1 skipped.
- Client vitest (Editor plus `workflowStepStore.test.ts`, node 22.20.0, `--no-experimental-webstorage`): 273/273 in 30 files. The first pass reported 382 in 38 files because it ran on a `dev` base. This pass ran on `release_26.1`, so the drop is not lost tests.
- The 2 new API tests pass on the branch. On base `modules.py`: baseline passes, fix test fails as intended.
- Pre-commit hooks (black, ruff, flake8, prettier) are clean on the rewritten commits.

## Not done

- E2E not run, per instructions.
- Scope 4 (`extract_untyped_parameter` dedupe) remains deferred.
