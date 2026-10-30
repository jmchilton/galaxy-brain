# HistoryPanel listens for SelectionOperations events that are never emitted

- Area: client / history panel selection
- Found while: [[Component - History Panel Selection and Collection Builders]]
- Galaxy SHA: 65e6daff
- Severity: low

## Problem

`HistoryPanel.vue` wires two listeners on `HistorySelectionOperations` that the component never fires:

- `client/src/components/History/CurrentHistory/HistoryPanel.vue:490`: `@hide-selection="onHideSelection"`
- `client/src/components/History/CurrentHistory/HistoryPanel.vue:491`: `@reset-selection="resetSelection"`

`SelectionOperations.vue` declares no `emits`, and none of its methods emit `hide-selection` or `reset-selection`. Commit `08410e96e57` ("Remove individual collection builders from history dropdown", Jan 2025) deleted both emits, together with `buildCollectionFromRules()` and `createdCollection()`. `onHideSelection` (`HistoryPanel.vue:303-307`), which optimistically hid source items after a rules build, is unreachable.

The same commit left `@created-collection="createdCollection"` (`SelectionOperations.vue:163`) bound to a method that no longer exists. That is the half of #24469 that covers the Build Dataset List modal. [#24487](https://github.com/galaxyproject/galaxy/pull/24487) restores `createdCollection()` on `release_25.1`, but at this SHA it hasn't merged forward to `dev`.

## Evidence / repro

`grep -n "emit" client/src/components/History/CurrentHistory/HistoryOperations/SelectionOperations.vue` shows only `update:show-selection`, `update:operation-running` and `operation-error`. `git show 08410e96e57 -- .../SelectionOperations.vue` shows the removed `this.$emit("hide-selection", …)` and `this.$emit("reset-selection")`.

## Suggested fix

Drop the two dead listeners and `onHideSelection` from `HistoryPanel.vue`, or add an `emits` declaration to `SelectionOperations.vue` so that dead bindings show up. Leaving selection mode should keep going through `update:show-selection` `false`, because `useSelectedItems` clears the selection when that flag drops.

## Related

- [[Component - History Panel Selection and Collection Builders]]
- galaxyproject/galaxy#24469, #24487
