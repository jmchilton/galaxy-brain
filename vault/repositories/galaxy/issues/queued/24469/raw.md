# Building a collection from a history selection leaves selection mode on with a stale count

Source: playwright FAQ hardening loop (`vault/projects/playwright/`, faqs `collections_autobuild_list`,
`collections_build_list`, `collections_build_list_paired`), on `release_26.2`. Regression since v25.0.0.

## Problem

`client/src/components/History/CurrentHistory/HistoryOperations/SelectionOperations.vue` (~164 on
`release_26.2`) binds `@created-collection="createdCollection"` on `CollectionCreatorIndex`, but there is
no `createdCollection` method. 08410e96e57 ("Remove individual collection builders from history
dropdown", 2025-01-06) deleted it:

```js
createdCollection(collection) {
    this.$emit("reset-selection");
},
```

and left the binding, so the event goes nowhere (v25.0.0 through 26.2).

Seen live with both **Auto Build List** and **Advanced Build List**: after Build the history panel stays
in selection mode. With `default-hide-source-items` the selected originals are hidden, so the status
reads "**2 of 1 selected**": two hidden items are still selected and the new collection is unticked.
Only clicking the selection toggle (top-left checkmark) or reloading the page clears it.

## Proposal

Restore the handler (emit `reset-selection` and probably `update:show-selection` false, to match the
pre-25.0 behaviour), or drop the binding and reset in `CollectionCreatorIndex`'s `hideOnCreate` path.
Small client PR; check any other `@created-collection` consumers.

## Tests

Selenium: select two datasets, Auto Build List, Build. Assert the panel leaves selection mode (no item
selectors, no selection status). `test_collection_builders.py` builds lists but never checks the
selection afterwards. A vitest on `SelectionOperations` emitting `reset-selection` on
`created-collection` would also catch it.

GTN: the FAQs' "click the checkmark icon at the top of your history again" step is still needed until
this is fixed. A fix would make it obsolete only on new releases.
