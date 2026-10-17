No refactoring of the base branch was performed.

History unchanged: `2203d0d3d95` baseline tests, `7462b38acbf` server fix, `e4a0f756c63` client fix (base `dbe4f2f7e41`).

## Candidates considered

- **Client: extract `mergeDataOptions` ahead of the fix (key src+id), then change the key in the fix.** Rejected. On base the two merges differ: `ToolForm.mergeFetchedOptions` dedups only against existing options; `WorkflowRunDefaultStep.mergeFetchedOptions` also dedups within the incoming page. Within one server page the only src+id duplicates are a collection's direct + map-over pair. So one shared helper at the old key can't keep both behaviors. Either ToolForm starts dropping a same-page map-over entry (a regression in the refactor commit; that case works on 26.1 today), or WorkflowRunDefaultStep stops dropping it (that is part of the fix). Any version is a behavior change, not a refactor. Keeping a flag to preserve both would add code the fix then deletes. Splitting would also leave a one-line fix commit, which helps backport review little.
- **Server: drop `hit_limit` / inner `break` in `accumulate_with_filter`.** This is the fix itself (row-atomic paging), not separable.
- **API test `page()` closure.** Only the fix's replacement test uses it. Moving it into the baseline test would change test code with no gain.
- **Review follow-ups (T2 shared `mergeFetchedInput`, N1 WorkflowRunInputStep/FormSimple merges, unifying `itemUniqueKey`/`pageMergeKey`).** These are pure refactors or scope expansions of two Options API components on a release branch. They belong on dev, so they are out of backport scope.

## Verification (HEAD `e4a0f756c63`)

- unit `test_parameter_pagination.py`: 2/2
- vitest `FormData/types.test.ts`: 4/4 (node 22.20.0)
- API not re-run: no code changed.
