---
type: research
subtype: component
tags:
  - research/component
  - galaxy/client
  - galaxy/collections
  - galaxy/testing
component: "History Panel Selection and Collection Builders"
galaxy_areas: [client, collections, testing]
status: draft
created: 2026-10-30
revised: 2026-10-30
revision: 1
ai_generated: true
summary: "How the history panel owns item selection and hands it to the Build Dataset List modal and the Auto/Advanced Build List wizard, and when selection resets"
sources:
  - "vault/agents/gx_research/todo/history_panel_selection_and_collection_builders.md"
  - "https://github.com/galaxyproject/galaxy/issues/24469"
  - "https://github.com/galaxyproject/galaxy/pull/24487"
  - "https://github.com/galaxyproject/galaxy/pull/24399"
related_notes:
  - "[[PR 19377 - Collection Types and Wizard UI]]"
  - "[[Component - E2E Tests - Writing]]"
  - "[[Component - Collection API]]"
  - "[[Component - Collection Creation API]]"
  - "[[Component - Auto Pairing]]"
related_prs: [24487, 24399, 19377]
---

# History Panel Selection and Collection Builders

Verified against Galaxy `origin/dev` at `65e6daff2334c8cfd4971682eecfb87f38a224be`. Paths are relative to `client/src/` unless they start with `lib/`.

**Scope**: client-side selection state in the history panel, the Selection dropdown's events, and the two ways a selection becomes a collection: the `CollectionCreatorIndex` modal ("Build Dataset List") and the routed list wizard ("Auto Build List" / "Advanced Build List"). The note covers which paths leave selection mode, which history the collection lands in, and the Selenium helpers and selectors for these flows. **Out of scope**: what the server does with the create payload (see [[Component - Collection API]] and [[Component - Collection Creation API]]), the internals of the individual builders (list, paired, rules) and auto-pairing (see [[Component - Auto Pairing]]), and the library and workflow-form callers of `CollectionCreatorIndex`.

**Baseline vs proposed**: the stale-selection fix [#24487](https://github.com/galaxyproject/galaxy/pull/24487) merged to `release_25.1` on 2026-10-30, but it isn't on `dev` at this SHA. Everything below describes `dev`. The fix is described separately and labelled as proposed for `dev` in [Pending: #24487](#pending-24487-reset-on-create).

## Ownership at a glance

```
HistoryPanel.vue                         owns selection state via useSelectedItems()
 ├─ HistoryOperations.vue                "Select Items" toggle  -> update:show-selection
 │   └─ slot selection-operations
 │       ├─ SelectionOperations.vue      Selection dropdown     -> update:show-selection, operation-error
 │       │   ├─ "Build Dataset List"     -> <CollectionCreatorIndex> modal (in place)
 │       │   └─ "Auto/Advanced Build List" -> collectionBuilderItemSelection store
 │       │                                 -> router.push(/collection/new_list?advanced=…)
 │       └─ SelectionStatus.vue          clear (x) / Select All -> reset-selection, select-all
 └─ ContentItem.vue (per row)            .selector button       -> update:selected

/collection/new_list -> ListWizard.vue   reads the store; has no link back to HistoryPanel
```

## Selection state: `useSelectedItems`

`composables/selectedItems/selectedItems.ts` is a generic composable. `HistoryPanel.vue` is its history-panel consumer (`components/History/CurrentHistory/HistoryPanel.vue:393-423`). It passes:

- `scopeKey: queryKey`, which is `` `${history.id}-${filterText}` `` (`HistoryPanel.vue:97-99`).
- `totalItemsInQuery: totalMatchesCount` from the history items store.
- `allItems: historyItems`, the loaded page of items.
- `selectable: canEditHistory`: the user owns the history and it is neither deleted nor archived (`HistoryPanel.vue:89-91`).
- A `querySelectionBreak` callback that drives `SelectionChangeWarning`.

State is held per panel instance and isn't stored globally. Each mounted `HistoryPanel` has its own selection: the left panel, the center `HistoryView`, and each multi-view column.

| Piece | Lines | Behavior |
|---|---|---|
| `selectedItems` | `:27` | `Map<key, item>`; replaced wholesale on every change. |
| `showSelection` | `:28` | Whether selection mode (row checkboxes, Selection dropdown) is on. |
| `allSelected` / `isQuerySelection` | `:29`, `:39` | "Select All" sets `allSelected`. It's a *query selection* when the query has more matches than are loaded (`totalItemsInQuery !== selectedItems.size`). `selectionSize` then reports the query total (`:38`). |
| `setShowSelection(val)` | `:54-56` | Only sets the flag. |
| `selectAllInCurrentQuery(force=true)` | `:58-66` | Selects every loaded item and sets `allSelected`. With `force=false` (Ctrl+A) and everything already selected, it leaves selection mode instead. |
| `resetSelection()` | `:255-263` | Clears the map, `allSelected` and the range/keyboard anchors. **Does not touch `showSelection`.** |

The watchers (`:424-446`) do the coupling:

- `scopeKey` changes (switching history or editing the filter text) -> `setShowSelection(false)`.
- `selectionSize > 0` -> `setShowSelection(true)`. Selecting a row turns selection mode on.
- `showSelection` goes `false` -> `resetSelection()`. **Leaving selection mode always clears the selection**, so callers emit `update:show-selection` `false` and never need `reset-selection` as well.
- `totalItemsInQuery` changes while `allSelected` -> `breakQuerySelection()`.

So there are two ways to clear the selection: `setShowSelection(false)` clears it and exits selection mode, while `resetSelection()` clears it and stays in selection mode. The clear (x) button in `SelectionStatus.vue` uses `resetSelection`, so the panel shows "Select All" afterwards. The unit tests pin both ("should discard the current selection when disabling the selection", "should discard (but not disable) the current selection on `reset`", `selectedItems.test.ts:57`, `:77`).

### Wiring in `HistoryPanel.vue`

`HistoryPanel.vue:467-499`:

- `HistoryOperations` gets `:show-selection` and maps `@update:show-selection` to `setShowSelection`. Its "Select Items" button (`.show-history-content-selectors-btn`) toggles the flag (`HistoryOperations.vue:28-30`, `:41-50`). The whole operations `<nav>` renders only `v-if="editable"` (`HistoryOperations.vue:39`), so there is no selection UI on histories the user can't edit.
- `HistorySelectionOperations` (`SelectionOperations.vue`) gets `content-selection`, `selection-size`, `is-query-selection`, `total-items-in-query` and `filter-text`. The panel listens for `update:show-selection`, `operation-error`, `hide-selection` and `reset-selection`.
- `HistorySelectionStatus` renders `v-if="showSelection"` and maps `select-all` and `reset-selection`.
- Each `ContentItem` gets `:selectable="showSelection"` and `:selected="isSelected(item)"`, and emits `update:selected` -> `setSelected`. Its checkbox is `GButton.selector` (`ContentItem.vue:341`).

**Dead listeners**: `SelectionOperations.vue` declares no `emits` and never emits `hide-selection` or `reset-selection`, so `@hide-selection="onHideSelection"` and `@reset-selection="resetSelection"` on it (`HistoryPanel.vue:490-491`) never fire. `onHideSelection` (`:303-307`) is unreachable. Both emits came from the rules-builder and per-type builder methods that commit `08410e96e57` ("Remove individual collection builders from history dropdown", Jan 2025) deleted. `SelectionStatus`'s own `reset-selection` (`:497`) is live. Filed as `research_issues/selection-operations-dead-event-wiring.md`.

## The Selection dropdown (`SelectionOperations.vue`)

An Options-API component. The root is `v-if="hasSelection && !isMultiViewItem"` (`:2`), so multi-view columns can select rows but get no Selection menu. The dropdown is `data-description="selected content menu"` (`:3`). Its button label is `num-active-selected` ("N of M selected") or, when `selectionSize === totalItemsInQuery`, `all-filter-selected` ("All M selected") (`:5-10`).

Build entries and their gates:

| Entry | `data-description` | Shown when | Handler |
|---|---|---|---|
| Build Dataset List | `build list all` (`:34`) | `showBuildOptionForAll` = `!showBuildOptions && selectionMatchesQuery` (`:304-306`), i.e. everything in the query is selected but the per-selection build options are suppressed, typically a query selection | `buildDatasetListAll()` (`:500-504`) |
| Auto Build List | `auto build list` (`:62`) | `showBuildOptions` = `!isQuerySelection && areAllSelectedActive && !showDeleted` (`:300-302`) | `listWizard(false)` |
| Advanced Build List | `advanced build list` (`:65`) | same | `listWizard(true)` |

`SelectionOperations` also watches `hasSelection` and emits `update:show-selection` `true` (`:382-388`). The composable's own `selectionSize` watcher already does this, so the emit is redundant.

### Events and when selection mode ends (baseline)

| Trigger | What it emits | Selection after |
|---|---|---|
| Hide/Unhide/Delete/Undelete/Purge (after confirm), Change dbkey, Change datatype, Add/Remove tags | `runOnSelection()` emits `update:operation-running`, then `update:show-selection` `false` *before* awaiting the API call (`:463-481`) | cleared, mode off |
| Manage Storage Location wizard `completed` | `update:show-selection` `false` (`:456-458`) | cleared, mode off |
| **Auto / Advanced Build List** | nothing; routes away (`:390-402`) | **unchanged, mode stays on** (#24469) |
| **Build Dataset List** (modal) | nothing; `@created-collection="createdCollection"` (`:163`) names a method that doesn't exist | **unchanged, mode stays on** |
| Operation error | `operation-error` -> `OperationErrorDialog` in the panel | already cleared by the emit above |
| SelectionStatus clear (x) | `reset-selection` -> `resetSelection` | cleared, mode stays on |
| Switch history / edit filter | none (the `scopeKey` watcher fires) | cleared, mode off |

With "hide original elements" on, which is the default for both build paths, the stale selection is visible: the source datasets drop out of the default `visible:true` query, so `totalItemsInQuery` falls while `selectedItems` still holds them. The dropdown then reads e.g. "2 of 1 selected". This is [#24469](https://github.com/galaxyproject/galaxy/issues/24469).

## Path 1: the `CollectionCreatorIndex` modal

`SelectionOperations.vue:153-163` mounts the modal lazily (`v-if="collectionModalType"`):

```vue
<CollectionCreatorIndex v-if="collectionModalType" v-model:show="collectionModalShow"
    :history-id="history.id" :collection-type="collectionModalType"
    :filter-text="filterText" :selected-items="collectionSelection"
    hide-on-create default-hide-source-items
    @created-collection="createdCollection" />
```

`buildDatasetListAll()` sets `collectionModalType = "list"`, `collectionSelection = undefined` and opens the modal. The selection Map is **not** passed, so the modal isn't building from the selection. `CollectionCreatorIndex` treats a missing or empty `selectedItems` as `fromSelection = false` (`components/Collections/CollectionCreatorIndex.vue:89`) and builds from `useHistoryDatasets({historyId, filterText})` instead (`:66-76`, `:92`). That is every dataset matching the panel's current filter in the panel's history.

Modal behavior relevant to callers:

- `createHDCA()` (`:154-169`) POSTs through `createHistoryDatasetCollectionInstanceFull`. It emits `created-collection` immediately, then with `hideOnCreate` it emits `update:show` `false` and `on-hide`.
- A watcher (`:171-178`) emits `created-collection` **again** when the new HDCA reaches a terminal state in the history items store. Listeners must be idempotent. Hiding the modal doesn't stop the second emit: `SelectionOperations` keeps the component mounted (`collectionModalType` stays set), and `createdCollection` is cleared only by `resetCreator` on `@close`.
- `extendedCollectionType` is a required prop (`:33`). `SelectionOperations` doesn't pass it, which triggers a Vue missing-prop warning. The library caller passes `{}` (`components/Libraries/LibraryFolder/TopToolbar/FolderTopBar.vue:463`). Filed as `research_issues/collection-creator-index-missing-extended-collection-type.md`.
- `useBetaComponents` is declared (`:42`) but nothing reads it any more.

Other `CollectionCreatorIndex` callers (out of scope): `components/Form/Elements/FormData/FormDataWorkflowRunTabs.vue:136` and `FolderTopBar.vue:458`.

## Path 2: Auto / Advanced Build List -> `ListWizard`

### Hand-off

`listWizard(advanced)` (`SelectionOperations.vue:390-402`):

1. `useCollectionBuilderItemSelection().setSelectedItems(this.history.id, Array.from(contentSelection.values()))`. For a query selection this copies only the *loaded* items, but the menu entries are hidden for query selections anyway.
2. Pushes `/collection/new_list?advanced=<bool>`. If the route is already there, it calls `$router.push(path, {force: true})`.

`force` is Galaxy's extension, not vue-router's. `patchRouterPush` (`entry/analysis/router-push.js:37-53`) appends `__vkey__=<Date.now()>`. Router views are keyed by `route.fullPath` (`entry/analysis/modules/Analysis.vue:56`), so `ListWizard` remounts and picks up the new store contents.

### The store

`stores/collectionBuilderItemsStore.ts:10-20`:

```ts
export const useCollectionBuilderItemSelection = defineStore("collectionBuilderItemSelection", () => {
    const selectedItems = ref<HistoryItemSummary[]>([]);
    const historyId = ref<string | null>(null);
    function setSelectedItems(selectionHistoryId: string, newSelectedItems: HistoryItemSummary[]) { … }
    return { selectedItems, historyId, setSelectedItems };
});
```

The store holds plain Pinia state with no persistence, so after a reload the wizard falls through to "Select datasets from the history panel…". `SelectionOperations` and `ListWizard` are its only users.

### `ListWizard.vue`

The route is `collection/new_list` -> `ListWizard`, with `initialAdvanced` coming from `?advanced` (`entry/analysis/router.js:239-245`).

- It reads `selectedItems` and `historyId` from the store (`components/Collections/ListWizard.vue:47`). `useCollectionCreation(() => historyId.value || "")` (`:49`) makes the rules builder's payload use that history.
- It renders only `v-if="currentHistoryId && historyId"` (`:212`).
- `initialize()` (`:62-78`) runs `autoPair()` over the selection and infers `list:paired` when more than 20% of the items pair. In Auto mode (`initialAdvanced=false`) it jumps straight to the inferred builder. In Advanced mode it starts at "What are you building?". It runs again whenever `selectedItems` changes (`:93-95`).
- The builders `ListCollectionCreator` and `PairedOrUnpairedListCollectionCreator` get `:history-id="historyId"` (`:243`, `:266`). Their `useCollectionCreator` builds the payload from `props.historyId` (`components/Collections/common/useCollectionCreator.ts:87`). `RuleCollectionBuilder` goes through `ruleOnAttemptCreate` -> `createPayload` (`:184-194`).
- `onCreate()` (`:168-175`) POSTs and sets `collectionCreated`, which shows the alert `data-description="list wizard created alert"`: "Collection created and added to the history it was built from." (`:221-225`).
- On success **nothing reaches `HistoryPanel`**. The wizard and the panel share only the store, and the store carries no completion signal at this SHA.

### History-id handling: current vs selected history

- `useCollectionCreation(historyId?)` (`components/Collections/common/useCollectionCreation.ts:7-25`) uses `historyId?.() || currentHistoryId || "current"`. The current history is only the fallback.
- On `dev`, the selection path always passes the panel's history: `history.id` goes into the store, then into `ListWizard`, then into both the builders and the rules payload. Building from a non-current history's view page (`/histories/view?id=…`, center-panel `HistoryView.vue:39`) therefore creates the collection in *that* history. The Build Dataset List modal does the same with `:history-id="history.id"`.
- This is [#24399](https://github.com/galaxyproject/galaxy/pull/24399) ("[26.1] Fix collections from libraries and Build List landing in the current history"), merged to `release_26.1` and already on `dev` (merge `546ed25c466` is an ancestor of this SHA). Before it, the store held only items and the wizard built into the current history.
- The breadcrumb (`ListWizard.vue:51-57`) snapshots `historyId.value` at setup and isn't reactive. That's harmless only because a fresh store push remounts the wizard through `__vkey__`.

## Pending: #24487, reset on create

*Proposed for `dev`; merged to `release_25.1` only (merge `23509306`, 2026-10-30). Not yet merged forward at this SHA.* The merged design differs from the branch's first iteration, which cleared the selection when the wizard opened. The merged version:

- `collectionBuilderItemsStore.ts`: adds a counter `collectionsCreated` and `markCollectionCreated()`.
- `ListWizard.vue`: `onCreate()` calls `store.markCollectionCreated()` after a successful POST.
- `SelectionOperations.vue`: `storeToRefs(store).collectionsCreated` is watched and calls a restored `createdCollection()`, which emits `update:show-selection` `false`. The same method is the `@created-collection` handler for the Build Dataset List modal, so both build paths now leave selection mode on success.
- While the wizard is open, the selection is kept. Cancelling or abandoning it leaves the history selection intact.
- Tests: Jest `SelectionOperations.test.js` "Collection Building" (store hand-off with no emit; counter bump -> `[[false]]`; modal `created-collection` -> `[[false]]`). Selenium `_assert_selection_cleared` in `test_build_list_simple_hidden` and `test_build_paired_list_auto_matched`, plus `test_build_list_open_keeps_selection`.

Caveats when merging forward:

- The 25.1 store has no `historyId`, so the change must be combined with #24399's `setSelectedItems(historyId, items)` signature.
- The counter is global. *Every* mounted `SelectionOperations` that has a selection will exit selection mode when any wizard creates a collection, not only the one that started it. In practice that means the left panel plus at most one center `HistoryView`.

## Selenium helpers and selectors

`lib/galaxy/selenium/navigates_galaxy.py`:

| Helper | Lines | What it does |
|---|---|---|
| `history_panel_wait_for_and_select(hids)` | `:848-859` | Waits for each hid to reach `ok`, clicks "Select Items", then clicks each row's `.selector`. |
| `history_panel_multi_operations_show()` | `:2990-2991` | Clicks `multi_operations.show_button` (`.show-history-content-selectors-btn`). |
| `history_panel_muli_operation_select_hid(hid, history_id=None)` | `:2993-2996` | Looks up the row id through the API (`history_panel_item_selector`, `:3124-3135`) and clicks `#<type>-<id> .selector`. Pass `history_id` for a non-current history. |
| `history_panel_build_list_auto(scope=".history-index")` | `:3182-3183` | `use_bootstrap_dropdown(option="auto build list", menu="selected content menu", scope=…)`. Pass the center panel's selector as `scope` for a viewed history (see `test_build_list_in_viewed_history`). |
| `history_panel_build_list_advanced()` | `:3185-3186` | The same for `advanced build list`. There's no `scope` parameter, so it only works on the left panel. |
| `history_panel_build_list_advanced_and_select_builder(builder)` | `:3203-3208` | Advanced, then clicks `list_wizard.which_builder(builder=…)`, then Next. |
| `history_panel_build_list_of_pairs` / `_of_paired_or_unpaireds` / `_of_lists` | `:3188-3201` | Wrappers that also pass through the auto-pairing step where relevant. |
| `history_panel_build_rule_builder_for_selection()` | `:3210-3214` | Advanced -> `which_builder_rules` -> Next. |
| `history_panel_delete_selected(purge=False)` | `:3010-…` | Selection menu delete or purge. |
| `collection_builder_create()` | `:3247-3253` | Clicks `list_wizard.create` if present, otherwise `modals.create`. One helper covers both paths. |

`client/src/utils/navigation/navigation.yml`:

- `history_panel.multi_operations.selectors` (`:337-341`): `show_button` is live. `action_button` (`.history-contents-list-action-menu-btn`), `action_menu` and the `labels` block (`build_pair`, `build_list`, `build_list_pairs`, `build_from_rules`, `:343-347`) match nothing in `client/src`. Neither does `history_panel_multi_operation_action_click` (`navigates_galaxy.py:2998-3008`), and nothing references them. They're leftovers from the pre-dropdown history UI. Filed as `research_issues/history-multi-operations-dead-selenium-selectors.md`.
- `collection_builders.list_wizard` (`:596-612`): `create`, `which_builder`, `which_builder_rules`, `wizard_next_button`, `auto_pairing`, `created_alert`, `cell` and `cell_input`. `collection_builders.modals.create` is `button.create-collection`.
- **There is no history-panel `selection_count` selector on `dev`.** The only `selection_count` is `tool_bar.selection_count` (`.selection-options > span`, `:1212`), which belongs to the *workflow editor's* freehand selection toolbar. It sat at `:867` on `release_25.1`, and one branch record mistook it for a history-panel selector. To assert history selection state, use the dropdown's `data-test-id` spans (`num-active-selected`, `all-filter-selected`), the menu itself (`[data-description="selected content menu"]`), or the row `.selector`s. #24487 adds `multi_operations.selected_content_menu` and `item_selector` for this.

Tests: `lib/galaxy_test/selenium/test_collection_builders.py` covers auto/advanced/paired/list-of-lists/rules builds and `test_build_list_in_viewed_history` (the #24399 regression: the collection lands in the viewed history, and the new current history stays empty). At this SHA no test there checks selection state after a build. `test_collection_edit.py:103` and `test_workflow_run.py:510-511` also drive the Selection menu.

Unit tests: `components/History/CurrentHistory/HistoryOperations/SelectionOperations.test.js` checks menu gating (`:224-243` for the build options) and that operations emit `update:show-selection` `false` (`:245-258`, `:338-348`). On `dev` it has no test for the build-path events.

## Gotchas

- Don't use `reset-selection` from `SelectionOperations` to leave selection mode. Emit `update:show-selection` `false` and let the composable's watcher clear the selection. Nothing listens for `reset-selection` from that component anyway (see dead listeners above).
- "Build Dataset List" builds from the filter, not the selection. The two match only because the entry appears only when everything in the query is selected.
- `CollectionCreatorIndex` emits `created-collection` up to twice per creation.
- A selection made in a center-panel `HistoryView` is lost the moment the wizard route replaces the center panel. Only the store copy survives.
- `listWizard()` copies item *summaries*. The wizard doesn't re-fetch state, so items that change between selection and build appear as they were when selected.

## Related

- [[PR 19377 - Collection Types and Wizard UI]]: introduced `ListWizard.vue` and the Auto/Advanced Build List entries.
- [[Component - E2E Tests - Writing]]: `NavigatesGalaxy`, `navigation.yml` and `use_bootstrap_dropdown` conventions.
- [[Component - Collection API]] and [[Component - Collection Creation API]]: what the create POST does server-side.
- [[Component - Auto Pairing]]: the pairing that drives Auto mode's builder inference.
