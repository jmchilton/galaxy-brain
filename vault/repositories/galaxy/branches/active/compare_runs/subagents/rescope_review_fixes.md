# Re-scope review fixes + history fold

**Top line.** All "acting on" items from `rescope_review.md` are done as 8 new commits, each red to green where behaviour changed. The history was then rebuilt to 46 commits with the tree unchanged: `git diff 36bb5eab798 474d7314ac5` is empty and the tree hashes match. The 7 baselines come first and pass at the baseline tip on `fd43a3c6ce8`. Pushed:
- backup `jmchilton/compare_runs_pre_fold2` = `36bb5eab798`;
- `jmchilton/compare_runs` = `474d7314ac5`.

The lease differs from the brief's wording. The remote was still at `9aa33beef03`, because the (A) commits had only gone to the backup, so I leased on `compare_runs:9aa33beef03`. A lease on `36bb5eab798` would have been rejected.

Not acted on: the skipped-subworkflow characterization test (as the review said). The 46 commits are above the ≈30–40 target, for two reasons:
- The 7 baselines stay separate.
- Three moved-earlier folds conflicted and went back to their own slots instead of being hand-resolved: `548c` into input-step, `fab0` into skipped, and `1357` into versions.

## (A) Fixes

Pre-fold shas are on `compare_runs_pre_fold2`. "New" is the commit on the folded `compare_runs` that now holds the change.

| Item | Pre-fold | New |
|---|---|---|
| Drop the 3 untested output `UNION` arms. `_defined_step_inputs` is now one plain `select` on `WorkflowStepInput`, which removes the `literal_column`, `union_all` and `CompoundSelect` imports and the PG risk. The docstring is shortened to one line. | `76f631426ae` | `baaa6463cce` (folded with 9aa3; message rewritten) |
| Role-aware "not supplied" text and title for empty `input:` cells, via `missingText(cell, row, role)`, `missingTitle`, the `role` prop on `ComparisonCell`/`MissingCell` and the CSV/TSV export. `MISSING_TITLES` is no longer exported. Three new vitest tests were red first. | `cff680aef54` | `474d7314ac5` |
| Drop the `@onOk`→`@on-ok` hunk in HistoryDatasetPicker. The lint warnings are the same as on base. | `2d8e7df2cb3` | `b6de269f25a` (folded with bcdc+22a2) |
| `useExecutionJobs` moves to `@/composables/`. `orderBy: "create_time" \| "update_time"` replaces `recentlyUpdatedFirst`, and `ExecutionJob` is no longer exported. | `ab9d1ca8de7` | split: the move and unexport are in `e8a083f319d`, `orderBy` is in `7c9a8b6ee2d` |
| `versions_available` lists only invoked versions in both modes, through a shared `_invoked_workflows_stmt` that `_invoked_output_labels` also uses. The schema description is updated. New API test `test_versions_available_lists_invoked_versions` was red first. | `1357f088a87` | `f73f003a094` |
| No "Other runs of this tool" for `upload1` / `__NAME__` tools (`isInternalTool` in JobInformation.vue). The new `it.each` test (3 cases) was red first. | `4060866fee2` | `2b10a5f66b4` |
| Drop the duplicate `test_serialize_prefixed_metadata_keys`. `test_show_single_metadata_key` covers all of it, including the `metadata` + prefixed combination. | `fceb9f57201` | `69c011e9015` (never added) |
| Schema regen | `36bb5eab798` | `4e0494df3ab` (the single regen) |

**Checks on `36bb5eab798`, identical to the final tree:**
- API `test_comparisons.py`: 25 passed.
- Unit tests `test_HDAManager`, `test_ComparisonsManager` and `test_comparison_columns`: all pass.
- vitest over Comparison, JobInformation, DatasetInformation, Markdown, History/Graph and SelectionDialog: 48 files, 398 tests, all pass.
- `vue-tsc --noEmit`: exit 0, after the api-client dist rebuild.
- eslint and prettier are clean on the touched files. The only warnings are HistoryDatasetPicker's, the same as on base.
- ruff, black and isort are clean.
- mypy on the changed files shows only pre-existing errors: the single-file `Returning Any` and pydantic `Model` ones.

## (B) History fold

**Method.** A scripted path-based rebuild from `fd43a3c6ce8`: `git diff X^ X | git apply --3way --index`, with `--no-verify` commits, and schema.ts excluded from every pick except the regen step. ab9d's split uses final-state checkouts. Any conflict stopped the script, and that commit went back to its original slot.

**Midpoint check.** After the backend block plus the regen (`4e0494df3ab`), the diff against the old tip under `lib test client/packages/api-client` was only the selenium E2E files, which are deliberately in the client block.

**New list.** "+" means folded in.
1. `9886e62af31` Baseline tests for job index/show response fields
2. `b33c14b83de` Baseline tests for DatasetPopoverLink link/popover wiring
3. `0135f97343e` Baseline tests for HDA metadata serialization
4. `5f1ddb3fd99` Baseline tests for job input/output association names
5. `f4fb17d9a06` Baseline tests for ToolExecutionJobs
6. `2d6394f6e30` Baseline tests for useMappingJobs (was 8bb6)
7. `3de6b98b9e6` Baseline tests for dataset metadata keys serialization (was 6106)
8. `69c011e9015` Allow selecting serialized dataset metadata elements by name (3b63+26d7+fceb)
9. `b1b1a254a97` Add batched dataset and sharable item access checks
10. `cae3d8d3291` Add comparison table models and column alignment helpers
11. `b4e31b9ecef` Add step_runs comparison endpoint (12d8+acc6)
12. `58dae6b177e` Expose tool_version and copied_from_job_id on jobs…
13. `259ce6e328e` Add output_runs comparison endpoint
14. `279d07f917c` Add tool_runs comparison endpoint
15. `8fe474b10c1` Filter only outputs by output_labels and expose the output label facet (9f29+eeb1)
16. `dec79a320f8` Filter step and output runs by workflow version (b9dd+ee0a)
17. `ce22abb4500` Challenge comparison tests (7bd6+d058, together)
18. `d60bb48b30d` Show a labelled input step's own input in step_runs
19. `baa284d9009` Pin a skipped step's step_runs cells against a later version's run
20. `70b7112e256` Return every dataset of a multiple data input as a dataset_list cell (c341 backend+4c58)
21. `008e81e5089` Fall back to an input step's output when it has no request input
22. `6238e45c2f4` Show a skipped job's outputs as skipped in step and tool runs
23. `baaa6463cce` Declare step_runs input columns from each version's step definition too (9aa3+76f6)
24. `f73f003a094` Offer only invoked workflow versions in the version filter
25. `4e0494df3ab` Regenerate client API schema (all schema.ts changes)
26. `38d74bd89cb` Generalise DatasetPopoverLink into ItemPopoverLink…
27. `b6de269f25a` Share total_matches parsing as totalMatches in @/api (bcdc+22a2+2d8e)
28. `9d7409458da` Expose detailsShowing to GTable cell slots
29. `1e1a2d90e1f` Share one helper for saving a browser-built blob as a file
30. `e8a083f319d` Page through a mapped batch's jobs in ToolExecutionJobs (+ab9d move)
31. `7c9a8b6ee2d` Load Markdown job selectors' batch jobs through useExecutionJobs (+ab9d orderBy)
32. `33582f4f490` Add JobParametersDiff for two jobs' parameters
33. `7cc7b38f2b7` Let a route keep its center view mounted across query changes
34. `c1fd62b4c6f` Add ComparisonTable component and cell renderers
35. `e1b596ca3e4` Add /comparisons page
36. `2b10a5f66b4` Link comparisons from the step card, job, dataset and workflow pages (1379+927f+2fd4+4060)
37. `5b0a80e9d99` Mark comparison cells that differ from the current run
38. `3f9b458f8f0` Compare two selected runs side by side
39. `8e2c00dd2bb` Export a comparison page as CSV or TSV
40. `940d22ce58b` Filter comparisons by state and workflow version (a81f+f0b7)
41. `af7a5ce5248` Page through a mapped batch's jobs in comparison row details
42. `1260c79fd58` Diff only the comparison's visible fields and columns
43. `96cf9cae171` Highlight an expanded run's parameters that differ from the viewed run
44. `15936275702` Add comparisons E2E test and share invocation graph helpers (0fa1+8ab3+b308+ca88)
45. `816759021d7` Show every dataset of a multiple data input in comparison cells (c341 client)
46. `474d7314ac5` Read an empty input cell as not supplied

**Messages.** Every folded commit's message was rewritten to describe its final behaviour:
- 9aa3: inputs only.
- dcef: `orderBy`.
- bcdc: all callers, with no event renames.
- 26d7: no unit test.
- E2E: lists the client tests it replaces.

**Empty-diff evidence:**
- `git diff --quiet 36bb5eab798 474d7314ac5` exits 0.
- The `HEAD^{tree}` hash equals `36bb5eab798^{tree}`.
- No conflict markers anywhere in `git log -p`.
- All 46 commits are authored by John Chilton.

**Baseline verification at `3de6b98b9e6` (tip of the 7 baselines on `fd43a3c6ce8`):**
- vitest `handlesMappingJobs.test.ts`, `ToolExecutionJobs.test.ts`, `DatasetPopoverLink.test.ts`: 16/16 passed.
- `test_HDAManager.py`: 31 passed.
- API, run one at a time:
  - `test_datasets.py -k test_show_metadata_key_expands_every_element`: 1 passed.
  - `test_jobs.py -k test_index_and_show_job_field_sets`: 1 passed.
  - `test_comparisons.py`, which there holds only `test_io_names_probe`: 1 passed.

**Caveat.** Client commits 26–46 sit after the single regen. Commits 34–44 therefore compile against the final schema, including `dataset_list`, before 45 handles it in the client. vue-tsc was not run at those intermediate commits. The final tree passes.
