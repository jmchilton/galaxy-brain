### P2 1: Sorting a history's datasets re-sorts the history list after Back (implementation verified)

The description says "an explicit column sort still wins over that default," but in the history view none of the columns (`History Name`, `Datasets`, `Last Updated`) are marked `sortable`, so GTable ignores header clicks there. The only sort that reaches `historiesProvider` is one carried over from the datasets view. `SelectionDialog` keeps a single `sortBy`/`sortDesc` for both views, and `onUndo` resets only the filter and pagination. If you sort a history's datasets by Name and click Back, the history list is requested with `sort_by=name&sort_desc=false`: alphabetical, with no sort indicator, instead of newest first. Before this PR the unfiltered list took the legacy path, which ignored sort, so this carryover is new in the default (unfiltered) list. The PR's test checks only the initial order.

Since the history view has no sortable column, `historiesProvider` can always request `update_time` descending, which also removes the unreachable `label`→`name` mapping. A test that opens a history, sorts its datasets, clicks Back, and checks the last `/api/histories` query fails at 4471d66 (`sort_by: "name"`, `sort_desc: "false"`) and passes with the fix. Making history columns sortable would be a separate change: it needs `sortable` fields plus a sort reset on view switch, and GTable's header sort state is uncontrolled.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at low effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 1: Redundant `?? ""` and comment duplicate the helper's contract (implementation verified)

`getHistories` already defaults `search = ""` and always sends it, and `ctx.filter` is `filter.value || undefined`, so `search: filter ?? ""` sends the same request as `search: filter`. The comment above the call explains a backend quirk the helper exists to hide. It is more useful on `getHistories`'s docstring, next to the existing note about visibility flags, where every caller benefits.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 2: Untyped test fixture (implementation verified)

`HISTORY` is passed to the mock as `as any` behind an eslint-disable. Typing it as `MyHistory` type-checks against the mocked `/api/histories` response with no cast, so the cast and the disable can both go.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at low effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 3: No end-to-end regression for the public-history leak

`test_library_contents.py::test_import_dataset_from_history` drives this picker end to end, but no layer above the client mock checks that another user's published history stays out of the list. The vitest pins the outgoing `show_published=false`, and `test_histories.py` covers what the API does with it, but nothing ties the two together in the real dialog. A Selenium case can have a second user publish a history, then have the admin search the picker for both that history and one of their own. The admin's own history is the positive control. The review branch adds this test, but it was written without being run locally because this worktree isn't bootstrapped, so CI is its first run.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at low effort.

</details>
