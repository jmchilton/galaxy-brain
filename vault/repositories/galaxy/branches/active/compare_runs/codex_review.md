# Codex review 2: verification and fixes

**Top line.** I fixed 2 of the 3 findings red-to-green: #2 (state filter vs shown batch state) and #3 (not-yet-run rows judged against the wrong version's columns). #1 (collection cell visibility rule) is **NEEDS-DECISION** and handled outside this note. New commits sit on `compare_runs` above `f29a3b12767`.

| # | Verdict | Commit |
|---|---------|--------|
| 1 | NEEDS-DECISION (behaviour unchanged) | none |
| 2 | CONFIRMED | `dfcca6a5918` |
| 3 | CONFIRMED, broader than stated | `3273c6ead22` |

## Per finding

### 1. Collection cell visibility rule: NEEDS-DECISION
- Left unchanged; tracked as design question 12 and discussed with John separately.

### 2. State filters return mapped batches whose shown state doesn't match: CONFIRMED
- **Evidence.**
  - `comparisons.py:776-787` (`_submission_state_predicate`) and `:725-748` (`_step_state_predicate`) at `f29a3b12767` matched a batch when *any* member job was in a requested state.
  - Red API run: for the `fail_identifier` batch (one ok job, one error job), `states=ok` returned the batch, whose row state is `error`. Total matches was 1, expected 0.
  - The same bug covered empty batches. `test_step_runs_mapped_over_empty_list` shows `ok`, but `states=ok` returned `[]`, because the batch clause inner-joined its members.
- **Fix: one rule for the filter and the display.**
  - `comparison_columns.SUMMARY_STATE_GROUPS` is an ordered rank table. `summary_state` takes the minimum member rank.
  - `_batch_state_predicate` builds `min(CASE …)` over the member jobs from the same table, and is used by both `step_runs` and `tool_runs`.
  - An empty batch filters on its `populated_state` through `EMPTY_BATCH_STATES`, which the display also reads.
  - A step with no job and a null state counts as `new`, as it is displayed.
- **Tests.**
  - `test_runs_state_filter_matches_any_mapped_member` pinned the old rule. It is renamed `..._matches_mapped_batch_state` and now asserts that `ok` and `running` match nothing for the error batch. This is a coordinator-directed spec change, not a weakening.
  - `test_step_runs_mapped_over_empty_list` gains `states=ok` and `states=new` checks.
  - New unit test `test_tool_runs_state_filter_matches_batch_summary_state` covers 11 mixed batches: each matches exactly the state it shows. It fails against the old predicate (`running` ≠ `queued`).

### 3. Unscheduled steps mark absent version columns as not_run_yet: CONFIRMED, broader than stated
- **Evidence.** `comparisons.py:604` (`in_version = declared.get(version, {}) if step else None`) at `f29a3b12767`.
- **The red API run hit a sibling case.** Once the pause is reached, the paused v0 invocation has an invocation step for `after_pause` but no job.
  - Its row was judged by v0's runs on the page, which recorded no outputs, so `output:out_file1` read `not_in_version`.
  - With no step record at all (Codex's case), every column, including inputs only v1 connects, read `not_run_yet`.
- **Fix.** Every tool-step row now reads its version's columns:
  - inputs that version's step connects (`WorkflowStepInput`, already loaded) or that its runs recorded;
  - and, when none of that version's runs here recorded outputs yet, the outputs seen on the page.
  - `present_in_versions` follows the same rule. Input steps keep their single column in every version.
  - Column order within a version is now deterministic: the old code iterated a set.
- **Test.** New `test_step_runs_not_run_yet_reads_its_version_inputs`:
  - v0 is pause → cat1(input1), invoked and left paused;
  - v1 is cat1(input1, `queries_0|input2`), uploaded as a new version via PUT.
  - The paused row reads `not_run_yet`, `not_in_version` and `not_run_yet`, and `queries_0|input2` has `present_in_versions == [1]`.
  - It was red against the old code.
- **Known limit.** A version none of whose runs here recorded outputs is assumed to have every output seen on the page. Outputs aren't declared in the DB without loading the tool.

## Not acted on
- **#1:** left as is, pending John's decision.
- **A unit test for the "no invocation step" variant of #3:** not added. That case goes through the same `declared[version]` path, since `in_version` no longer depends on `step`. The existing `test_step_runs_not_run_yet` reaches it whenever the query beats scheduling.

## Verification
- Unit tests: `test_ComparisonsManager.py` and `test_comparison_columns.py` pass, 56 in total after B5 removed one test.
- API tests: `test_comparisons.py` passes, run as one module after each server commit. At the tip `b527b296a74` that is 27/27; the io probe has moved to `test_jobs.py`.
- black, isort, ruff, flake8: clean, via pre-commit on every commit.
- mypy, run per file: only the `warn_return_any` artifacts noted in the iteration-2 test debrief. `comparison_columns.py` drops from 8 to 2.

<details><summary>Raw Codex JSON (finding 1 omitted)</summary>

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
      "lib/galaxy/model/security.py",
      "lib/galaxy/model/__init__.py",
      "lib/galaxy/managers/workflows.py",
      "lib/galaxy_test/api/test_comparisons.py",
      "client/src/components/Comparison/ComparisonView.vue",
      "client/src/components/Comparison/ComparisonTable.vue",
      "client/src/components/Comparison/StepRunsTab.vue",
      "client/src/components/Comparison/ComparisonDiff.vue",
      "client/src/components/Comparison/comparisonQuery.ts",
      "client/src/components/Comparison/comparisonUtils.ts",
      "client/src/components/Comparison/comparisonExport.ts",
      "client/src/components/Comparison/useComparison.ts",
      "client/src/composables/useExecutionJobs.ts"
    ],
    "notes": "Reviewed the listed files and selected surrounding code and refactor diffs. The remaining client components, tests, and peripheral diff files were not fully reviewed. The generated schema.ts file was excluded as requested."
  },
  "findings": [
    {
      "severity": "P1",
      "category": "correctness",
      "file": "lib/galaxy/managers/comparisons.py",
      "line": 784,
      "title": "State filters return mapped batches whose displayed state does not match",
      "detail": "The tool-run predicate accepts a batch if any member job has a requested state. The step-run predicate at lines 732\u2013736 does the same. Rows instead display the batch's summary state, where an error takes precedence over an OK member.",
      "failure_scenario": "A mapped batch has one OK job and one error job. Requesting tool runs or step runs with states=ok includes that batch, but its row state is error.",
      "confidence": "certain"
    },
    {
      "severity": "P2",
      "category": "correctness",
      "file": "lib/galaxy/managers/comparisons.py",
      "line": 604,
      "title": "Unscheduled steps mark absent version columns as not run yet",
      "detail": "When an invocation has no step record, in_version is set to None. _cells interprets None as every column being present, even though declared already records which columns belong to each workflow version.",
      "failure_scenario": "Version 1 of a labelled step has input A, version 2 has input B, and a version 1 invocation has not scheduled the step. With a version 2 run on the page, the version 1 row reports B as not_run_yet instead of not_in_version.",
      "confidence": "certain"
    }
  ]
}
```

</details>
