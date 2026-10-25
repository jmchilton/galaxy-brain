# Scope evaluation

**Recommendation: expand (modestly).** Keep everything as implemented, stay on `release_26.2`, and add batch "Remove from Shared" to the three shared-with-me lists the issue thread asked about: histories and workflows (turn on their existing `useSelectedItems` selection and bulk footer in the shared view), and visualizations (add a `batch` entry to `visualizationsShared.ts`). Put the history PUT in an `unshareHistoryWithMe` wrapper in `@/api/histories`, next to the existing `unshareWorkflowWithMe`, so the card action and the bulk action share it. Also override `unshare_with` in `WorkflowsManager` so that removing a share deletes the recipient's `StoredWorkflowMenuEntry` bookmark, both when the recipient removes it and when the owner does. Leave out share-time ordering (no timestamp column, so it needs a migration and a dev target), a shared-with-me pages list, and the options-object refactor.

## Possible Decompositions

The branch adds 541 non-generated lines: 195 production, 346 test. The "Baseline tests" commit (`79b7bba0615`) goes first in every option.

- **A. Backend, then UI (2 PRs).**
  1. Baseline tests, `ShareableService.unshare_with_me`, the four routes, the regenerated schema, and the API tests. The bookmark cleanup, if added, goes here.
  2. Client: history cards, workflow cards, the viz grid op, the `@/api/workflows` wrapper, navigation.yml, vitest, and both E2E tests. Batch actions, if added, go here.
- **B. Per type (4 PRs, landing in order).**
  1. Baseline tests, backend, schema and API tests.
  2. Histories UI and E2E.
  3. Workflows UI, wrapper and E2E.
  4. Visualizations grid op and vitest.

  Items 2 to 4 each depend only on item 1.
- **C. Single PR, as it is now.** The backend is about 80 lines and only matters with a UI on top, so reviewers may want to see the pair together.

## Scopes considered

### 1. As implemented
Recipient-side `PUT /api/{histories,workflows,pages,visualizations}/{id}/unshare_with_me` (204) deletes only the caller's share association. There is a per-item "Remove from Shared" on shared history cards, shared workflow cards and the shared visualizations grid. Pages get the API only.

| Pros | Cons |
|---|---|
| - Covers the issue's main ask ("per-history unshare in the pull-down menu is what I think we need now") and the extension in John's comment (workflows, pages, viz)<br>- One general service method, so every sharable type gets it<br>- Additive, no migration, fits `release_26.2` | - Leaves out the batch unshare the thread explicitly mentions ("unshare was nice as a batch"), even though both card lists already have selection and bulk-footer code that is switched off in the shared view<br>- The history PUT is inline `GalaxyApi()`, while the workflow one goes through a wrapper |

### 2. Batch remove-from-shared in all three lists (recommended)
Turn on the existing selection and bulk footer in the shared history and workflow views, and add a `batch` op to the shared visualizations grid. All of them go through per-type client wrappers: a new `unshareHistoryWithMe` and the existing `unshareWorkflowWithMe`.

| Pros | Cons |
|---|---|
| - Asked for in the issue thread, and jennaj's instructor use case (reviewing many students' histories) is a batch workflow<br>- Reuses existing abstractions (`useSelectedItems`, bulk footers, `GridList` `batch`), with no new infrastructure<br>- Client-only, so it stays well inside release-branch norms<br>- Gives the history wrapper a second caller, which settles the "shared helper" question | - Roughly +100 to 150 lines, mostly tests<br>- Turning on selection also turns on the `useSelectedItems` keyboard Delete (`onDelete`, which calls `onDeleteHistory` in HistoryList), so in shared views it must be switched to unshare or disabled. The bulk delete, restore and tag footer must stay hidden too<br>- The legacy grid's Unshare was `allow_multiple=False`, so batch is new behaviour, not restored behaviour |

<details><summary>Details</summary>

Changes:
- `HistoryList.vue`: change `selectable` / `:show-select-all` / `:selectable` from `myView` to `myView || sharedView`. Add a footer `GButton` "Remove from Shared (N)" shown only when `sharedView`; it loops over `selectedHistories`, as `onBulkDeleteOrPurge` does. Make `onDelete` view-aware.
- `WorkflowList.vue`: let `selectable` (`!published && !sharedWithMe`) be true in the shared-with-me view, add the same footer button, and make `onDelete` view-aware.
- `visualizationsShared.ts`: add a `batch` entry. `GridList` already renders the checkboxes and the batch footer.
- `client/src/api/histories.ts`: add `unshareHistoryWithMe(id)` and route the card action and the bulk action through it.
- Tests: one vitest per bulk handler, plus one E2E that selects two shared histories and removes both (the populators already set up shared histories).

Notes:

- `HistoryList.vue:187` sets `selectable: computed(() => myView.value)`. `:show-select-all="myView"` (line ~606), `:selectable="myView"` on `HistoryCardList`, and the footer `v-if="myView && selectedHistories.length"` are the only gates. Range or keyboard selection and "select all in query" come for free.
- `WorkflowList.vue:139` sets `selectable: computed(() => !published.value && !sharedWithMe.value)`, and its bulk delete, restore and tags footer is gated the same way.
- `GridList.vue` renders checkboxes when `gridConfig.batch` is set (`types.ts` `BatchOperation`). No grid config uses it yet, so `visualizationsShared.ts` would be the first.
- A backend batch endpoint isn't needed: every existing bulk history and workflow action loops per item on the client.
- In the legacy grid code removed in `06874b7bb40`, `SharedHistoryListGrid` declared `GridOperation("Unshare", allow_multiple=False)`, but its controller handler looped over multiple `ids` ("Unshared %d shared histories"). Batch therefore isn't strictly a regression fix, but it is what the reporter asked for.
</details>

### 3. Shared-with-me ordering by share time
jennaj says (item 4) that the shared list used to sort by when the history was shared, and now sorts by `update_time`.

| Pros | Cons |
|---|---|
| - Raised twice in the thread as making the list cluttered and hard to scan | - `HistoryUserShareAssociation` / `StoredWorkflowUserShareAssociation` have only `id`, item id and `user_id`, with no `create_time`. Real share-time ordering needs a migration, which means a dev target<br>- The legacy `SharedHistoryListGrid` had `default_sort_key = "-update_time"`, so the claimed old behaviour isn't in the most recent grid<br>- Ordering by association `id` as a proxy would need a new `sort_by` value threaded through `HistoryManager.index_query` and the workflow `index_query`, which is a cross-cutting change to existing list APIs<br>- With unshare available, the clutter complaint largely goes away |

<details><summary>Details</summary>

- The client shared view calls `GET /api/histories?show_shared=true&show_own=false` (`getSharedHistories` in `client/src/api/histories.ts`) and sorts by `ListHeader` `sortBy`, which defaults to `update_time`. It doesn't use `/api/histories/shared_with_me` at all. That endpoint orders via `_build_order_by(filter_query_params.order)` and is unaffected by this branch.
- Recommend a separate dev issue: "order shared-with-me by share time". It would add `create_time` to the share-association tables and a `shared_time` sort key.
</details>

### 4. Shared-with-me pages list
Add `pagesShared.ts` (mirroring `visualizationsShared.ts`, 128 lines), a `/pages/list_shared` route, a tab in `GridPage.vue`, and the Remove op.

| Pros | Cons |
|---|---|
| - Pages are the only type with the API but no UI, so recipients can't find pages shared with them at all<br>- Small and mirrors existing code | - No shared-pages listing exists, so recipients have no clutter to remove. Adding a listing is a new discoverability feature, not the missing unshare action this issue is about<br>- A new navigation tab is a UX decision maintainers may want to weigh on its own<br>- Better as a follow-up that reuses this branch's endpoint |

### 5. Remove the recipient's workflow bookmark (`StoredWorkflowMenuEntry`) on unshare (recommended)
Override `unshare_with` in `WorkflowsManager` (a `SharableModelManager` subclass) so that deleting a share also deletes that user's menu entry for the workflow, honouring `flush=False`. That covers both owner-side and recipient-side unshare. About 10 lines plus one API test.

| Pros | Cons |
|---|---|
| - Recipients can bookmark shared workflows (`PUT /api/workflows/{id}` `show_in_tool_panel` writes a menu entry for whoever calls it). Today a removed share leaves that row behind, and the bookmark comes back if the item is ever shared again, which is user-visible<br>- `manager.unshare_with` is the single hook, kept on purpose by the thermo-nuclear review for exactly this follow-up<br>- Covers the touched code path in one place, so owner-side and recipient-side unshare behave the same | - While the share is gone the stale row is hidden, because `show_in_tool_panel` is computed only on listed, access-filtered items and the client never reads `ids_in_menu` from `/api/workflows/menu`<br>- It also changes owner-side unshare, through `update_current_sharing_with_users`, which loops `unshare_with(flush=False)` |

### 6. Options-object / view-enum refactor of `useWorkflowCardActions` / `useHistoryCardActions`

| Pros | Cons |
|---|---|
| - Seven positional parameters including three booleans is a real smell | - Touches existing callers (`WorkflowList.vue`, `HistoryList.vue`, `HistoryCard.vue`) for no behaviour change<br>- Refactor-only work belongs on dev. All three reviews (normal, thermo-nuclear, baseline-refactor) deferred it |

### 7. Shared cross-type client `unshareWithMe(type, id)` helper / sharing router mixin

| Pros | Cons |
|---|---|
| - One concept, four types | - The typed `GalaxyApi()` per-type paths make a generic helper awkward<br>- The routers already duplicate every sharing route per type, and a mixin would be a dev-wide change<br>- The per-type wrapper in scope 2 gets most of the benefit |

### 8. Target `dev` instead of `release_26.2`

| Pros | Cons |
|---|---|
| - The change adds four routes, which is feature-shaped | - It restores functionality lost when the legacy grid went away, the issue is labelled `release-testing-26.2`, and the change is additive with no migration. Galaxy accepts this kind of change on release branches<br>- Keep `dev` as the fallback only if maintainers object. Scope 3 is the only option here that would force `dev` |
