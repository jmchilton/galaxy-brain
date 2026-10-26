Building a collection from a history selection leaves the history panel in selection mode, with a stale "2 of 1 selected" count.

1. Select two datasets in the history panel.
2. From the selection dropdown, choose **Auto Build List** (or **Advanced Build List**) and click **Build**.
3. The new list appears, but the panel stays in selection mode. The source datasets are hidden (`default-hide-source-items`) yet still selected, and the new collection is unticked, so the status reads **"2 of 1 selected"**.

The only ways out are clicking the selection toggle (top-left checkmark) or reloading the page. Any follow-up bulk operation from that state acts on the hidden originals, not the collection the user just built. Seen on `release_26.2`; present since v25.0.0.

## Context

Regression from 08410e96e57 ("Remove individual collection builders from history dropdown", v25.0.0). That commit deleted `SelectionOperations.vue`'s `createdCollection` method, which emitted `reset-selection`, but kept the `@created-collection="createdCollection"` binding on `CollectionCreatorIndex`. The handler is undefined on `dev` and `release_26.2`, so the event does nothing. `HistoryPanel.vue` still binds `@reset-selection="resetSelection"` on `SelectionOperations`, so only the child side is missing. Found while hardening the GTN FAQs `collections_autobuild_list`, `collections_build_list` and `collections_build_list_paired` with Playwright. Their "click the checkmark icon at the top of your history again" step works around this bug.

<details><summary>Code</summary>

`client/src/components/History/CurrentHistory/HistoryOperations/SelectionOperations.vue` (`dev`, ~L153):

```vue
<CollectionCreatorIndex
    ...
    hide-on-create
    default-hide-source-items
    @created-collection="createdCollection" />
```

No `createdCollection` exists in `methods`. Removed in 08410e96e57:

```js
createdCollection(collection) {
    this.$emit("reset-selection");
},
```

</details>

## Proposed Approach

Restore a `createdCollection` method in `SelectionOperations.vue` that emits `reset-selection` and `update:show-selection` `false`, the same exit that `onStorageOperationCompleted` and `runOnSelection` already use. `CollectionCreatorIndex` emits `created-collection` twice (on create, then when the collection is ready); resetting twice is harmless, though the second could clear a selection the user started in between. Add a vitest that `SelectionOperations` emits both on `created-collection`. Add a Selenium check in `test_collection_builders.py`, which builds lists from selections but never checks the selection afterwards: after Build, the panel has left selection mode.

## Alternative Approaches

Resetting from inside `CollectionCreatorIndex` would couple a shared creator, also used by `FormDataWorkflowRunTabs.vue`, to history-selection state it doesn't own. Restoring the parent handler keeps the reset with the component that owns the selection.

<details><summary>Alternatives In Detail</summary>

### Alternative: reset in `CollectionCreatorIndex`'s `hideOnCreate` path

<details><summary>Description</summary>

#### Details

Drop the binding and have the creator clear the history selection itself when `hide-on-create` is set.

#### Why the proposed approach is preferred

The creator has other consumers with no history selection, and the selection lives in the history panel. The one-method fix restores the pre-25.0 behaviour.

</details>

</details>
