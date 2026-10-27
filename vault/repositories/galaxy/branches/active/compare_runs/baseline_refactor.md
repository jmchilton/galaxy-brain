Eight refactors of existing code now sit on the base, between the 7 "Baseline tests" commits and the feature: metadata keys by name, a workflow_fixtures test helper, the NavigatesGalaxy helper move, ItemPopoverLink, totalMatches, downloadBlob, useExecutionJobs (+ Markdown selectors) and the router `reuseOnQueryChange` helper. Fixup commits were folded in where that was clean, so the history went from 71 commits to 62. The final tree is unchanged (`git diff 1a9720d93dd 3cd60c9cb57` is empty).

## How the work was refactored

Hardening iteration 2. The history was rebuilt by cherry-pick and path-split from `fd43a3c6ce8`. Backup: `jmchilton/compare_runs_pre_refactor2` = `1a9720d93dd`, and local `compare_runs_pre_refactor2_local`.

### Refactor block (on the base; each keeps base behaviour)

- `54789e9ae54` `serialize_metadata(included=)` / `keys=metadata_<name>`. Only adds to its baseline. The populator cleanup of `1266cf1` is split: the baseline test part goes into the baseline commit, the rest into this one.
- `0aa158e3d10` `default_file_dataset_input_location` moves into `workflow_fixtures`. Split out of `6691d32`. Its base caller is `test_workflows`.
- `f26c4925072` Invocation graph helpers plus `retry_assertion_during_transitions` move into NavigatesGalaxy, and `framework.__all__` re-exports it. Split out of `1593627`. Its base caller is `test_workflow_invocation_graph`. `assert_current_url_contains` stays in the E2E commit, because base has no caller for it.
- `f8d6709effe` ItemPopoverLink. This one does change markup on base. The DOM id becomes unique (`useUid`) and the popover class becomes `.item-details-popover`. As a result, `DatasetPopoverLink.test.ts` changes 3 selectors and 2 stubs, with no assertions added or dropped. The commit message says so.
- `087b45ddf2c` `totalMatches` (about 12 base callers).
- `578d2a22249` `downloadBlob` (2 base callers). Its `download.test.ts` is kept here and deleted in the E2E commit, as before.
- `958574ce599` `useExecutionJobs` / ToolExecutionJobs batch paging. Only adds to the `ToolExecutionJobs` baseline. Tool-request callers are unchanged.
- `5091398f33f` Markdown selectors go through `useExecutionJobs`. Its baseline (`handlesMappingJobs.test.ts`) is untouched.
- `e15ba92a4e5` `centerRouterViewKey` + `meta.reuseOnQueryChange`. The `1f31733` rename is folded in. The `#24307` rationale is merged into the message. The `/comparisons` route's flag moves into the `/comparisons` page commit.

### Listed candidates kept with the feature

- **`58dae6b`** (job `tool_version` / `copied_from_job_id` / index filter): new API surface with no base caller. Moving it would also put a schema change ahead of the client refactors without a regen.
- **`b1b1a25`** (access helpers): new methods, no base caller.
- **`9d74094`** (GTable `detailsShowing`): no base caller.
- **`33582f4`** (JobParametersDiff): no base caller.
- **`run_tool_and_show_job`**: now part of the io-names baseline (see below), so it is not a separate refactor.

### Folds

- **io-names baseline `f2f48b59ad5`**: absorbs `6e29347`. The probe lives in `test_jobs.py` from the start, using `DatasetPopulator.run_tool_and_show_job`, so baselines no longer add `test_comparisons.py`. `step_runs` creates `test_comparisons.py` without the probe. The multiple-data test (`70b7112`) uses the populator helper directly. The rest of `6e29347` came out empty and was dropped.
- **Metadata-keys baseline**: absorbs the baseline part of `1266cf1`.
- **Access helpers `b1b1a25`**: absorbs the `SessionTrans` part of `ce22abb`.
- **`cae3d8d`**: absorbs `77a15ba`.
- **`2ba18b7`**: absorbs the `test_comparison_records.py` part of `1a9720d`.
- **Page `e1b596c`**: absorbs the `router.js` part of `1f31733` and the ComparisonPager shallowMount part of `1593627`.
- **Entry points `2b10a5f`**: absorbs the JobDetails, JobInformation and StoredWorkflowInvocations test edits from `1593627`, plus `b7e56f0` and the `DatasetDetails.test.ts` part of `0a703b2`.
- **`0e3272b`**: absorbs `98c2ba9`.
- **`2f51f4d`**: absorbs `646605b` and the `comparisonUtils.test.ts` part of `1a9720d`. Messages merged.
- **E2E `3cd60c9cb57`**: the rest of `1593627` plus the selenium part of `0a703b2`, `dade380` and `f2b1acc`. It moved to the end because it covers the editor link, reused badge and output filter.
- **Backend-only commits moved ahead of the single schema regen**: `6691d32`, `dfcca6a`, `3273c6e`, `028ebf8`, `4679325`, `2ba18b7`. None of them touch the schema, and `schema.ts` is byte-identical to the original regen.

### Not folded (not clean)

- **`56e9554` → `c1fd62b`**: conflicts in `ComparisonCell.test.ts`.
- **`008e81e` / `028ebf8`**: not net-zero (`is_input_step` remains), and `6691d32`'s message refers to the fallback unit test.
- **`ce22abb`** (the rest) and **`f29a3b1`**: each amends many commits.
- **`13d7c32`, `b527b29`, `08c9ff6`, `7675514`**: features in their own right.

Messages that cited old SHAs now cite `df7c6b15ccc` and `f5b7d40e506`.

## New commit list

```
5d47beec7ae Baseline tests for job index/show response fields
3d9fb09af62 Baseline tests for DatasetPopoverLink link/popover wiring
267dfae1fd1 Baseline tests for HDA metadata serialization
f2f48b59ad5 Baseline tests for job input/output association names
89d1467570b Baseline tests for ToolExecutionJobs
ded9e0313e1 Baseline tests for useMappingJobs
b40ff056bbd Baseline tests for dataset metadata keys serialization
54789e9ae54 Allow selecting serialized dataset metadata elements by name
0aa158e3d10 Share the default file dataset input location in workflow_fixtures
f26c4925072 Move invocation graph Selenium helpers into NavigatesGalaxy
f8d6709effe Generalise DatasetPopoverLink into ItemPopoverLink with unique DOM ids
087b45ddf2c Share total_matches parsing as totalMatches in @/api
578d2a22249 Share one helper for saving a browser-built blob as a file
958574ce599 Page through a mapped batch's jobs in ToolExecutionJobs
5091398f33f Load Markdown job selectors' batch jobs through useExecutionJobs
e15ba92a4e5 Let a route keep its center view mounted across query changes
bc01e138834 Add batched dataset and sharable item access checks
45e159ff18f Add comparison table models and column alignment helpers
3db57c231e2 Add step_runs comparison endpoint
df7c6b15ccc Expose tool_version and copied_from_job_id on jobs, filter the index by tool_version
27a56b57cb4 Add output_runs comparison endpoint
213434079ab Add tool_runs comparison endpoint
1951e3c32de Filter only outputs by output_labels and expose the output label facet
d97daf8b459 Filter step and output runs by workflow version
bc3288f53a4 Challenge comparison tests: pure inline gate, mixed-state batches, invoke helper
25a46608ebd Show a labelled input step's own input in step_runs
43012007171 Pin a skipped step's step_runs cells against a later version's run
1bffd5cba99 Return every dataset of a multiple data input as a dataset_list cell
f5b7d40e506 Fall back to an input step's output when it has no request input
12cc49d94d5 Show a skipped job's outputs as skipped in step and tool runs
15817906bb7 Declare step_runs input columns from each version's step definition too
4d9b7592e8c Offer only invoked workflow versions in the version filter
fc78ad32e55 Pin output_runs version alignment and defaulted inputs at the API
a72e19b6792 Filter mapped batches by the state their row shows
cad04a52100 Judge a not-yet-run step_runs row against its version's columns
cf0d34cf01e Drop the unreachable defaulted-input fallback in step_runs
eb49f692c55 Show a skipped step's placeholder dataset as skipped in every mode
09c704d08b5 Decompose the comparisons manager around one submission record
cf22203a483 Regenerate client API schema
07f49a91098 Expose detailsShowing to GTable cell slots
c942a6449a1 Add JobParametersDiff for two jobs' parameters
3a006340595 Add ComparisonTable component and cell renderers
8ac6265193a Add /comparisons page
3f1a2f8d6b0 Link comparisons from the step card, job, dataset and workflow pages
a87aab75775 Mark comparison cells that differ from the current run
bbea06b4860 Compare two selected runs side by side
fed736a0726 Export a comparison page as CSV or TSV
924465305a1 Filter comparisons by state and workflow version
b22d2b84437 Page through a mapped batch's jobs in comparison row details
388b75eab6c Diff only the comparison's visible fields and columns
1e9f86e5578 Highlight an expanded run's parameters that differ from the viewed run
b1dc32b61e0 Show every dataset of a multiple data input in comparison cells
1b9b2132d4e Read an empty input cell as not supplied
a095adf1809 Drop ComparisonCell's copy of the missing-reason texts
ca72a8e41d9 Share versionless tool id test cases between server and client
1971d95d4f9 Share comparison test fixtures and stubs in test-utils.ts
1d60640b33b Link a saved workflow step to its runs from the workflow editor
3eb1f3356a6 Mark a reused job in a mapped batch's job pager
0ca55fcb6a7 Key comparison column headers by column key in the DOM
63e5fbd48a8 Describe comparison run fields in one spec table
071a9d40c6c Pin an expanded comparison row's detail to the visible table width
3cd60c9cb57 Add comparisons E2E test
```

## Verification

- **Tree:** `git diff 1a9720d93dd 3cd60c9cb57` is empty. Pushed with `--force-with-lease=compare_runs:1a9720d93dd` to `jmchilton/compare_runs`.
- **Baseline tip `b40ff056bbd`:**
  - vitest for DatasetPopoverLink, ToolExecutionJobs and handlesMappingJobs: 16/16 passed.
  - `test_HDAManager.py`: 31 passed.
  - API tests, run serially: `test_index_and_show_job_field_sets`, `test_show_metadata_key_expands_every_element` and `test_show_io_association_names` passed.
- **Refactor tip `e15ba92a4e5`:**
  - vitest for the 7 changed test files plus Citation and Markdown Elements: 15 files, 78/78 passed.
  - `vue-tsc --noEmit` is clean.
  - `test_HDAManager.py`: 32 passed.
  - API `test_show_single_metadata_key` passed.
  - ruff, black and isort pass on the changed .py files.
  - mypy (`MYPYPATH=lib`) shows no errors in the changed files.
  - The only "comparison" strings are the synthetic `/comparisons` URLs in `routerViewKey.test.ts`.
- **Spot-checks:**
  - At `bc01e138834`: `test_galaxy_mapping` and `test_HistoryManager` gave 50 passed, 18 skipped.
  - At backend tip `cf22203a483`: the comparison unit tests and `test_tool_version` gave 75 passed.
  - At `3f1a2f8d6b0`: vitest for JobInformation, StoredWorkflowInvocations, DatasetInformation, Comparison and `entry/analysis` gave 207/207 passed.
  - At `63e5fbd48a8`: vitest for Comparison, `tool-version` and History/Graph gave 233/233 passed.
  - ruff ran on the API test files at every commit that touches them; all clean.
- **Not run:** Comparison API and Selenium suites at intermediate commits. Those commits differ from the originals only in the probe removal and helper usage, and the final tree is identical.
