# galaxy#24801 — test challenge debrief (round 0)

Profile `gx_test_challenger` · model Claude Fable 5.2 · effort medium · reviewed commit `5bdf34ea9ad057d551ec1812c7745e8267097c45`

Review mode (REVIEW_DIRECTORY): nothing in the PR was edited; every drop, rewrite or implement below is a recommendation.

The specs were read, not run: the worktree's `client/` has no `node_modules`, and bootstrapping it was out of scope. Claims about what a test proves come from reading the spec against the component and `client/packages/ui/src/components/Form/GFormInput.vue`.

## What the PR tests

Seven components swap `BFormInput` for `GFormInput`. Five new Vitest specs and two extended ones, 29 lines of test per swapped input on average. No Selenium or Playwright change.

| Spec | Tests | Verdict |
| --- | --- | --- |
| `Collections/common/PairingFilterInputGroup.test.ts` (new) | 4 | Keep 3; trim the "renders … in GFormInput fields" test |
| `Collections/sheet/SampleSheetGrid.test.ts` (+1) | 1 | Keep the name-reaches-fetch-target assertion; drop the class and `required` lines |
| `Common/FilterMenuInput.test.ts` (new) | 6 | Keep 4; drop the render test's class lines and the datalist/disabled test |
| `Common/FilterMenuRanged.test.ts` (new) | 5 | Keep 4; trim the render test |
| `ConfigTemplates/VaultSecret.test.ts` (+1) | 1 | Drop |
| `User/APIKey/APIKeyItem.test.ts` (new) | 2 | Drop the first; move the second to Selenium |
| `User/Credentials/CredentialsGroupForm.test.ts` (new) | 5 | Keep 4; trim the render test; type the fixture |

## Challenges

### Tests of the implementation

Every spec has a test named after the component it renders ("renders both filters in GFormInput fields", "masks the stored secret in a disabled password GFormInput", "shows the key in a disabled password GFormInput", …) that asserts the `g-form-input` class, and often `g-small`, `mw-100`, or `tagName === "INPUT"`. These assert which base component the template uses and which props it passes. They say nothing about behavior, and they have to be rewritten on the next base-component change, the way a `form-control` assertion would have had to be rewritten here.

- `PairingFilterInputGroup.test.ts` "renders both filters in GFormInput fields": drop the class block; the remaining initial-value check is already implied by "shows the new filters when the parent updates the props". Drop the test or fold the initial values into that one.
- `SampleSheetGrid.test.ts`: drop the `classes()` and `required` lines; the typed name reaching the fetch target is the test.
- `FilterMenuInput.test.ts` "renders the filter value in a small GFormInput": drop the class line; keep placeholder and value, renamed.
- `FilterMenuInput.test.ts` "links the field to its datalist and disables it": two attributes passed straight through. Drop.
- `FilterMenuRanged.test.ts` "renders both bounds in small GFormInput fields": drop the class loop; keep placeholders and value, renamed.
- `VaultSecret.test.ts` "masks the stored secret in a disabled password GFormInput": class, `type`, `disabled` and a hard-coded constant value. All four are template literals. Drop the test, and with it the `mount` import.
- `APIKeyItem.test.ts` "shows the key in a disabled password GFormInput": tag, class, `type`, `disabled`, and the value. The value is what `TestManageInformation.test_api_key` already asserts in Selenium. Drop.
- `CredentialsGroupForm.test.ts` "renders the group name, variable and secret in GFormInput fields": class loop plus `required`, `type`, `autocomplete`. Keep only the variable's value, or drop, since the next test types into the same field.

### Tests that earn their place

These cover what a base-component swap can actually break: `v-model` wiring and undeclared listeners falling through under `@vue/compat` (`COMPONENT_V_MODEL: false`, `INSTANCE_LISTENERS: false` in `GFormInput`).

- Typing emits `on-update` / `change` with the right name and value (pairing group, both filter menus).
- Parent prop updates reach the field (same three).
- `keyup.enter` and `keyup.esc` reach `on-enter` / `on-esc` (both filter menus). `GFormInput` declares only `keydown` and `blur`, so these depend on listener fall-through. Good tests.
- `aria-invalid` on an invalid regular expression, a filter error, and only the erroring bound of a range.
- Credentials: trimmed group name written to the payload, the required-name message, the secret placeholder cleared on focus and restored on blur (`@focus` is another fall-through listener), and the empty required secret marked invalid after blur.

### Covered by Selenium already, or better covered there

- **API key.** `lib/galaxy_test/selenium/test_personal_information.py::test_api_key` already reads the input by `data-test-id="api-key-input"` and compares its value to the key. Its second half hovers the input and re-reads `value`, which never changes; reveal is a button now, so that step asserts nothing. The Vitest "reveals and hides the key with the show/hide button" test is the right assertion at the wrong layer: add a selector for the show/hide button to `navigation.yml`, click it in `test_api_key`, and assert the input's `type` goes `password` → `text`. Then `APIKeyItem.test.ts` and its two module mocks can go. (The `./model/service` mock is unused by either test regardless; only the delete path calls it.)
- **Advanced filter text input.** `test_histories_list.py::test_advanced_search`, `test_histories_published.py`, `test_workflow_management.py::test_index_advanced_search` and `test_curated_workflows.py` type into `#…-advanced-filter-name` and assert the filtered list, so typing and the id are covered end to end. Nothing in Selenium presses Enter or Escape in these fields; the Vitest keyboard test is the only guard, and is cheap. Keep.

### Missing E2E coverage

The PR description's own manual test plan lists six flows. The swap changes a field's box model, its behavior inside `BInputGroup` / `BFormGroup`, and how validation feedback becomes visible; none of that is observable in jsdom. Two gaps are worth closing:

- **Range filter.** `FilterMenuRanged` has no E2E coverage on any list (history panel `hid` and `create_time`, histories list `update_time`). It is also the input with the most rewiring here: `v-model` became `:model-value` plus an `@update:model-value` handler with a text conversion. A Selenium test in the history panel advanced filter — set "greater than index" and "lower than index", press Enter, assert the visible hids — covers the range input, the Enter key and the rendered ids in one test.
- **Credentials group-name error.** The PR adds `:state` to the `BFormGroup` because the "Group name is required" message no longer shows by itself (Bootstrap reveals `.invalid-feedback` through a sibling `.is-invalid` field, which `GFormInput` isn't). The Vitest test asserts the `d-block` class as a stand-in for "visible". That is the right fix checked through a proxy; whether a user sees the message is a CSS question. There is no Selenium coverage of the service credentials form at all, so this is a larger ask than the range filter: a test needs a tool declaring credentials. Worth it if such a test tool exists or is cheap; otherwise the Vitest proxy is acceptable and should stay.

Not worth an E2E test: the pairing filter fields (auto-pairing is covered through `list_wizard.auto_pairing`, and the fields' logic is in `pairing.ts`), the sample sheet name (the Vitest test checks the name in the fetch target; the pasted-table flow in `test_workflow_run.py` could set a name and assert it if someone is already in there), and the vault secret mask (a static disabled field).

### Mocks and fixtures

- `CredentialsGroupForm.test.ts` builds `SERVICE_DEFINITION` with `as unknown as ServiceCredentialsDefinition`. `client/src/composables/userMultiToolCredentials.test.ts` already has a typed `serviceDefinition(name, optional)` factory; share it (a `test-utils.ts` beside the credentials code) or at least build the object typed, so a schema change breaks the fixture at compile time.
- `mountInput(props: Record<string, unknown>)` and `mountRanged(...)` drop the components' prop types; `Partial<…>` of the real props keeps them.
- `mount(X as object, …)` in three specs follows the existing `VaultSecret.test.ts` pattern; fine.
- No mock could be replaced by restructuring the components; the two `vi.mock` calls in `APIKeyItem.test.ts` go away with the spec.

### Best practices (`client/README.md`, `doc/source/dev/writing_tests.md`)

Specs sit beside their components, use `getLocalVue()`, and select by id, placeholder or `data-test-id` rather than structure. `wrapper.get("[title='Show/hide key']")` selects by tooltip text; a `data-description` would serve both this and the Selenium selector proposed above.

### Untested behavior the diff introduces

Both filter menus now convert the filters value to text (`String(value)`, `undefined` → `null`) because the filters dict also types values as boolean. No test passes a non-string value; every fixture uses strings. One case per component with a boolean or numeric filters value would cover the only new logic in the PR. Low priority: `BFormInput` stringified the same way.

## Test plan

1. Drop the implementation and attribute assertions listed above (two whole tests, `VaultSecret` and `FilterMenuInput` datalist/disabled; the rest are line removals and renames).
2. Add a Selenium test for the history panel range filter with Enter to apply.
3. Move the API key reveal check into `test_api_key`, replacing the dead hover step; delete `APIKeyItem.test.ts`.
4. Type the credentials fixture.
5. Optional: a non-string filters value in each filter menu spec; a Selenium check of the credentials group-name message if a credentials test tool is available.

## Bugs noticed

None. Not hunted for; another reviewer covers that.
