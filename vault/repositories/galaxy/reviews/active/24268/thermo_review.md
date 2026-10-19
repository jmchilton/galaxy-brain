# Thermo review: galaxyproject/galaxy#24268

- Profile: thermo_review (thermo-nuclear code quality, reuse/refactoring focus)
- Model: claude-opus-5-5, medium effort
- Reviewed commit: a6772eccffe8b68e47c0f757d582c782f7fc2805 (merge-base 7c86d742327)
- Scope: the ten consumer commits `c15826c2866..a6772eccffe`. The 13 commits up to `cfbc540e642` belong to #24260 (still open) and are only touched where this PR depends on them (`legendClass`).

## Overall

A mechanical migration, mostly clean. Every group gets an accessible name, unused bootstrap imports are gone, no file grows past 1k lines, and the new tests check behavior instead of markup. The one structural miss is FormDrilldown. The migration copies BFormRadio's "radio as a boolean" pattern across, along with a hand-threaded `name` prop. GRadioGroup/GCheckboxGroup already provide-inject the state, name, and toggling logic that the drilldown reimplements. The other findings are small boundary leaks where a caller patches over a gap in the new base components instead of the components gaining the affordance.

## P2 1: FormDrilldown should let GRadioGroup / GCheckboxGroup own selection instead of drilling `name` and faking radios as booleans

`FormDrilldownOption.vue` renders `<component :is="multiple ? GCheckbox : GRadio">` with `:model-value="isChecked"`, `:value="true"`, `:name="multiple ? undefined : name"`, and `@update:model-value="handleClick(option.value, $event)"`. It needs a comment to explain that the two components emit different things ("GCheckbox emits its checked state, GRadio its value (true)"). To give the radios a shared name, the PR adds `useUid` in `FormDrilldown.vue` and threads a new `name` prop through `FormDrilldownList` → `FormDrilldownOption` → recursive `FormDrilldownList`. Meanwhile `FormDrilldown.handleClick` + `setElementValues` reimplement add/remove-from-array, which `GCheckboxGroup.toggle` already does.

GRadio and GCheckbox both `inject` their group context (`radioGroupKey`, `checkboxGroupKey`) at any depth. The group supplies the unique name (`useUid`), `isChecked` via `looseEqual`, and `select`/`toggle`. So:

```vue
<!-- FormDrilldown.vue -->
<component
    :is="multiple ? GCheckboxGroup : GRadioGroup"
    stacked
    :model-value="multiple ? currentValue : currentValue[0]"
    @update:model-value="onInput">
    <FormDrilldownList :show-icons="showIcons" :multiple="multiple" :current-value="currentValue" :options="options" />
</component>

<!-- FormDrilldownOption.vue -->
<component :is="multiple ? GCheckbox : GRadio" :id="..." class="drilldown-option" :disabled="option.disabled" :value="option.value">
```

where `onInput` maps an empty array to `null`. This deletes the `name` prop at three levels, the `radioName` uid, `handleClick` (an untyped `Function` prop drilled through every level), `setElementValues`, the `:value="true"` trick, and the explanatory comment. The tree also gets real `role="radiogroup"` / fieldset semantics instead of loose same-named radios. Keep the select-all checkbox outside the group as it is now. `currentValue` is still needed for `toggleInitialization`. The PR's new FormDrilldown tests (shared name, separate groups for two same-id drilldowns, select-all) already cover what this refactor must preserve.

Side note, not a finding: option ids are still `drilldown-option-${option.name}`. They collide across two drilldowns with the same options (the PR's own two-instance test mounts that case), and they break CSS id selectors on dotted names, which is why the Selenium selector moved to `data-test-id`. If the group owns the uid, the ids could derive from it too.

## P3 1: FilterMenuBoolean adds a third local-state idiom beside its siblings

The fix is real: `FilterMenu` mutates the non-reactive `filters` computed object, so a controlled GRadioGroup would snap back. BFormRadioGroup hid this with its internal `localChecked`. But the new shape is a `filterValue()` function, a `selected` ref, a `computed` get/set wrapping that ref, and a `watch` on the whole `props.filters` object. `FilterMenuInput`, `FilterMenuDropdown`, and `FilterMenuRanged` all solve the same problem one way: `propValue = computed(() => props.filters[name])`, `localValue = ref(propValue.value)`, and two watches. Use that pattern (watch the specific value, not the object) so the five filter widgets read alike. The `?? "any"` default would live in one place. The deeper code-judo move is making `FilterMenu`'s staged filters a reactive ref reset from `filterText`, which would delete the local mirroring in every sibling. That is pre-existing code, so it fits a follow-up, not this PR.

## P3 2: LabelSelector reaches into GRadioGroup's private markup with `:deep(.g-radio-group-options)`

`LabelSelector.vue` adds a scoped `:deep(.g-radio-group-options) { row-gap }` to get back the spacing that `class="my-2"` gave each BFormRadio. `.g-radio-group-options` is an internal class of the `@galaxyproject/galaxy-ui` package. This is the second consumer doing this: `DirectoryDatasetPicker.vue` already deep-styles `.g-checkbox-group-options`. Since GRadio forwards `class` to its root label, `<GRadio class="my-1" ...>` (or similar) keeps the styling on the public surface and deletes the `<style>` block. If several callers keep needing a different row gap, that belongs in a group prop, not in deep selectors.

## P3 3: InstallationSettings hand-rolls BFormGroup's `description`; GRadioGroup / GCheckboxGroup should own it

The tool-config group swaps `BFormGroup description="Choose a tool configuration."` for a wrapper `div.mb-3`, a hand-written `<small id="repository-tool-config-description">`, and a hardcoded `aria-describedby`. Elsewhere this PR uses `useUid` for generated ids. The "Dependencies" `BFormGroup` right below still uses `description`. So the next BFormCheckbox/BFormRadio migration under #23812 will write the same markup again. `GFormLabel` already has a `description` prop. Give `GRadioGroup` and `GCheckboxGroup` a matching `description` prop (rendered under the options, wired to `aria-describedby` through the existing `uid`). The caller then becomes one tag with `label` + `description`.

## P3 4: `legendClass="pb-0"` is a one-caller escape hatch over inconsistent label spacing

CopyModal is the only user of the new `legendClass` prop (added in #24260 for this PR). It uses it to undo the legend's 7px bottom padding so the group lines up with the `GFormLabel` title above it. That padding exists to match BFormGroup labels. So the two base label paths, `GFormLabel` and the group legend, disagree on spacing, and the prop papers over the disagreement for one screen while adding API surface to two components. Better: make the legend spacing match `GFormLabel`, or accept the 7px in CopyModal, and drop `legendClass`. This is mostly #24260's call, but this PR is the only reason the prop exists.

## Not flagged

- HistoryImport / Toolshed Index / ThemeSelector / MarkdownEditor / RDMDestinationSelector: direct swaps; `class="mb-3"` replacing BFormGroup's margin is fine.
- New tests (ThemeSelector, Toolshed Index, FormDrilldown, FilterMenu) check behavior and a11y names, not trivial rendering.
- The `admin.toolshed.installed_only` text XPath is better than the old structural XPath. A `data-description` would be sturdier, but `:options` doesn't support per-option attributes.
