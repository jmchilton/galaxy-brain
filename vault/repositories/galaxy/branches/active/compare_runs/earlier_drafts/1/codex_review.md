# Codex review 1: verification and fixes

**Top line.** I fixed 3 of the 4 findings with red-to-green tests: #1 multi-dataset inputs, #2 parameter input steps, and #4 the label facet. #3 (skipped reported as `not_in_version`) is **refuted** as Codex stated it. It is now pinned by a test, and one follow-on question is left for John. I didn't make the All runs tab available on labelled input steps (#2 extra), because it can't be done cheaply. Six new commits sit on `compare_runs` above b308005cdee (548c8bebcc3 is the tip). They are not pushed.

| # | Verdict | Fix commit |
|---|---------|-----------|
| 1 | CONFIRMED | c3412e61bb1, plus 4c5880c9da4 (mypy narrowing in its unit test) |
| 2 | CONFIRMED (parameter inputs; data inputs partly) | e45db61891e, plus 548c8bebcc3 (defaulted data input fallback) |
| 3 | REFUTED (pinning test added) | fab059fb494 (test only) |
| 4 | CONFIRMED | eeb129237a9 |

## Per finding

### 1. Multi dataset inputs lose every dataset after the first: CONFIRMED
- **Evidence.** `lib/galaxy/managers/comparison_cells.py:205-209` at b308005cdee. `multiple_input_aliases({"f1","f11","f12",...})` returned `{f11, f12, f21}`, and the loop dropped all of them, so B (`f12`) never reached a cell. The red API test (`test_tool_runs_multiple_data_input`, f1=[A,B,C]) gave `input:f1` as a single dataset cell.
- **Fix.**
  - `multiple_input_aliases` became `multiple_input_members` (`comparison_columns.py`). It returns `base → [name1, name2, …]` ordered by numeric suffix, not lexicographically, so `f110` sorts after `f19`. It also rejects suffixes that start with `0`.
  - `job_inputs` now emits `ItemRefs` for 2+ members.
  - New schema cell `DatasetListCell` (`type: "dataset_list"`, `items: [DatasetCell | ValueCell | MissingCell]`).
  - `_item_refs()` flattens list members, so all three item-loading sites (output, tool and step rows) run the access check. An inaccessible member renders in place as `missing/inaccessible`.
  - `_cells` builds the list and unions `metadata_keys`.
  - `_keyed` is now generic.
  - Client: `cells/DatasetListCell.vue` shows the first item through `ComparisonCell` (mutual recursion), plus a `+N more` button with a `GPopover` listing every item. `compareCells` diffs member by member. Export joins items with `"; "`.
- **Single dataset rule.** A multiple param with one dataset stays a plain `DatasetCell`, so existing tests and behaviour are unchanged.
- **Reduce case.** I probed a collection passed to a multiple param. Galaxy records the hdca `f1` plus hda `f1`, `f11`, `f12`, and the collection cell still wins, which the test asserts.
- **Tests.**
  - Unit: `test_multiple_input_members_*`, including 11 members out of order. `test_multiple_input_members_checked_for_access` covers a foreign private member, which renders as inaccessible.
  - API: `test_tool_runs_multiple_data_input`.
  - Vitest: list cases in `ComparisonCell.test.ts`, `comparisonChanges.test.ts` and `comparisonExport.test.ts`.

### 2. Labelled parameter input step omits its value: CONFIRMED
- **Evidence.**
  - `comparisons.py:531-536` at b308005cdee: step rows took inputs only from jobs and outputs only from step output associations.
  - A parameter value isn't `history_content_type`, so `run.py:726-728` never records it as a step output.
  - The red test returned `columns == []` for `min_quality` (7 and 9).
- **Fix.**
  - I moved the request-input loading out of `_invocation_io` into `_request_inputs(invocation_ids, step_ids=None)`, which output_runs and step_runs now share.
  - `_step_rows` adds the compared step's request input for every input step type, keyed like mode 2 (`parameter:<label>` / `input:<label>`).
  - For input steps it no longer adds step outputs. A data input's step output `output` is the same dataset, and as an `output` column it was never diffed.
  - `_column_spec` used to map `parameter:` keys to role `output`. Fixed.
- **Defaulted inputs (548c8bebcc3).** `run_request.py:662-664` records only inputs the caller supplied. A defaulted data input exists only as the step's `output`, so when there is no request input `_step_rows` falls back to that output under `input:<label>`. Unit test: `test_step_runs_data_input_without_request_input`, red first. A defaulted *parameter* value is recorded nowhere, so its rows stay empty, as before.
- **Tests.** `test_step_runs_input_steps` covers both cases:
  - the parameter column with values [9, 7];
  - a data input showing one `input:input1` column with the right ids.
- **All runs tab on input steps: not done.** In `WorkflowInvocationStep.vue`, input steps render outside the `<GTabs>` chain. Adding the tab means a second `<GTabs v-if=input-step>` wrapper of about 7 lines after prettier. Its only tab would be a lazy one, active by default, so it would fetch runs every time the card is expanded. That's over the ≤5-line budget, and the file is also edited by open PR #24307. The API now supports input steps, so the tab is a small follow-up.

### 3. Skipped step reported as not_in_version: REFUTED
- **Evidence.** A skipped tool job still creates and records its outputs.
  - `lib/galaxy/tools/actions/__init__.py:801-814`: `set_skipped` writes a `null` `expression.json` dataset, then `_record_outputs`.
  - `lib/galaxy/workflow/run.py:726-728`: `add_output` puts it on the invocation step.
  - So the v0 row's page-derived `declared` set includes `output:out_file1`.
- **Probe.** I ran Codex's exact scenario: `when:` cat step, skipped in v0, run in v1.
  - The v0 cell was `{"type": "value", "value": null, "source": "expression_json"}`, not `not_in_version`.
  - The row state is `skipped`.
- **Pinned** by `test_step_runs_skipped_step` (fab059fb494). It passes on the base.
- **NEEDS-DECISION.** A skipped step's outputs render as a null value, never as the `skipped` missing reason. Should the null outputs of skipped jobs map to `MissingCell(skipped)`?
- **Related limitation, not fixed.** The step_runs "declared in version" set is still derived from the page. It can still mislabel cases where a step really records no io:
  - an optional input that wasn't supplied;
  - a skipped subworkflow step, whose `NO_REPLACEMENT` outputs aren't recorded.

  Deriving it from tool definitions needs the toolbox, and tool inputs are repeat-indexed. That's a design change; flag it for hardening or John.

### 4. Output labels from older versions vanish from the page-1 filter: CONFIRMED
- **Evidence.** `comparisons.py:186-191` at b308005cdee computed `output_labels` from `_declared_workflow_io` over the page's workflow ids only. Red: with `limit=1, sort_desc=False`, the facet was `['cat_out']` instead of `['n', 'cat_out']`.
- **Fix.** `_invoked_output_labels` runs one statement: workflow outputs where `workflow_id IN (the caller's invocations' workflow ids)`. It keeps the order newest version first, then step order. `_output_labels_stmt` is shared with `_declared_workflow_io`. I updated the schema description and regenerated the client schema.
- **Other facets checked.** `versions_available` comes from `steps_by_workflow` (all versions with the step) and `tool_versions_available` from `_tool_versions` (all the user's jobs). Neither is page-scoped, so neither needed a change.

## Not acted on
- **#3:** refuted. The skipped→null rendering and the page-derived declared sets are listed above for a decision.
- **#2 extra:** the All runs tab on input steps is more than 5 lines and conflicts with PR #24307.
- **#4 columns.** output_runs *columns* are still page-scoped. Picking an older-only label on page 1 shows no column until you page to one of that version's runs. The brief scoped #4 to the facet.
- **Mode 2 defaulted inputs.** output_runs (`_request_inputs`) has the same defaulted-input gap: there is no `input:<label>` cell for a defaulted data input. This was true before too.
- **Pre-existing heuristic risk, not touched.** A tool with two distinct params `x` and `x1` both given the same dataset is folded as if it were a multiple param. That was true before as well.

## Validation
- API `test_comparisons.py`, full module: 22 passed.
- Unit `test_ComparisonsManager.py` + `test_comparison_columns.py`: 57 passed.
- Vitest `src/components/Comparison`: 155 passed.
- vue-tsc and eslint: clean.
- ruff, black and isort: clean. Pre-commit passed on every commit.
- `make mypy` (`cd lib && mypy . ../test`) matches b308005cdee line for line once 4c5880c9da4 is in: 58 errors on both. A pre-existing branch error remains, `galaxy_test/selenium/test_comparisons.py:1` (`retry_assertion_during_transitions` not explicitly exported from `framework`), which hardening should fix.

No security findings.

<details>
<summary>Codex raw findings</summary>

```json
{
  "coverage": {
    "files_reviewed": [
      "lib/galaxy/managers/comparisons.py",
      "lib/galaxy/managers/comparison_cells.py",
      "lib/galaxy/managers/comparison_columns.py",
      "lib/galaxy/schema/comparisons.py",
      "lib/galaxy/webapps/galaxy/api/comparisons.py",
      "lib/galaxy/webapps/galaxy/services/comparisons.py",
      "lib/galaxy/managers/datasets.py",
      "lib/galaxy/managers/jobs.py",
      "lib/galaxy/managers/sharable.py",
      "lib/galaxy/model/__init__.py",
      "lib/galaxy/model/security.py",
      "lib/galaxy/workflow/run.py",
      "lib/galaxy/workflow/modules.py",
      "lib/galaxy_test/api/test_comparisons.py",
      "test/unit/app/managers/test_ComparisonsManager.py",
      "test/unit/app/managers/test_comparison_columns.py",
      "client/src/api/comparisons.ts",
      "client/src/components/Comparison/ComparisonView.vue",
      "client/src/components/Comparison/ComparisonTable.vue",
      "client/src/components/Comparison/StepRunsTab.vue",
      "client/src/components/Comparison/StepAllRunsTab.vue",
      "client/src/components/Comparison/comparisonQuery.ts",
      "client/src/components/Comparison/comparisonChanges.ts",
      "client/src/components/Comparison/useComparison.ts",
      "client/src/components/Comparison/cells/ItemCell.vue",
      "client/src/components/Common/ItemPopoverLink.vue",
      "client/src/components/History/Graph/useExecutionJobs.ts",
      "client/src/components/JobParameters/jobParameterDiff.ts",
      "client/src/components/JobParameters/JobParametersDiff.vue"
    ],
    "notes": "Review focused on the comparison endpoints, data construction, and main client path. Other changed files and complete test suites were not reviewed. The generated schema file was excluded as requested."
  },
  "findings": [
    {
      "severity": "P1",
      "category": "correctness",
      "file": "lib/galaxy/managers/comparison_cells.py",
      "line": 206,
      "title": "Multi dataset inputs lose every dataset after the first",
      "detail": "The loader treats all numbered associations as aliases and removes them. Galaxy records a multi data input such as f1=[a,b] as f1=a, f11=a, f12=b; the existing probe test confirms those names. Dropping both f11 and f12 leaves only a. This needs a reusable representation of multi-valued inputs for both step and tool comparisons, rather than discarding associations.",
      "failure_scenario": "Run multi_data_param with f1=[dataset A, dataset B], then request its tool runs. The table contains input:f1 for A but no cell or column containing B.",
      "confidence": "certain"
    },
    {
      "severity": "P1",
      "category": "correctness",
      "file": "lib/galaxy/managers/comparisons.py",
      "line": 534,
      "title": "Comparing a labelled parameter input step omits its value",
      "detail": "Step rows obtain inputs only from jobs and outputs only from dataset or collection step associations. A parameter_input step has no job; its value is stored in WorkflowRequestInputStepParameter, which this manager reads for output_runs but never for step_runs.",
      "failure_scenario": "Invoke a workflow twice with a labelled parameter_input step, supplying 7 and 9. GET step_runs for that label returns two rows with no value column, so the differing inputs cannot be compared.",
      "confidence": "certain"
    },
    {
      "severity": "P2",
      "category": "correctness",
      "file": "lib/galaxy/managers/comparisons.py",
      "line": 539,
      "title": "A skipped step can be reported as absent from its workflow version",
      "detail": "The per-version column declaration is inferred from I/O produced by runs on the page. If a version's only paged run skipped the step, its declaration stays empty; _cells then overrides the computed skipped reason with not_in_version. The workflow step's declared outputs need to determine version presence independently of run results.",
      "failure_scenario": "Version 0 and version 1 both contain the same labelled tool step and output. The page contains a skipped version 0 invocation and a successful version 1 invocation. Version 0's output cell says not_in_version instead of skipped.",
      "confidence": "certain"
    },
    {
      "severity": "P2",
      "category": "correctness",
      "file": "lib/galaxy/managers/comparisons.py",
      "line": 183,
      "title": "Output labels from older versions disappear from the first page's filter",
      "detail": "output_labels_available and the columns are derived only from versions represented on the current invocation page. The client builds its output-label chooser from output_labels_available, so an older-only label cannot be selected until the user pages to an older invocation. The existing workflow-version inventory is a reusable source for the label set.",
      "failure_scenario": "A new workflow version has 25 recent invocations; an older version has one output labelled old_result and one earlier invocation. With the default page size, page 1 offers no old_result option although the stored workflow has a run producing it.",
      "confidence": "certain"
    }
  ]
}
```

</details>
