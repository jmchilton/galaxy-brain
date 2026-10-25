# Thermo-nuclear code quality review (post-rescope)

Verdict: no structural regression and no file crosses 1k lines (`HistoryList.vue` 798 -> 877, `WorkflowList.vue` 637 -> 707, `visualizationsShared.ts` 107 -> 156). The rescope did add real copy-paste, though: three bulk loops that are nearly the same and three `pluralX` helpers. Both are new on this branch, so I consolidated them without touching any existing callers.

Acted on:
- **Three near-identical bulk loops** (`HistoryList.onBulkUnshareWithMe`, `WorkflowList.onBulkUnshareWithMe`, viz grid batch op) each did the same thing: copy the list, await each item, catch the error, push `'name' (errorMessageAsString(e))`. The workflow copy also kept two parallel arrays (`failed`, `failures`) that had to stay in sync. Added `client/src/utils/settleEach.ts`:
  - `settleEach(items, op)` runs over a snapshot in order, continues past failures and returns one `{item, error}[]`.
  - `describeFailures(failures, nameOf)` builds the shared message fragment.
  - Each call site keeps its own confirm, its toast or grid-status result, and its reselect behaviour, because those are different UX surfaces.
  - The API wrapper is passed in from the call site, so the existing `vi.mock("@/api/...")` component tests still intercept and act as the behaviour guard.
  - Added a unit test for order, continue-past-failure, snapshot iteration and formatting.
- **Three `pluralHistories`/`pluralWorkflows`/`pluralVisualizations` helpers** are replaced by one `pluralize(count, singular, plural = singular + "s")` in `client/src/utils/strings.ts`, tested in `strings.test.ts`. No plural or ngettext helper existed in `utils/` or `localization.js`.
- Folded into the originating commits: helpers plus history call site into "Add bulk Remove from Shared to histories shared with me", the workflow call site into the workflows bulk commit, and the viz call site into the viz batch commit. Each intermediate commit builds. The tree after the rebase is identical to the pre-rebase fixup tip.

Not acted on:
- **Backend batch `unshare_with_me` endpoint.** This is the truly ambitious move, since the three client loops would disappear into one request. But it adds an API across three types on a release branch. Dev follow-up.
- **Parallelising the loops** (`Promise.allSettled`). The sibling bulk delete and restore run sequentially, and sequential keeps the load off the server for large selections.
- **Migrating existing `onBulkDeleteOrPurge`/`onBulkRestore`** (history and workflow) to `settleEach`. They are existing callers, and their stop-on-first-error semantics differ. Dev follow-up. I also noticed that `tmpSelected` in history `onBulkDeleteOrPurge`/`onBulkRestore` is computed but never used. That is pre-existing.
- **History bulk unshare doesn't reselect failures; workflow does** (`selectTmpSelected`). Each matches its own list's existing bulk-op behaviour, since `HistoryList` has no reselect helper. I left it unchanged.
- **`onDelete` early returns in shared views.** `SelectedItemsProps.onDelete` is required, and making it optional or adding a "delete key disabled" option would change the shared `useSelectedItems` composable.
- **`(isMyHistory(history) || props.sharedView)` repeated in `HistoryCard` and `HistoryCardList`.** It mirrors the existing duplicated `isMyHistory` gate at both levels. Collapsing it means restructuring the existing select plumbing.
- **Options object / view enum for `useWorkflowCardActions` (now 7 positional params) and `useHistoryCardActions`.** Re-checked: `HistoryCard.vue` and `WorkflowCard.vue` pass positionally, and `HistoryList.vue`/`WorkflowList.vue` call them for `onDelete`. Converting touches existing callers. Dev follow-up.
- **`WorkflowsManager.unshare_with` select-and-delete loop for `StoredWorkflowMenuEntry`.** A Core `delete()` would bypass ORM session bookkeeping on the user's menu-entry collection. That is not worth the risk on a release branch.
- **Per-router duplicated `unshare_with_me` handlers, double share-assoc query, inline `AuthenticationRequired`.** Still valid for the reasons given in the earlier pass (`earlier_drafts/1/thermo_nuclear_review.md`): they match the per-router duplication of the existing sharing routes, keep a single manager hook, and `ShareableService` doesn't extend `ServiceBase`.
- **Single-item card actions (history/workflow composables, viz row op)** keep their own confirm, toast and refresh. Each follows its file's conventions (`localize`/`Toast` vs `useToast` vs grid status), and a cross-type helper would not remove a concept.

Tests:
- vitest `src/components/History src/components/Workflow/List src/components/Grid src/api` plus the new util tests: 70 files, 554 passed.
- eslint: 0 errors (6 pre-existing `v-on-event-hyphenation` warnings). prettier clean. `pnpm run type-check` clean after a `String(row.title)` fix in the viz call site.
- `make client-production` rebuilt. Playwright `test_history_sharing.py::TestHistorySharing::test_bulk_unshare_with_me` passed, and so did `test_workflow_sharing.py -k test_unshare_with_me`.
- Backend untouched, so the API tests were not rerun.

<details><summary>Full review</summary>

**Structural / code judo.** The three bulk-unshare loops are the clearest missed simplification. All three implement the same "sequential settle and collect labelled failures" algorithm with slightly different bookkeeping, and the workflow copy carries two arrays that must stay index-aligned. The biggest judo move would be a server-side batch endpoint, which removes the loops entirely. On release_26.2 the in-scope move is a pure helper, `settleEach`, that returns typed `{item, error}` records. That one return value covers both the failure count and the workflow reselect list, and the parallel-array state goes away. Confirm, toast and refresh stay per site, because folding them in would need mode flags (toast vs grid return, reselect vs not).

**Bespoke helpers (rule 6).** `pluralHistories`, `pluralWorkflows` and `pluralVisualizations` are three one-line copies of the same ternary. Galaxy has no plural helper (`utils/strings.ts`, `localization.js` and grep across `client/src` all checked; other sites inline `count === 1 ? ... : ...`). A single `pluralize` in `strings.ts`, next to `capitalizeFirstLetter`/`orList`, is the right home.

**Spaghetti.**
- The `onDelete` early returns in `HistoryList`/`WorkflowList` are view checks bolted into a shared-composable callback. They are justified because the composable has no "no delete key" option and `onDelete` is required.
- `selectable` widening (`myView || sharedView`, `!published`) is direct.
- The `HistoryCard`/`HistoryCardList` select gate is duplicated, but that duplication was already there.
- `WorkflowCard` `:selectable="props.selectable && (!shared || props.sharedWithMeView)"` reads awkwardly but is a single expression.

**Types / boundaries.** `VisualizationEntry = Record<string, unknown>` forces `String(row.id)`/`String(row.title)`. That is the existing grid convention. `SettleFailure<T>` keeps the item type through to `selectTmpSelected`.

**Orchestration / atomicity.** Each bulk loop is sequential and non-atomic by design: it continues past failures and reports them. A failed item leaves its share intact, and the list reloads in `finally`, so the UI always reflects the server. No state is left half-applied on the client.

**File size.** All under 1k. `HistoryList.vue` is the largest at 877, and its growth is the bulk footer block plus one handler. Decomposition isn't warranted for this diff.

**Backend.** The `WorkflowsManager.unshare_with` override is the right hook: it covers both the owner-side and recipient-side unshare and commits once. `ShareableService.unshare_with_me` checks for an anonymous user before `get_share_assocs`, which matters because `user=None` returns every assoc, and it returns 404 for not-shared and missing items alike. No change.
</details>
