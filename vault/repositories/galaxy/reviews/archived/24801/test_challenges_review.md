# galaxy#24801 — test challenges review (round 0)

- Profile: `gx_test_challenger`
- Model: Claude Fable 5.2
- Effort: medium
- Reviewed commit: `5bdf34ea9ad057d551ec1812c7745e8267097c45`

Detail and the full per-test verdicts are in [test_challenges_debrief.md](test_challenges_debrief.md).

The specs were read, not run: the worktree's `client/` has no `node_modules`.

## Summary

The behavioral half of the new tests is good and aimed at what this swap can break: `v-model` wiring, parent updates, and listeners that `GFormInput` doesn't declare (`keyup.enter`, `keyup.esc`, `focus`) falling through under `@vue/compat`. The other half asserts which component the template renders. The one input whose wiring changed most, the range filter, has no E2E coverage on any list.

The PR description's claim that the Selenium selectors are unaffected holds: `data-test-id="api-key-input"` and the `#…-advanced-filter-name` ids are unchanged, and both stay on the `<input>` element itself.

No P1 findings.

## P2 1 — Tests assert the rendered component and pass-through attributes

Each of the seven specs has a test named for the component it renders ("renders both filters in GFormInput fields", "masks the stored secret in a disabled password GFormInput", …) asserting the `g-form-input` class, and in places `g-small`, `mw-100`, `tagName === "INPUT"`, `required`, `type`, `autocomplete`, `list` or `disabled`. They restate the template. They would pass with every behavior broken, and they all need rewriting at the next base-component change.

Suggested fix: drop these assertions and keep the behavior beside them.

- Drop whole tests: `VaultSecret.test.ts` "masks the stored secret…" (four template literals; the `mount` import goes too), `FilterMenuInput.test.ts` "links the field to its datalist and disables it", `APIKeyItem.test.ts` "shows the key in a disabled password GFormInput" (its value check duplicates Selenium `test_api_key`).
- Remove the class and attribute lines, and rename: the "renders …" tests in `PairingFilterInputGroup`, `FilterMenuInput`, `FilterMenuRanged` and `CredentialsGroupForm`, and the `classes()` / `required` lines in the `SampleSheetGrid` test. What stays is initial value and placeholder; in the pairing and credentials specs the neighbouring tests already cover the value, so those two can go entirely.

## P2 2 — The range filter has no E2E test

`FilterMenuRanged` is the most rewired input in the PR: `v-model` became `:model-value` with an `@update:model-value` handler and a text conversion, on both bounds. No Selenium test touches a range filter on any list (history panel `hid` and `create_time`, histories list `update_time`), and none presses Enter in an advanced filter field. The description's manual step 1 is exactly this flow.

Suggested fix: one Selenium test on the history panel advanced filter. Fill "greater than index" and "lower than index", press Enter, and assert the visible hids. It needs selectors for `#…-advanced-filter-hid_gt` / `hid_lt` in `navigation.yml`. That covers the range input, Enter-to-apply and the ids in a real browser.

## P3 1 — Move the API key reveal check to Selenium and drop `APIKeyItem.test.ts`

`test_personal_information.py::test_api_key` already asserts the input's value by `data-test-id="api-key-input"`. Its second half hovers the input and re-reads `value`, which is the same either way since reveal became a button, so that step asserts nothing. The new Vitest "reveals and hides the key with the show/hide button" test checks the right thing at the wrong layer, behind two module mocks, one of which (`./model/service`) neither test uses.

Suggested fix: give the show/hide button a `data-description`, add it to `navigation.yml`, and in `test_api_key` replace the hover with a click and assert the input's `type` goes `password` → `text`. Delete `APIKeyItem.test.ts`.

## P3 2 — Type the credentials fixture

`CredentialsGroupForm.test.ts` builds `SERVICE_DEFINITION` with `as unknown as ServiceCredentialsDefinition`, so a schema change won't break it at compile time. `client/src/composables/userMultiToolCredentials.test.ts` already has a typed `serviceDefinition(name, optional)` factory.

Suggested fix: share that factory or build the object typed. In the same pass, `mountInput` and `mountRanged` can take `Partial<>` of the component props instead of `Record<string, unknown>`.

## P3 3 — The new value-to-text conversion is untested (optional)

The only new logic in the PR is the conversion in both filter menus (`String(value)`, `undefined` → `null`), added because the filters dict also types values as boolean. Every fixture passes strings.

Suggested fix: one case per filter menu spec with a boolean or numeric filters value. Optional: `BFormInput` stringified the same way, so this guards the new code and not a behavior change.

## P3 4 — The group-name error's visibility is checked through a class (optional)

The PR adds `:state` to the `BFormGroup` so the group-name message still shows, and the test asserts `d-block` on `.invalid-feedback` as a stand-in for "visible". Whether the user sees it is a CSS question jsdom can't answer, and the service credentials form has no Selenium coverage at all.

Suggested fix: if a test tool declaring credentials exists or is cheap to add, a Selenium test that types a two-character group name and waits for the message to be visible. Otherwise keep the Vitest proxy as is.

## Notes

- Keep as written: the `on-update` / `change` emission tests, the parent-update tests, the keyboard tests, the `aria-invalid` tests, and the credentials payload, placeholder focus/blur and required-secret tests.
- Existing Selenium coverage of the swapped inputs: API key value (`test_personal_information.py`), advanced filter name typing (`test_histories_list.py`, `test_histories_published.py`, `test_workflow_management.py`, `test_curated_workflows.py`). None for the pairing filter fields, the sample sheet name, the vault secret mask or the credentials form; of those only the credentials form is worth considering (P3 4).
- No bugs noticed; not hunted for.
