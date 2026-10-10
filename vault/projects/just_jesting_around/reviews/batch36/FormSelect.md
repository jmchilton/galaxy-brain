# FormSelect

Selected originator: `client/src/components/Form/Elements/FormSelect.test.js`. Baseline **6 tests** → final **9 tests**.

The four long FormSelect cases are now seven, grouped as single select and multi-select. `basics` became "lists the options in order" and "selects the first option when a required select has no value". The second checks the auto-emitted `value_1`, that nothing is marked until the parent passes it back, and then `label_1`. `optional values` became two cases. One shows "Nothing selected" listed first and selected. The other selects `value_1` and clears it by picking "Nothing selected" (emits `null`, back to "Nothing selected"). In `multiple values`, the four-option listing without "Nothing selected" is its own case. The deselect walk (`["", 99]` → `[99]` → `null` → reselect `["value_1"]`) keeps its explicit emission indexes. The two accessible-name cases are unchanged, apart from the mount helper and a renamed options local.

Helpers stay local. `mountFormSelection(props)` (was `createTarget` over an import aliased `MountTarget`) defaults the shared options. The redundant `findComponent(MountTarget)`, which was the wrapper itself, is gone. `listedLabels`, `selectedLabels` and `clickOption(wrapper, label)` each open the dropdown first. The walk used to click option wrappers captured by position before several `setProps` re-renders; it now finds each option by label and awaits the click. The vue-multiselect open/close note moved onto `openMultiselect`.

Preserved and strengthened: every emitted value and selected label is still asserted. Option-count checks became full label lists. The optional case had checked a count of 5 and the first label; it now checks all five in order. The required multi-select had checked one selected option; it now checks that option is `label_1`. New check: an optional single select emits no `input` on mount (the counterpart of the required auto-select).

Reuse: `emittedArg` and the shared filter mock. `FormData/FormData.test.ts` has an identical `openMultiselect`, but a later lane owns that file. The listing/selection helpers could be shared with it then.

Validation: 9 tests pass shuffled (seed `360101`, `NODE_OPTIONS=--no-webstorage`). ESLint (`--max-warnings 0`), Prettier and full `vue-tsc --noEmit` (exit 0) pass.

Guidance: none.
