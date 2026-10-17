The branch now opens with two "Baseline tests" commits, then the four behavior-preserving refactor commits from the earlier pass, then the feature. No new refactor commits were added. The final tree is byte-identical to the old head `cab17f2f1a9`, which is kept locally as `issue_20657_pre_baseline2_backup`.

## What changed in history

1. `b89794a9f36` **Baseline tests for collection drop matching and dedupe** (client only). The API paging test that had been slipped into this commit was moved out, so the commit message now matches its contents.
2. `76750495c46` **Baseline tests for option paging** (new grouping):
   - The `accumulate_with_filter` unit tests (`test/unit/app/tools/test_parameter_pagination.py`). These were previously the late commit `550d6b0459b`.
   - The API test `test_build_collection_options_pagination_splits_direct_and_multirun_entries`, in its base form: with limit 1, the direct and multirun entries of a nested list land on separate pages.

   Both pass on base.
3. Refactors, the same content as the earlier pass (`earlier_drafts/2/baseline_refactor.md`):
   - `5125a9e5108` collectionTypeToText move
   - `57fc5c870e3` FormSelect `label-area` slot
   - `05907884de9` shared data option lookup/merge helpers
   - `d3afe84699d` multiselect tag clearing in NavigatesGalaxy
4. The feature commits were cherry-picked in their original order, without `550d6b0459b`. The fix `562ce4f58fa` "Keep a collection's direct and map-over options on one page" now says in its message that it rewrites the baseline API test into `..._keeps_direct_and_multirun_entries_together`. That is where the paging behavior changes.

## Refactor candidates re-checked and left in the feature

- `524099dce14`: making handleIncoming reuse `normalizeOption` is not behavior-preserving on base. Base pushes the raw incoming value, while `normalizeOption` returns the existing option. The other items in that commit tidy feature code.
- `024adf78013`, `4b9af2f814b`, `5d15cfcdb30`, `cab17f2f1a9`: these restructure feature-only code or feature-only tests.
- `185668c9d8f` and `a469e0c1e33` are selector fixes, not refactors.

## Validation

All runs used a temporary worktree with deps symlinked in. The worktree was removed afterwards.

| Point in history | Check | Result |
|---|---|---|
| `b89794a9f36` (on base) | vitest on FormData.test.ts and collectionTypeDescription.test.ts | 33 passed |
| `76750495c46` (on base) | pytest on `test_parameter_pagination.py` | 2 passed |
| `76750495c46` (on base) | API `..._splits_direct_and_multirun_entries` | passed |
| Refactor tip `d3afe84699d` | pytest on paging | 2 passed |
| Refactor tip `d3afe84699d` | vitest on Form/, ToolForm, Workflow/Run, collectionTypeDescription, Collections | 48 files, 323 tests passed |
| Head `10ae420a663` | pytest on paging | 3 passed |
| Head `10ae420a663` | same vitest set | 366 passed |
| Head `10ae420a663` | API `..._keeps_direct_and_multirun_entries_together` | passed |

ruff was not available in the venv. The Selenium files are unchanged from the earlier pass, which had them ruff-clean. Nothing was pushed.
