# Scope evaluation (second pass, after rescope)

**Recommendation: expand slightly.** Keep everything as implemented on `release_26.2`, and add one small commit that uses the branch's new `pluralize` in the 11 existing owner bulk confirm and toast strings of `HistoryList.vue` and `WorkflowList.vue`, two files the branch already edits. With one item selected, those strings read "delete 1 histories", "Restored 1 workflows" and so on, and the commit also covers the Multiview toast ternary. Leave everything else out: `settleEach` in the owner bulk loops, Multiview for shared histories, a backend batch endpoint, bulk workflow and visualization E2E tests, the items the first evaluation left out, and any contraction. Because this is a scope change in the second pass, the branch parks as BLOCKED until John decides whether to add the plural commit or ship as is.

Why the rest stays out:
- **`settleEach` in the owner bulk loops:** it would change owner delete and purge from stopping at the first error to continuing past failures.
- **Multiview for shared histories:** it needs changes in Multiview itself, because its "Switch to" button calls `history/set_as_current`, which accepts only owned histories (`get_owned`).
- **Everything else:** see the scope sections below. No test pins the plural strings.

## Possible Decompositions

The non-generated diff adds 1348 lines and deletes 26, for 1374 changed lines. Of those, 483 are production and 891 are tests. The counts come from `git diff --numstat origin/release_26.2...HEAD`, excluding `schema.ts` and counting test and selenium paths as tests.

Things that hold across the options:
- **Baseline first:** `1f15cbcd054` "Baseline tests" goes first in every option. Part of it, the my-view Delete-key and owner-footer controls, only matters to the bulk pieces.
- **Utilities:** `settleEach.ts` and `pluralize` first appear in `90e00fa62c1`, so the per-item commits don't depend on them.
- **Bookmark commit:** `466f0802cce` is a manager override plus API tests, and the tests cover both the recipient route and the owner-side path. It depends only on the backend commit.

- **A. Per-item, then bulk (2 PRs).**
  1. `1f15cbcd054`..`6135d9c11ba`: the backend, the schema, the per-item card, row and grid actions, and both single-item E2E tests. It matches what `_alt_original_scope` covers, but uses this branch's re-hardened commits: the API-based E2E setup and the reshaped tests.
  2. `466f0802cce` bookmark cleanup, plus `90e00fa62c1`, `6d91266e1b1`, `68239e77c14` and `7f8a10ab0e5`: the bulk actions, `settleEach`, `pluralize`, the loosened select gates, the Delete-key guards and the bulk E2E. The plural fix would also go here.
- **B. Backend, then client (2 PRs).**
  1. The baseline API tests, `f2d6fecd745`, `3553c5e238a` and `466f0802cce`: the service method, the four routes, the bookmark override and the API tests. That is about 100 production lines.
  2. Everything in the client, plus the vitest and E2E tests.
- **C. Bookmark fix first, then the feature (2 PRs).**
  1. `466f0802cce`, rewritten to test only the owner-side path. The owner already leaves a stale `StoredWorkflowMenuEntry` behind today, so this is a standalone bug fix that could even target an older release.
  2. Everything else.

  The cost of C is that the bookmark commit's recipient-route test has to move into PR 2.
- **D. Per type (4 PRs).**
  1. Backend, bookmark fix, schema and API tests.
  2. Histories: single and bulk actions, `settleEach` and `pluralize`, and the three E2E tests.
  3. Workflows: single and bulk actions and the E2E test.
  4. Visualizations: the row and batch operations.

  PRs 3 and 4 depend on the utilities from PR 2, or the utilities move into PR 1.
- **E. Single PR, as it is now.** About 483 production lines spread over four types. Reviewers see the complete recipient-side feature at once, and the commits are already ordered for review.

## Scopes considered

### 1. As implemented
The recipient-side `PUT /api/{histories,workflows,pages,visualizations}/{id}/unshare_with_me` route returns 204. Per-item "Remove from Shared" is available on shared history and workflow cards and in the shared visualizations grid. Bulk "Remove from Shared (N)" is available in all three lists through `settleEach`. Removing a share also drops the recipient's workflow bookmark.

| Pros | Cons |
|---|---|
| - Covers the issue's ask (per-item unshare), the batch unshare from the thread, and John's extension to the other types<br>- Reuses `useSelectedItems`, the bulk footers, `GridList` `batch` and `unshare_with`<br>- Additive, with no migration | - Introduces `pluralize` but leaves "1 histories" / "1 workflows" in the sibling owner bulk messages of the same files<br>- About 2.5 times the size the first evaluation measured (541 lines then, 1374 now) |

### 2. Adopt `pluralize` in owner bulk messages of touched files (recommended)
Replace the hard-coded "histories" and "workflows" in the delete, purge, restore and tag confirm and toast strings of `HistoryList.vue` (lines 356, 386, 407, 429 and 519) and `WorkflowList.vue` (lines 262, 287, 305, 326 and 419). Also replace the Multiview toast ternary (`HistoryList.vue:570`).

| Pros | Cons |
|---|---|
| - Fixes a user-visible grammar bug that shows on every single-item bulk action, in files this branch already edits<br>- Gives the new util callers in base code, which answers the "util with one feature" concern<br>- About 11 one-line string changes, with no logic change and no tests to update | - Touches owner-side strings in a recipient-focused PR<br>- Parks the branch for a decision over cosmetic text |

<details><summary>Details</summary>

- grep found no test pinning these strings (`Deleted N`, `Restored N`, `Added tag(s)`, `in multiview.`).
- The remaining strings in the same files don't need it. The "selected N histories" Multiview warning only appears when more than 10 are selected. The "Failed to ... some histories" toasts have no count.
- The other roughly 19 client files with an inline `=== 1 ?` ternary (`CuratedWorkflowCard.vue`, `WorkflowMissingToolsRequest.vue`, `historyGraphMapper.ts`, and others) belong in a dev cleanup, not this branch.
</details>

### 3. Adopt `settleEach` in existing owner bulk loops
Rewrite `onBulkDeleteOrPurge`, `onBulkRestore` and `onBulkTagsAdd` in both lists on top of `settleEach`.

| Pros | Cons |
|---|---|
| - One bulk-loop pattern per file<br>- Would remove the unused `tmpSelected` in history delete and restore | - Changes the behaviour of destructive owner operations from stopping at the first error to continuing past failures, on a release branch<br>- Not a bug in the touched recipient code. The baseline-refactor and thermo-nuclear reviews both rejected it<br>- Better as a dev follow-up, alongside the store's unused `deleteHistories`/`restoreHistories` batch calls |

### 4. Multiview from the shared histories view
Show the existing "Open in Multiview (N)" button in the shared footer, now that the shared view allows selection. That suits jennaj's instructor use case of reviewing many students' histories.

| Pros | Cons |
|---|---|
| - Selection and the button already exist, and pinned items load by id (`useExtendedHistory`). `MultipleViewItem` already subscribes viewers to non-owned histories | - `MultipleViewItem`'s "Switch to" calls `set_as_current`, which uses `history_manager.get_owned`, so it would fail on every shared history. Multiview would need ownership-aware controls and tests<br>- A new feature in untouched code, not asked for in the issue<br>- A separate issue or follow-up |

### 5. Bulk workflow and visualization E2E tests
Add Selenium tests for bulk removal in the shared workflow and visualization lists, mirroring `test_bulk_unshare_with_me`.

| Pros | Cons |
|---|---|
| - Only histories have a bulk E2E test | - The test-challenge pass judged coverage: the WorkflowList bulk vitest mounts the real card list, and visualizations have no Selenium populator or helper, so testing them means building new infrastructure<br>- Test-only, and it doesn't change scope. Leave it to CI or a follow-up |

### 6. Backend batch `unshare_with_me` endpoint
Add `PUT /api/{type}/batch/unshare_with_me` taking `ids`, and point the three bulk actions at it instead of looping on the client.

| Pros | Cons |
|---|---|
| - One request per bulk action, and it would remove the three client loops<br>- There is precedent: `PUT /api/histories/batch/delete` and `batch/undelete`, and `chat/exchanges/batch/delete` | - The precedent loops over items on the server, with no atomicity, so it buys little over the client loop<br>- The store's `deleteHistories`/`restoreHistories` wrappers for those endpoints have no component callers, so the existing bulk UI doesn't use batch endpoints either<br>- It would add three or four more routes plus schema on a release branch. Dev follow-up |

### 7. Items the first evaluation left out (reaffirmed)
- **Share-time ordering:** the share-association tables have no `create_time`, so this needs a migration and therefore a dev target. Still out.
- **Shared-with-me pages list:** a new discoverability tab, not a missing action. Follow-up.
- **Options object or view enum for `use{History,Workflow}CardActions`:** a refactor that touches existing callers. Dev.
- **Cross-type `unshareWithMe(type, id)` helper or sharing-router mixin:** typed per-type paths and per-router duplication of the sharing routes. The per-type wrappers now exist. Dev.

### 8. Target `dev` instead of `release_26.2`

| Pros | Cons |
|---|---|
| - Bigger and more feature-shaped than it was at the first evaluation: four routes and bulk UI in three lists | - Still additive with no migration, and it restores the legacy grid's Unshare. The issue is labelled `release-testing-26.2`<br>- Nothing in the recommended scope forces dev. Keep dev as the fallback if maintainers object |

### 9. Contract to the original per-item scope
Ship `issue_17204_remove_shared_with_me_26.2_alt_original_scope` and move the bulk actions and bookmark cleanup into follow-ups.

| Pros | Cons |
|---|---|
| - Cheap, because the alt is pushed and hardened, and it halves the review<br>- Same split as decomposition A | - Drops the batch removal the thread asked for, which is jennaj's instructor case<br>- Leaves stale workflow bookmarks that come back when a workflow is shared again<br>- Decomposition A gets the same reviewability without giving the work up |
