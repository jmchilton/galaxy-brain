# Initial review — galaxy#24801

- Profile: `default`
- Model: Claude Fable 5.2
- Effort: medium
- Reviewed commit: `5bdf34ea9ad057d551ec1812c7745e8267097c45` (`git diff origin/dev...HEAD`, 14 files under `client/src/components/`, +381/-32)

## Summary

The PR swaps `BFormInput` for `GFormInput` in seven components and adds or extends a Vitest spec for each. I found no P1 or P2 issues. The swaps keep the behavior they replace, and the two places where `GFormInput` differs from `BFormInput` in a way that matters are both handled:

- `CredentialsGroupForm.vue` passes `:state` to the `BFormGroup` as well. `GFormInput` carries no `.is-invalid` class, so Bootstrap's sibling selector no longer reveals `.invalid-feedback`; the group state does it instead, and a test covers it.
- `VaultSecret.vue` and `APIKeyItem.vue` bind `model-value` in place of `value`.

Two optional P3s follow, both about shape rather than correctness.

## What I checked

- **Listener and attribute fallthrough.** `GFormInput` sets `INSTANCE_LISTENERS: false` and declares only `update:modelValue`, `keydown` and `blur`, so `@keyup.enter`, `@keyup.esc`, `@focus`, `@click`, `id`, `list`, `placeholder`, `disabled`, `required`, `autocomplete`, `data-test-id` and the `v-g-tooltip` directive all land on the root `<input>`. The new specs exercise the key handlers, `list`, and the directive.
- **Emitted values.** A cleared field emits `""` from both components, so `FilterMenuInput` and `FilterMenuRanged` still emit `change` with `""`, not `undefined`. The `?? undefined` branches only run for a `null` the native input never produces.
- **Input-group sizing.** `SampleSheetGrid` keeps `size="small"` inside `BInputGroup size="sm"`. The scoped `.g-small` rule wins over the group rule, and the two font sizes are 0.75rem and 0.744rem, so the field still matches its prepend. `PairingFilterInputGroup` relies on the `lg` group rule, as `GFormInput`'s own CSS intends.
- **Group name trimming.** The `groupName` setter trims, so the model can lag the DOM by trailing whitespace. `GFormInput` re-renders only when a prop changes, so a typed trailing space is not wiped mid-edit, as before.
- **Selenium selectors.** `navigation.yml` reaches these inputs by id (`#history-list-filter-advanced-filter-name`, `#workflows-advanced-filter-name`, and so on) and by `[data-test-id="api-key-input"]`. All survive, and `test_personal_information.py` reads `value` from the API key input, which is still an `<input>`.
- **CI.** All 22 checks pass on the reviewed commit. The worktree has no `node_modules`, so I did not run the new specs or `vue-tsc` locally.

## Findings

### P3 1 — The filter text conversion is written two ways in sibling components

`FilterMenuInput.vue` adapts its value with a writable computed (`inputValue`), while `FilterMenuRanged.vue` uses an `asText()` function plus two inline `@update:model-value="… = $event ?? undefined"` handlers. Both carry the same comment and do the same job: present a `string | boolean | undefined` filter value as text and write text back. Each file also declares its own copy of `FilterType`.

The conversion exists only for typing. `FilterMenu.vue` routes `Boolean` filters to `FilterMenuBoolean` and guards `FilterMenuInput` with `type !== Boolean`, so neither component receives a boolean. The `undefined → null` half of the getter is also unneeded, since `modelValue` is optional and accepts `undefined`.

Suggested fix (optional): use one shape for both. Either give `FilterMenuRanged` the same writable-computed pattern (one per bound), or move the conversion to a small shared helper beside `FilterType` and use it from both files. Narrowing the type these two components accept would remove the conversion altogether, but touches `FilterMenu.vue` and is more than this PR needs.

### P3 2 — Several new assertions only check that a prop or attribute reaches the input

Each new spec opens with a test titled "renders … in GFormInput fields" that asserts the `g-form-input` and `g-small` classes and pass-through attributes (`placeholder`, `required`, `autocomplete`, `type`, `disabled`, `list`). These check `GFormInput`'s own rendering and Vue's attribute fallthrough, not the component under test, and they will need editing whenever the base component's class names change. The same style is in the specs merged with #24686 and #24718, so this is consistent with the series; I raise it as optional.

The behavioral tests in the same files are worth keeping: the `change`/`on-update` emits, parent-to-input resync, Enter/Escape, the per-bound error state, the group-name feedback, and the secret placeholder focus/blur handling. `FilterMenu.test.ts` already types into these inputs through a mounted `FilterMenu`, so the typed-value cases partly overlap it.

Suggested fix (optional): drop the class and attribute pass-through assertions, keeping the value and behavior checks. Where a test needs to show the field is invalid, `aria-invalid` (already used) is enough.

## Notes (not findings)

- `ref="filterMenuInput"` in `FilterMenuInput.vue` is not read anywhere. It predates this PR.
- `getFieldState()` in `CredentialsGroupForm.vue` checks `touchedFields.value.secrets` for variables as well as secrets. It predates this PR and the PR does not touch it.
- `getGroupNameState()` returns `true` for a valid name, so the `BFormGroup` now gets `is-valid` too. No valid feedback is declared, so nothing new shows.
