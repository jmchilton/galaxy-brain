

<details><summary>Automated Review Details</summary>

- Review profile [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) was run via Claude Opus 5.5 at medium effort.
- Review profile [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) was run via Claude Opus 5.5 at low effort.
- Review profile [gx_risk_assessment](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_risk_assessment.md) was run via Claude Opus 5.5 at low effort.
- Verification was run as documented [here](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/PROCESS_INITIAL_REVIEW.md) via Claude Opus 5.5 at medium effort.

</details>

<details><summary>Risks</summary>

Risks are minimal - this change doesn't lock Galaxy into particular difficult to change choices (a two-way door). It is a client-only fix scoped to the library import history picker, reusing the existing `getMyHistories` helper; no API, workflow, or tool behavior changes.

<details><summary>Risk Details</summary>

- Users who relied on the picker showing public/published histories from other users will no longer see them; this is the intended fix (importing from others' histories into a library was not the picker's purpose).
- Advanced filter terms are no longer sent as `q`/`qv`; the raw filter text goes in `search` instead, so filter behavior now depends on the server's search parser.
- Requested `keys` change from `create_time` to `username`; nothing in the picker reads `create_time`.

</details>

<details><summary>Risk Review Advice</summary>

Confirm that filters typed in the picker (e.g. `name:foo`, `tag:bar`) still narrow results through `search`, and that paging totals are correct now that `search` is always non-empty. Rollback is a simple revert.

</details>

</details>

## Automated Review Findings

<details><summary>About findings</summary>

These are broken into P1 (must fix), P2 (should fix), and P3 (smaller nits). These ratings are agent defined and the priority to John may be different and called out above. If anything is rated P3 and not called out as important by John above - please don't feel compelled to act on them or respond to them.

You're contributing to a repository John cares about and you deserve a human response. If any of these don't make sense or are missing important context - please push back and accept John's apology.

</details>

<details><summary>Review Verification Branch Details</summary>

This [review branch](https://github.com/jmchilton/galaxy/tree/pr_24304_review_0) contains work the verification agent did to help verify findings and make sure suggestions make sense and are actionable. This doesn't necessarily represent production ready code. Feel free to include any commits in the PR but they should be reviewed by a human.

<details><summary>Branch and Commit Details</summary>

[`pr_24304_review_0`](https://github.com/jmchilton/galaxy/tree/pr_24304_review_0) builds on the PR head (4471d665921). Sort state from the datasets view no longer carries into the history list: the history list has no sortable columns, so it always requests the newest histories first, and a new vitest covers the dataset-sort-then-Back path. The branch also moves the note about the `search` fallback from the picker to the `getHistories` docstring, drops the redundant `?? ""`, and types the test fixtures so the `as any` casts go away. It also adds a Selenium regression for the public-history leak, which was written without being run locally. No existing assertions were removed or weakened.

- [`dd228a93392`](https://github.com/jmchilton/galaxy/commit/dd228a93392) Keep library history picker newest first after dataset sorting: `historiesProvider` always sends `update_time` descending, the dead `label`→`name` mapping is gone, and there is a red-to-green test for sorting datasets and then clicking Back.
- [`b5900e4f73c`](https://github.com/jmchilton/galaxy/commit/b5900e4f73c) Document getHistories search default; drop redundant picker fallback: moves the legacy-listing note onto `getHistories` and passes `search: filter` directly.
- [`644b2cfbfeb`](https://github.com/jmchilton/galaxy/commit/644b2cfbfeb) Type HistoryDatasetPicker test fixtures: types `HISTORY` as `MyHistory` and `DATASET` as `HDASummary`, which removes both `as any` casts and their eslint-disables.
- [`e7b287e2cd3`](https://github.com/jmchilton/galaxy/commit/e7b287e2cd3) Selenium: library history picker excludes other users' published histories: `test_import_from_history_lists_only_own_histories` has a second user publish a history, then checks that the admin's picker lists the admin's own history and not the published one. Only `py_compile`, ruff and black were run (worktree not bootstrapped).

</details>

</details>

### P2 1: Sorting a history's datasets re-sorts the history list after Back (implementation verified)

The description says "an explicit column sort still wins over that default," but in the history view none of the columns (`History Name`, `Datasets`, `Last Updated`) are marked `sortable`, so GTable ignores header clicks there. The only sort that reaches `historiesProvider` is one carried over from the datasets view. `SelectionDialog` keeps a single `sortBy`/`sortDesc` for both views, and `onUndo` resets only the filter and pagination. If you sort a history's datasets by Name and click Back, the history list is requested with `sort_by=name&sort_desc=false`: alphabetical, with no sort indicator, instead of newest first. Before this PR the unfiltered list took the legacy path, which ignored sort, so this carryover is new in the default (unfiltered) list. The PR's test checks only the initial order.

Since the history view has no sortable column, `historiesProvider` can always request `update_time` descending, which also removes the unreachable `label`→`name` mapping. A test that opens a history, sorts its datasets, clicks Back, and checks the last `/api/histories` query fails at 4471d66 (`sort_by: "name"`, `sort_desc: "false"`) and passes with the fix. Making history columns sortable would be a separate change: it needs `sortable` fields plus a sort reset on view switch, and GTable's header sort state is uncontrolled.

Fixed in [`dd228a93392`](https://github.com/jmchilton/galaxy/commit/dd228a93392) on the review branch.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at low effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 1: Redundant `?? ""` and comment duplicate the helper's contract (implementation verified)

`getHistories` already defaults `search = ""` and always sends it, and `ctx.filter` is `filter.value || undefined`, so `search: filter ?? ""` sends the same request as `search: filter`. The comment above the call explains a backend quirk the helper exists to hide. It is more useful on `getHistories`'s docstring, next to the existing note about visibility flags, where every caller benefits.

Fixed in [`b5900e4f73c`](https://github.com/jmchilton/galaxy/commit/b5900e4f73c) on the review branch.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 2: Untyped test fixture (implementation verified)

`HISTORY` is passed to the mock as `as any` behind an eslint-disable. Typing it as `MyHistory` type-checks against the mocked `/api/histories` response with no cast, so the cast and the disable can both go.

Fixed in [`644b2cfbfeb`](https://github.com/jmchilton/galaxy/commit/644b2cfbfeb) on the review branch.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at low effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 3: No end-to-end regression for the public-history leak

`test_library_contents.py::test_import_dataset_from_history` drives this picker end to end, but no layer above the client mock checks that another user's published history stays out of the list. The vitest pins the outgoing `show_published=false`, and `test_histories.py` covers what the API does with it, but nothing ties the two together in the real dialog. A Selenium case can have a second user publish a history, then have the admin search the picker for both that history and one of their own. The admin's own history is the positive control. The review branch adds this test, but it was written without being run locally because this worktree isn't bootstrapped, so CI is its first run.

Added in [`e7b287e2cd3`](https://github.com/jmchilton/galaxy/commit/e7b287e2cd3) on the review branch (written but not run locally; CI is its first run).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at low effort.

</details>
