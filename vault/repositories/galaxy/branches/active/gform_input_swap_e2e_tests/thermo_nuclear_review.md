Run via Claude Fable 5.2 at medium effort.

# Thermo-nuclear review debrief

READY. The review had one structural finding, on the branch's only client refactor, and it was acted on: `useFilterText` is gone, replaced by narrower prop typing (`4480a300200`). Nothing else in the diff met the bar for a change.

Acted on:

- **`useFilterText` shared a conversion that should not exist.** `FilterMenu.vue` sends Boolean filters to `FilterMenuBoolean`, and every range filter is a `Number` or `Date`, so `FilterMenuInput` and `FilterMenuRanged` only ever hold text. Their `filters` prop was typed `string | boolean | undefined` all the same, and that type is the only reason #24801 had to convert the value for `GFormInput`, and this branch had to add a composable to share the conversion. `4480a300200` types the prop and the `change` payload as `string | undefined`, binds the inputs to the local refs with plain `v-model` as they were before the swap, and deletes `filterMenuText.ts`. 9 lines added, 34 removed; neither component has a wrapper around its value any more.

Not acted on:

- **`FilterMenu.vue` does not enforce the narrower type.** Its `filterClass` is `Filtering<any>`, so the `filters` it passes down are `any`-valued and the routing in its template is what keeps booleans out. Typing `Filtering` properly is a much larger change than this branch is about. The prop's doc comment names the routing it relies on.
- **`FilterMenuBoolean` and `FilterMenuDropdown` keep their own local value types.** Untouched by the branch, and theirs do hold booleans.
- **`type Props = InstanceType<typeof X>["$props"]` appears in both filter menu specs.** One line each; a shared helper would be more indirection than it saves.
- **`_show_history_of_datasets` next to `_select_two_of_three_datasets`.** The second creates tabular content and selects two items, so it is not the same setup.
- **Credentials selectors and the `.invalid-feedback` suffix.** Already weighed in the polish step; nothing new.
- **No new Vitest tests.** The existing `FilterMenuInput`, `FilterMenuRanged` and `FilterMenu` specs cover the rebound inputs (typing emits, parent updates show, keyboard events).

## Tests run

All on `4480a300200`.

| Test | Backend | Result |
| --- | --- | --- |
| `vue-tsc --noEmit` | | clean |
| Vitest: `FilterMenuInput`, `FilterMenuRanged`, `FilterMenu` specs | node 22.20.0 | 3 files, 13 tests passed |
| `eslint`, `prettier --check` on the two components | | clean |
| `test_history_panel.py::TestHistoryPanel::test_advanced_filter_index_range` (range inputs) | Playwright | passed |
| same | Selenium (Chrome 158 under Xvfb) | passed |
| `test_histories_list.py::TestSavedHistories::test_advanced_search` (text input) | Playwright | passed |
| same | Selenium | passed |

Not run: the other Vitest specs and E2E tests on the branch, and the Python linters; this step changed no Python and no other component. Servers (8091/5181) were stopped at the end.

## Details

The review covered all 18 files of `git diff origin/dev...HEAD` at `f4b60719013`, plus `FilterMenu.vue`, `FilterMenuBoolean.vue`, `FilterMenuDropdown.vue`, `utils/filtering.ts` and `packages/ui`'s `GFormInput.vue`.

1. **Unnecessary abstraction over an unclear type boundary — `client/src/components/Common/filterMenuText.ts`.** Fixed.
   - `useFilterText` wrapped each local ref in a writable computed that stringified booleans on read and mapped `null` to `undefined` on write.
   - The read branch is unreachable: `FilterMenu.vue` routes `type == Boolean` to `FilterMenuBoolean` in every view, the final `FilterMenuInput` branch is guarded by `type !== Boolean`, and the only `isRangeInput` filters in the client are `Number` and `Date`. Parsed filter text yields strings, and default filters are booleans.
   - The write branch is unreachable too: `GFormInput` emits what a native `<input>` `v-model` gives it, which is always a string. `string | null` in its emit type is the only source of `null`, and `vue-tsc` accepts `v-model` on a `string | undefined` ref, as the other `GFormInput` consumers on `dev` already do with `ref("")`.
   - So the composable centralized a fallback that papered over a wrong prop type. Narrowing the type deletes the helper and its file; the test-challenges step's open question ("should the conversion exist at all") is answered no.
   - Behavior is unchanged: an unset filter shows an empty field either way, and typing emits the same strings.
2. **Everything else.** No file approaches 1000 lines because of the branch, no branching was added to shared flows, and the Selenium changes add a helper and selectors without new conditionals. The Vitest edits only remove assertions and casts. No further findings.
