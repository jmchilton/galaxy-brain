# Test challenges review — PR #24304

Profile: [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) · model Opus 5.5 (claude-opus-5-5) · effort low · reviewed commit 4471d665921a87dd5b68e3911025e9d55ede757c. Details: [test_challenges_debrief.md](test_challenges_debrief.md).

### P2 1: Sort fix not tested beyond the initial default

PR fixes the picker "ignoring sort", but `HistoryDatasetPicker.test.ts` only asserts the first request's default `sort_by=update_time, sort_desc=true`. The component-owned mapping (`label` column -> `sort_by=name`, `ctx.sortDesc` passthrough) is untested. Add a case that changes sort and asserts the follow-up `/api/histories` query.

### P3 1: Component test re-asserts `getMyHistories` flags

`show_own/show_published/show_shared/show_archived` are already asserted in `client/src/api/histories.test.ts`. Narrow the component assertion to `search`, `sort_by`, `sort_desc` (optionally keep `show_published: "false"` as the regression anchor).

### P3 2: Untyped fixture

`HISTORY` is cast `as any`; reuse/extract a typed history fixture like `mockHistory` in histories.test.ts.

### P3 3: No E2E regression for public-history leak (optional)

`test_library_contents.py::test_import_dataset_from_history` covers the picker happy path; nothing above the client mock asserts another user's published history is absent. Reasonable to skip on a release-branch fix.

Note for bug checker (not a test finding): PR drops the `q/qv` advanced-filter passing from `HistoriesFilters.getQueryDict`.
