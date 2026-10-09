# galaxy#24006 - Bring GCheckbox to BFormCheckbox parity and add GCheckboxGroup

- PR: https://github.com/galaxyproject/galaxy/pull/24006 (author itisAliRH), part of #23812
- Reviewed head: `4c75dddee45795dda04ed243fa94c3983d8d3268` (merge-base with origin/dev `919f4f28403`)
- Size: +707/-63, 7 files, 6 commits. No call sites switched; it restyles the workflow run form switches and GTable select boxes.
- CI: pending at review time. Local vitest not run: worktree has no `client/node_modules`, skipped per instructions.
- Verdict: **approve with suggestions (comment)**. The code is solid. The group really does reuse GCheckbox through provide/inject, a11y got better, and the tests mount real components. The gap is the claim that follow-up swaps "can stay mechanical". Several BFormCheckbox behaviors are gone or now mean something else, and some of those fail silently.

## What it does

- GCheckbox: `inheritAttrs: false`. `class`/`style`/`title`/`on*` go to the root `<label>`, everything else goes to the `<input>`. New props `size` (ComponentSize), `name`, `value`, `required`. Switch mode is now the input itself with `appearance: none` and `role="switch"`, plus a `:focus-visible` outline and a forced-colors fallback. Inside a group it reads/writes group state through `checkboxGroupKey`.
- GCheckboxGroup: a `<fieldset>`/`<legend>` holding `options` and/or slotted GCheckbox children. Array v-model in click order. `looseEqual` copies BV's loose matching. Props: `name` (auto uid), `size`, `disabled`, `switches`, `stacked`.
- `checkboxGroupContext.ts` adds the injection key, the `CheckboxGroupOption` type (exported from the package index) and `looseEqual`.

## Findings

### 1. The migration surface is not mechanical, and some failures are silent (main point)

The PR body says the swap PRs "can stay mechanical". Callers in `client/src` today depend on the Vue 2 BFormCheckbox model surface, and GCheckbox handles each piece differently:

- **`@change` payload.** BFormCheckbox emits the checked *value* on `change`. GCheckbox emits the native `Event`. A one-for-one tag swap passes an `Event` (always truthy) where a boolean was expected. Concrete callers:
  - `client/src/components/Libraries/LibraryFolder/TopToolbar/FolderTopBar.vue:407`: `@change="$emit('update:includeDeleted', $event)"`
  - `client/src/components/Common/ExportIncludeOptions.vue:50,59,68`: `emit('update:include-*', $event)`
  - `client/src/components/Form/Elements/FormDrilldown/FormDrilldownOption.vue:82`: `handleClick(option.value, $event)`
  - `client/src/components/Panels/Upload/shared/UploadTableOptionsCell.vue:45`: `updateOption(option.key, $event)`
  - `client/src/components/Form/Elements/FormCheck.vue:58`: `onSelectAll(selected: boolean)`
  vue-tsc will catch the typed handlers. It won't catch the inline `$emit(..., $event)` forms. 27 BFormCheckbox tags use `@change` today.
- **`:checked` (23 tags) and `@input` (4).** `:checked` falls into `$attrs`, lands on the input, and is then overridden by the component's own `:checked="isChecked"`, so it is silently ignored. `@input` now binds as a native listener on the label and receives an `Event`, not a boolean.
- **`value` means something else.** On BFormCheckbox, `value`/`unchecked-value` are the values v-model emits, and an array v-model without a group adds or removes `value`. On GCheckbox, `value` is only the HTML attribute, and the standalone v-model is always boolean. Concrete caller: `client/src/components/admin/JobsList.vue:140-144` (`v-model="selectedStopJobIds"` + `:value="data.item['id']"`, one checkbox per table cell). That can't be wrapped in a group, so it needs a computed boolean per row. Nothing uses `unchecked-value` today. Good.
- Renames: `switch` -> `toggle` (14 tags), `size="lg"` -> `"large"` (JobsList.vue:26, JobLock.vue:32, ConfigureFetchWorkbook.vue:35).
- Selectors on BV markup (`.custom-control-label` in `navigation.yml`, e.g. `remote_files_select_all`, and `FormCheck.test.js`) change too.

Ask: keeping a native-Event `change` is defensible for a Vue 3 library. But the mapping should be written down where swap authors will see it: a short "migrating from BFormCheckbox" block in the GCheckbox docblock or #23812. A note on the `value` prop saying it does not change what v-model emits would also help. Otherwise reword the "mechanical" claim.

### 2. `switches` on the group vs `toggle` on the checkbox

The group takes BV's name (`switches`) but the child keeps `toggle`. BV is `switch`/`switches`. This library's pair now mixes both families, and switching ~14 BFormCheckbox `switch` tags will lock in whichever name wins. It's cheap to pick one now (e.g. `toggle` on the group, or keep `switches` and add `switch` on GCheckbox while `toggle` has only 5 callers in `WorkflowRunFormSimple.vue`).

### 3. `options` prop and exported `CheckboxGroupOption` have no caller

Both `BFormCheckboxGroup` sites (`FormCheck.vue:61`, `DirectoryDatasetPicker.vue:293`) use slotted children. `options` (with `text`, while FormCheck's own option type uses `label`) and the exported `CheckboxGroupOption` are new public API with no consumer. Consider dropping them until a caller needs them, or keep them and accept the extra surface. Related typing point: `modelValue: unknown[]` / `value: unknown` lose all type checking. GTable already uses `<script setup generic="T">`, and `generic="T"` on the group would type `modelValue`/`options[].value` for callers at no runtime cost.

### 4. Reuse for the next group component

#23812 lists `BFormRadioGroup` (8 files) next. `looseEqual` and the fieldset/legend + provide/inject group shape will be needed there too. Moving `looseEqual` into `packages/ui/src/utils/` (with a few direct tests: number vs string, object key order, `null`/`undefined`) would make it shared instead of checkbox-specific. Note that the `JSON.stringify` comparison depends on key order, unlike BV's `looseEqual`. That's fine for current callers (strings).

### 5. Tests and docs (minor)

- The tests are meaningful: real mounts, the attribute split, tooltip title, click order, immutability, loose matching, legend/aria naming. Good.
- Gaps: the attribute split is the part most likely to behave differently between compat and plain Vue 3. Neither `vModelContract.test.ts` nor the Tool Shed's plain-Vue `galaxyUi.test.ts` covers GCheckbox/GCheckboxGroup. Neither the Tool Shed `ComponentsShowcase.vue` (the de facto story page) nor `publicClasses.test.ts` gets the group or switch. One plain-Vue-3 test of the attr split plus the group's v-model would close the real gap.
- The "inside a group" GCheckbox tests build a fake context. Most duplicate the real-group tests in `GCheckboxGroup.test.ts`. Only "own name and size win" is unique, and it could mount the real group too.
- The GCheckbox docblock says the child "takes the group's name, size, disabled and switch mode unless it sets its own". That only holds for `name`/`size`. Boolean `disabled`/`toggle` can't opt out (same as BV, so behavior is fine; the docblock just needs fixing).

### Not issues (checked)

- `rootAttrs()`/`inputAttrs()` as functions rather than computeds is correct: `useAttrs()` is not reactive. Tests cover late and changed attrs.
- Explicit `:checked`/`:role`/`:name` after `v-bind` win over caller attrs. That's intended, except for the `:checked` silent drop noted above.
- Switch a11y: `role="switch"` on `type="checkbox"` is valid. Space toggles natively. The new off-state styling is closer to Bootstrap's `custom-switch`, so it looks more consistent with the remaining BV switches, not less.
- Selenium: `send-to-new-history-label` and the `.g-checkbox` GTable selectors still match.
- Security: nothing found.

## Risks

GCheckbox/GCheckboxGroup's prop and emit names (`toggle` vs `switches`, `value`, `change` payload, `options` shape, `size` names) become the target ~50 BFormCheckbox files migrate onto, so naming or semantic mismatches are cheap to fix now and expensive after the swaps.

<details><summary>Risk Details</summary>

- `change` emits a native `Event` while BFormCheckbox emits the checked value. Mechanical swaps of inline `$emit(..., $event)` handlers compile and misbehave silently.
- `:checked` and `@input` from Vue 2 BFormCheckbox usage are silently ignored or change payload type.
- `value` keeps BV's name but not its meaning (it doesn't change what v-model emits, and standalone checkboxes have no array mode). JobsList's per-row checkbox needs restructuring.
- Mixed naming (`switches` on group, `toggle` on checkbox) gets locked in by the switch-heavy swaps.
- `options`/`CheckboxGroupOption` is exported public API with no caller.
- Visual change to the workflow run form switches and GTable focus ring (screenshots in PR; small, arguably an improvement).
- Attr split under plain Vue 3 (Tool Shed) isn't covered by a test.

</details>

<details><summary>Risk Review Advice</summary>

Focus on the public surface rather than the implementation. Decide now on the switch prop name and on whether `change` should carry the native Event, and make sure the BFormCheckbox -> GCheckbox mapping is written down before the swap PRs start. The silent failures (`:checked`, `$event` payload) won't show up in type checks or in most unit tests.

The rendering changes are two-way and the screenshots cover them. Toggling the workflow run form switches with mouse and keyboard, as in the manual test plan, is enough.

</details>

## Draft review body

> Posted by Claude (an AI assistant) on behalf of jmchilton.

Thanks, this is a nice step. The group really reuses `GCheckbox` through provide/inject instead of re-rendering its own inputs, the switch a11y (`role="switch"`, `:focus-visible`, forced-colors fallback, off-state contrast) is a real improvement, and the specs mount the real components. A few things worth settling before the swap PRs build on this API:

**1. The swaps won't be fully mechanical, and some breakages are silent.** Some current `BFormCheckbox` usage doesn't carry over one-for-one:

- `@change` on `BFormCheckbox` gets the checked value. `GCheckbox` passes the native `Event`. Inline forwards like `FolderTopBar.vue:407` (`$emit('update:includeDeleted', $event)`) and `ExportIncludeOptions.vue:50/59/68` would compile and quietly emit an `Event`. Typed handlers (`FormDrilldownOption.vue:82`, `UploadTableOptionsCell.vue:45`, `FormCheck.vue` `onSelectAll`) need to move to `@update:model-value` too.
- `:checked` (23 tags) is overridden by the component's own `:checked` and silently ignored. `@input` becomes a native listener with an `Event`.
- `value` keeps the BV name but not the meaning: on `BFormCheckbox` it (with `unchecked-value`) is what v-model emits, and with an array v-model it adds or removes itself. `admin/JobsList.vue:140-144` relies on that per table row.
- Renames: `switch` -> `toggle`, `size="lg"` -> `"large"`.

A native-Event `change` is reasonable for a Vue 3 library. Could the `GCheckbox` docblock (or #23812) carry a short "from BFormCheckbox" mapping, and the `value` prop doc say it doesn't change what v-model emits? Otherwise the "stay mechanical" note in the description oversells it.

**2. `switches` vs `toggle`.** The group uses BV's `switches`, the checkbox keeps `toggle`. With ~14 `switch` tags about to migrate, it'd be good to settle on one family now, while `toggle` has only the five run-form callers.

**3. `options` / `CheckboxGroupOption` has no caller yet.** Both `BFormCheckboxGroup` sites (`FormCheck.vue`, `DirectoryDatasetPicker.vue`) use slotted children. Fine to keep, but it's exported public API. If it stays, a `generic="T"` on the group (as `GTable` does) would type `modelValue` and option values instead of `unknown[]`.

**4. Reuse for radios.** `BFormRadioGroup` is next on #23812 and will want `looseEqual` and the same fieldset/legend/provide shape. Moving `looseEqual` into `utils/` with a few direct cases (number vs string, object key order) would set that up. Its `JSON.stringify` path depends on key order, unlike BV's.

**5. Small things.**
- No plain-Vue-3 coverage of the attribute split or the group's v-model (Tool Shed `galaxyUi.test.ts` / `vModelContract.test.ts`), and the group isn't in the Tool Shed `ComponentsShowcase.vue`. The split is the part most likely to behave differently without compat.
- Most of the "inside a group" `GCheckbox` specs use a hand-built context and repeat what `GCheckboxGroup.test.ts` already covers with the real group.
- The docblock's "unless it sets its own" holds for `name`/`size` but not `disabled`/`toggle` (same as BV, so just the wording).

