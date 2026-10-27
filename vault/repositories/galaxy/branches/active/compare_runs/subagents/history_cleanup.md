# History cleanup

The history went from 66 commits to 35 on fd43a3c6ce8: 5 baseline commits, then 30 feature commits. The final tree is unchanged, and `git diff 125ae963eb0 0fa14c972ac` is empty. The old history is backed up at `jmchilton/compare_runs_pre_harden` (125ae963eb0). The new history was force-pushed with `--force-with-lease=compare_runs:125ae963eb0`, and the new tip is 0fa14c972ac.

## Method

There was no rebase. The series was rebuilt from fd43a3c6ce8 with a plan script. For each new commit, the script checks out each file as it was at a chosen original commit. Before building, the script checked two things:
- For every path, the chosen original commits only move forward in history.
- The plan covers every path in the base-to-tip diff.

Some special cases:
- **Renames.** `comparisonTable.ts` became `comparisonUtils` and `comparisonDiff` became `comparisonChanges`. Both are created directly under their final names, so no rename commits remain.
- **useToolExecutionJobs.ts.** It is removed in commit 21.
- **Hunks moved to earlier commits.** Two hunks were applied as 3-way patches:
  - 4ebebe5's `accessible_ids` call moved into "Hide comparison cells…".
  - fab4c47's Hide-comparison button moved into "Compare two selected runs…".
- **Commit messages.** Commits that map 1:1 to an original reuse its message. Merged commits get new bodies ending in the Co-Authored-By trailer.

## Commits
1. Baseline tests for job index/show response fields
2. Baseline tests for DatasetPopoverLink link/popover wiring
3. Baseline tests for HDA metadata serialization
4. Baseline tests for job input/output association names
5. Baseline tests for ToolExecutionJobs
6. Allow filtering serialized dataset metadata by name
7. Add batched dataset and sharable item access checks. This takes the security agent and SharableModelManager parts of 007ebae, a33f23a and 4ebebe5. histories.py ends up unchanged.
8. Add comparison table models and column alignment helpers
9. Add step_runs comparison endpoint
10. Hide comparison cells the caller can't access
11. Expose tool_version and copied_from_job_id on jobs, filter the index by tool_version (5cfebd2 + a65b037)
12. Add output_runs comparison endpoint
13. Add tool_runs comparison endpoint. Also folds in 28475ab, 2f3d318 and the test parts of a33f23a.
14. Filter only outputs by output_labels and expose the output label facet (45ac395, 1827bc3, 8edf2ea, and the API tests from 22e8841 and c574a68)
15. Filter step runs by workflow version (backend part of 42facbf)
16. Regenerate client API schema. This is the only schema.ts commit. At this point every API, schema and manager file under lib/galaxy is already at its final state.
17. Generalise DatasetPopoverLink into ItemPopoverLink with unique DOM ids (+5825f2c, 5e69819, 728d056)
18. Share total_matches parsing as totalMatches in @/api
19. Expose detailsShowing to GTable cell slots
20. Share one helper for saving a browser-built blob as a file
21. Page through a mapped batch's jobs in ToolExecutionJobs. This is useExecutionJobs at its final state, from the ToolExecutionJobs parts of 7f36e52, fab4c47, a96fef6, 67cae40 and 7ea347f.
22. Add JobParametersDiff for two jobs' parameters (the jobParameterDiff/JobParametersDiff parts of c2c380c, e6550a0, 0218d29, f076ada, b21a177 and 125ae96)
23. Let a route keep its center view mounted across query changes. This is the routerViewKey part of 5b206ce.
24. Add ComparisonTable component and cell renderers. This is d8c5f06 + 34a50e9 plus the table, cell and row-detail fixups that came before phase 5.
25. Add /comparisons page. This is caa543e plus the page, pager, query and useComparison fixups, 8e10273 (tool-version.ts) and the router parts of d6ced37.
26. Add All runs tab to invocation step card
27. Link Compare outputs and Other runs of this tool to comparisons (d82d88e, 7f2cd31, and d6ced37 minus its router part)
28. Mark comparison cells that differ from the current run
29. Compare two selected runs side by side (+f88c907, fab4c47)
30. Export a comparison page as CSV or TSV (+686744d)
31. Filter the step tab by state and workflow version
32. Page through a mapped batch's jobs in comparison row details (+21cfa9f)
33. Diff only the comparison's visible fields and columns
34. Highlight an expanded run's parameters that differ from the viewed run
35. Add comparisons E2E test and share invocation graph helpers (2802de6, the selenium parts of bbfdb42, c5e8642)

## Baselines (checked at commit 5, 6128074d3e9: baselines only, on dev)
- **Unit.** `test_HDAManager.py -k test_serialize_metadata_tabular_keys` passed.
- **Vitest.** `DatasetPopoverLink.test.ts` and `ToolExecutionJobs.test.ts`: 12/12 passed.
- **API.** `test_jobs.py::test_index_and_show_job_field_sets` and `test_comparisons.py::test_io_names_probe`: 2/2 passed. These are the only tests in the job field-set baseline and in `test_comparisons.py@8e40ca9`.

## Intermediate commits
- **Python.** `ruff --select F` is clean on every changed .py file at every commit. Comparison/HistoryManager/HDAManager/galaxy_mapping/tool_version unit tests pass at every backend commit, from 80 tests passing up to 142.
- **Client imports.** At every commit, all relative and `@/` imports in the touched client files resolve, and the named TypeScript exports they use exist.
- **Client vitest.** At every client commit, all vitest under Comparison, JobParameters, History/Graph, ItemPopoverLink/DatasetPopoverLink, JobInformation, StoredWorkflowInvocations, api/index, download, tool-version and entry/analysis passes, ending at 43 files and 351 tests. GTable.test passes at commit 19.
- **Not run per commit.** vue-tsc/mypy type-checks, and the selenium E2E (it lives only in the last commit).
- **Lint at the tip.** ruff, black and isort are clean, and so is prettier. eslint reports only 2 warnings, both already on dev: schema.ts is ignored, and Analysis.vue has a multi-word-component-name warning.

## Caveats
- **Merged fixups.** Some fixups landed in a later feature commit rather than the one they fix:
  - 28475ab and 2f3d318 are in tool_runs (13).
  - 1827bc3 (mypy test fixes) is in commit 14.
  - 21cfa9f (versionLabel) is in commit 32.
  
  Each was blocked by ordering, because a later original commit had already touched the same file.
- **ToolExecutionJobs ordering.** The generalised ToolExecutionJobs (21) comes before ComparisonRowDetail (24). The RowDetail from before 7f36e52 still works with the final props, and its vitest passes.
