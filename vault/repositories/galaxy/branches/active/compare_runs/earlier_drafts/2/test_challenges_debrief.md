# Test challenges debrief (hardening iteration 2)

**Status: done, not blocked.** I made eight new commits on `compare_runs`, after `474d7314ac5`, ending at `f29a3b12767`. Nothing is pushed. They drop two tests, move one unit test to the API layer, add one API test and one E2E step, strengthen two tests, add two helpers and a shared `test-utils.ts`. Every changed test was run at its own layer, and both baseline checks were run. One finding needs the coordinator: the defaulted-input fallback from `008e81e5089` is never reached by a real defaulted input. See "For the coordinator" below.

## Commits

| Commit | What | Why |
|---|---|---|
| `0e3272b6565` | `versionless_tool_id` and `versionlessToolId` now share one spec, `lib/galaxy/util/versionless_tool_id_spec.yml`. It is symlinked into `client/src/utils/` and listed in `packages/util/MANIFEST.in`, the same way `rules_dsl_spec.yml` is. | The TS test said it "mirrors the server's" function, but it had 2 cases that Python lacked (`local_tool/1.0` and `.../tool/latest`). **Strengthening:** Python now checks all 7. |
| `56e9554020a` | **Drop** the 5-case `it.each` "%s reads %s with a reason title" from `ComparisonCell.test.ts`. | It repeated `comparisonUtils.test.ts` `missingText` word for word. The cell keeps its "not supplied" check (the role reaches `MissingCell`) and its inaccessible-item check. |
| `b7e56f0f0fc` | **Strengthen** `JobInformation.test.js` "leaves it off for internal tool". Each case now first sees the link for a Tool Shed tool. | Red check: all 3 cases passed on `dev` sources, where no link exists at all. They fail there now. |
| `6691d320fa5` | **Rewrite at the API layer:** the unit test `test_output_runs_present_in_versions_counts_versions_without_labels` becomes API `test_output_runs_version_without_labelled_io`. **Add** API `test_step_runs_defaulted_data_input`. Move `_default_file_location` from `test_workflows.py` into `workflow_fixtures.default_file_dataset_input_location`, and point test_workflows' 3 callers at it. Rename `TestComparisonsManagerStatementCount` to `TestComparisonsManager`. | The unit test built both versions by hand. The API test uses a real refactored workflow whose version 0 (v1 in the UI) has no labelled inputs or outputs. Red check by reasoning: before `8fe474b10c1`, version 0 (v1 in the UI) is absent from `declared_by_version`, so `present_in_versions` would be `None`. The API test then fails on `[1]`. |
| `1266cf1fc6d` | The new `test_datasets.py` metadata-key tests read the contents URL through `get_history_dataset_details(keys=)`. The repeated `datasets/{id}?view=summary` GET gets a `_show_summary` helper. | Both changes reuse existing populators and add status checks; before this, the bare `_get(...).json()` calls never checked the status. |
| `98c2ba9b9a3` | Type the YAML import in `tool-version.test.ts`. | `vue-tsc` rejected the untyped `it.each` from `0e3272b6565`. |
| `f29a3b12767` | Add `Comparison/test-utils.ts` with `STEP_RUNS_TABLE`, `ITEM_LINK_STUB`, `JOB_PARAMETERS_DIFF_STUB` and `seedDisplayPrefs`/`displayPrefsKey`. Point 10 Comparison tests at it. | The client README's `test-utils.ts` pattern: before this, the table cast was copied in 10 files, the link stub in 3, the parameters stub in 2 and the prefs seeding in 3. The `JobInformation`/`StoredWorkflowInvocations` anonymous-user literal is left alone: `tests/test-data` has no anonymous factory, and 2 uses outside Comparison didn't justify adding one. |
| `0a703b23feb` | **E2E:** `test_comparison_pages_from_entry_points` also opens "Other runs of this tool" from the dataset details page. **Drop** the `DatasetDetails.test.ts` "offers other runs of the creating job's tool" test and restore its stub to dev's. | The dataset entry point added in the re-scope had no E2E coverage. The dropped unit test only checked the props passed to JobInformation, which the E2E now covers. |

## For the coordinator

- **The defaulted-input fallback (`008e81e5089`) is not reached by a real default.**
  - I first wrote the API test with a temporary assertion that `invocation["inputs"] == {}`.
  - It failed: Galaxy records a format2 data input's `default:` file as a request input (`{'0': {..., 'label': 'default_file_input'}}`). The recording happens in `lib/galaxy/workflow/run.py:701-706`, which calls `invocation.add_input(content, step.id)` for any input step without one.
  - So the new API test passes with or without the fallback. I **kept** the unit test `test_step_runs_data_input_without_request_input`, which is the only thing that exercises it.
  - Decide whether the fallback is still needed (legacy invocations?) or is dead code. Remove it and its unit test only if it is dead code.
- **Fold candidate:** the baseline `test_io_names_probe` (in `5f1ddb3fd99`) only exercises job APIs. It belongs in `test_jobs.py` so a baseline-only PR doesn't add `test_comparisons.py`. I didn't rewrite history; fold it at the next history fold.

## Challenged, kept

- **Statement-count, tool-shed-wildcard, duplicate-output-label, cell-builder and `inlinable_expression` unit tests:** none of these can be built through the API, or they are pure functions.
- **`test_admin_sees_inaccessible_items`:** it needs an admin-owned run over another user's private dataset. The API populators can't run tools as admin.
- **`test_multiple_input_members_checked_for_access`:** it could move to the API, using `multi_data_param` across two users plus `make_private`. That costs another cross-user API scenario for a member-level check the unit test already pins cheaply. Judgement call: kept.
- **`test_serialize_metadata_included`:** this overlaps API `test_show_single_metadata_key`. `included=set()` is still reachable from `comparison_cells.dataset_cell` (a requested element the datatype lacks), and the API doesn't cover it.
- **Vitest overlap:** `useComparison` retry, StepRunsTab and ComparisonView each test retry, but through different paths (refetching the same params vs the Retry button). The `fieldKeys` test is trivial but pins a real hazard: an input and an output with the same name.
- **Prop-wiring tests in JobDetails (`showHeader=false`):** kept, because the E2E doesn't cover them.
- **E2E-overlapping ComparisonTable tests:** each also asserts aria state, highlighting or ordering that the E2E doesn't check.
- **No faked layout:** grep finds no `getBoundingClientRect`, `scrollIntoView` or `useElementBounding` in the changed tests. They don't set `wrapper.vm` state either.
- **API helpers:** the pause-review PUT and the unpublish/disable-link PUTs are used once each, so no helper was added.

## Verification

- **Baseline tests pass without the branch.** I used a scratch worktree at the baseline tip `3de6b98b9e6` and confirmed its `lib` was the one imported.
  - `test_HDAManager -k serialize_metadata`: 6 passed.
  - Vitest `DatasetPopoverLink`, `ToolExecutionJobs` and `handlesMappingJobs`: 16 passed.
  - The API baselines (`test_jobs`, `test_datasets`, io probe) were not run at that tip; the reasoning is that they only read existing fields.
- **Red check:** on `dev` sources (`fd43a3c6ce8`) with the branch's test files, 10 new tests fail at their assertions: GTable `detailsShowing`, 5 ToolExecutionJobs batch tests, JobDetails, JobInformation and StoredWorkflowInvocations. The JobInformation internal-tool cases passed there until `b7e56f0f0fc`.
- **Unit:** `test_ComparisonsManager.py` 18 passed and `test_tool_version.py` 7 passed.
- **API, run one module at a time:**
  - `test_comparisons.py`: 26 passed. The 1 failure was the temporary precondition above, which I then removed.
  - The new and changed tests in `test_comparisons`, `test_datasets` and `test_workflows` (default file tests): 7 passed.
- **Vitest:** `Comparison/`, `JobInformation/`, `DatasetInformation/` and `tool-version`: 22 files and 218 tests passed. After `test-utils.ts`, `Comparison/` alone: 12 files and 154 tests passed.
- **Client type check:** `vue-tsc --noEmit` reports 0 errors after `98c2ba9b9a3`.
- **Playwright:** `test_comparisons.py` 2 passed, on Galaxy at 127.0.0.1:8091 (gunicorn) and vite on 5174.
  - Gunicorn needed `OBJC_DISABLE_INITIALIZE_FORK_SAFETY=YES`.
  - The configured `login_email` couldn't log in to the worktree DB, so I dropped it from a scratch copy of the context and a fresh user registered.
  - Both servers were killed by PID afterwards; the ports are free.
- **Lint:**
  - black, isort, ruff and the pre-commit hooks (including prettier and eslint) are clean on every commit.
  - mypy run per file reports `warn_return_any` on the new `workflow_fixtures` helper. That is an artifact of running it per file: `mypy.ini` sets `warn_return_any = False` for `galaxy_test.*`. I didn't run `make mypy`.
