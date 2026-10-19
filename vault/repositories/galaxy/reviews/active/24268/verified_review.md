### P2 1: Let GRadioGroup / GCheckboxGroup own FormDrilldown's selection (implementation verified)

`FormDrilldownOption` treats each GRadio as a boolean (`:model-value="isChecked"`, `:value="true"`) and needs a comment to explain that GCheckbox and GRadio emit different things. To share one radio name, the PR threads a new `name` prop through `FormDrilldown` → `FormDrilldownList` → `FormDrilldownOption` → recursive `FormDrilldownList`, next to the existing untyped `handleClick: Function` prop. `FormDrilldown.handleClick` + `setElementValues` reimplement adding to and removing from an array, which `GCheckboxGroup.toggle` already does. GRadio and GCheckbox `inject` their group context at any depth. The group already supplies the unique name, the checked state (`looseEqual`) and `select`/`toggle`.

The single-select tree also isn't a real `role="radiogroup"`. It's a set of loose radios that share a name, with no accessible group name.

Wrap `FormDrilldownList` in `<component :is="multiple ? GCheckboxGroup : GRadioGroup" stacked>`, bind `currentValue` (or `currentValue[0]`), and map an empty array to `null` on update. Each option then becomes `<component :is="..." :value="option.value">`.

This removes the `name` prop at three levels, the `useUid` name, `handleClick` and its `Function` prop at every level, `setElementValues`, the `:value="true"` trick and its comment. Pass `FormElement`'s title id as `aria-labelledby` so the new radiogroup has a name, the way `FormSelection` already gets it. The select-all checkbox stays outside the group.

<details><summary>Evidence</summary>

The refactor passes the PR's FormDrilldown tests unchanged (shared name, separate groups for two same-id drilldowns, select-all, multi add/remove ordering, `null` when empty). A new test checks the named `role="radiogroup"`: it fails on the PR's code and passes on the refactor. `vue-tsc --noEmit` is clean.

</details>

<details><summary>Details</summary>

`:is` needs a computed typed `Component` (as `FormDrilldownOption` already does for the option). An inline `multiple ? GCheckboxGroup : GRadioGroup` fails `vue-tsc`, because the two generic `modelValue` types intersect. The tree is unchanged inside the group: `.g-stacked` makes the options a column, and the list is a single block inside it. `DirectoryDatasetPicker`'s `:deep(.g-checkbox-group-options)` targets a different element (`.directory-dataset-picker-options`), so it doesn't reach the drilldown's new group.

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P2 2: The single-select (radio) drilldown has no E2E coverage

The radio path changed the most here. Selection moves to `@update:model-value`, and every radio now shares one name. Yet `test_drilldown_tool` and the harness entry `("drill_down", 2)` only use `drill_down.xml`, whose params are all `multiple="true"`. Only unit tests cover the radio path.

Add `("gx_drill_down_exact", 1)` to `DEFAULT_TOOL_TESTS` in `lib/galaxy_test/selenium/test_tool_form_harness.py`. That case selects the nested option `ab`. It reuses `_set_drilldown_value` with no new code: the option's name equals its value, the input id is `drilldown-option-ab`, and the harness JS-clicks it, which works while it sits in a collapsed `v-show` branch.

The line is on the review branch but hasn't been run. Running it needs a bootstrapped Galaxy server, which wasn't available in the review worktree.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via claude-opus-5-5 at medium effort.

</details>

### P2 3: The CopyModal and HistoryImport tests check component internals instead of what the user does (implementation verified)

`CopyModal.test.ts` asserts the child GRadioGroup's `props(...)`, and picks "all datasets" with `vm.$emit("update:modelValue", true)` instead of selecting a radio. `HistoryImport.test.js` compares the legend to `wrapper.vm.howLabel` and reads `wrapper.vm.importType`. Those tests would still pass if the template binding broke.

Merge the two CopyModal cases into one mounted test. It should assert the legend text and both option labels from the DOM, check that the first radio starts checked, select the "all datasets" radio, confirm, and assert `copyHistory(..., true)`. In HistoryImport, assert the literal legend text and that the file input shows up after picking "upload".

<details><summary>Evidence</summary>

The rewritten tests pass (CopyModal 9/9, HistoryImport 6/6).

</details>

<details><summary>Details</summary>

The merged CopyModal case no longer asserts `stacked: true`, which is a layout prop. Everything else the old props check covered (label, initial value, the two options) is now asserted through the DOM.

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P3 1: Group descriptions and legend spacing are patched per caller instead of supported by the group (description part implementation verified)

`InstallationSettings.vue` replaces `BFormGroup description="Choose a tool configuration."` with a wrapper `div.mb-3`, a hand-placed `<small id="repository-tool-config-description">` and a matching hard-coded `aria-describedby`. The rest of the PR uses generated ids. The "Dependencies" BFormGroup just below still uses `description`, so the next BFormCheckbox migration under #23812 would write the same markup again.

Separately, `CopyModal` is the only caller of the new `legendClass` prop. It passes `legend-class="pb-0"` to cancel the group legend's 7px bottom padding so the legend lines up with the `GFormLabel` title above it. So the two base label paths disagree on spacing, and a new prop on two components papers over that for one screen.

Give `GRadioGroup` and `GCheckboxGroup` a `description` prop. It renders under the options and is linked through `aria-describedby` to an id derived from the group's existing uid. `InstallationSettings` then becomes one `<GRadioGroup label=... description=...>`.

For `legendClass`, either make the legend's spacing match `GFormLabel` or accept the 7px in CopyModal and drop the prop. That prop belongs to #24260, so the review branch leaves it alone.

<details><summary>Evidence</summary>

The `description` part is implemented, with new GRadioGroup and GCheckboxGroup cases (rendered, linked, absent by default). Those suites pass (25/25, 16/16), and the PR's InstallationSettings test, which looks up the description through `aria-describedby`, passes unchanged. `legendClass` is not changed.

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) and [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P3 2: LabelSelector reaches into GRadioGroup's private markup with `:deep(.g-radio-group-options)` (implementation verified)

`LabelSelector.vue` adds a scoped `:deep(.g-radio-group-options) { row-gap }` to get back the spacing that `class="my-2"` gave each BFormRadio. `.g-radio-group-options` is an internal class of `@galaxyproject/galaxy-ui`. GRadio forwards `class` to its root label, so `<GRadio class="my-1">` gets the same 0.5rem between rows through the public surface, and the `<style>` block can go.

<details><summary>Evidence</summary>

LabelSelector tests pass (4/4).

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P3 3: MarkdownEditor's group name repeats its first option (implementation verified)

The group is named `aria-label="Editor"`, and its options are "Editor" and "Text". A screen reader announces "Editor, radio group; Editor, radio button, 1 of 2". "Editor mode" (for both `aria-label` and the tooltip `title`) reads better.

<details><summary>Evidence</summary>

No Selenium selector uses the old title. The MarkdownEditor test was updated to the new name and passes (3/3).

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P3 4: Drop the styling-class assertions (implementation verified)

`MarkdownEditor.test.ts` asserts the `d-inline-block`, `g-outline`, `g-blue` and `g-small` classes, and the loop in `FilterMenu.test.ts` asserts `g-radio-button` on every radio. These break on any visual retune without catching a behaviour regression. Keep the label, checked-state and editor-swap assertions. The later `.g-radio-button` locators in FilterMenu still exercise button mode.

The review branch removes these assertions: four styling-class checks from MarkdownEditor (`d-inline-block`, `g-outline`, `g-blue`, `g-small`) and one from FilterMenu (`g-radio-button`). No behavioural assertion is removed.

<details><summary>Evidence</summary>

Both files pass (3/3 each).

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P3 5: The ThemeSelector test leaks shared state, and the InstallationSettings test checks the label twice (implementation verified)

`ThemeSelector.test.ts` shares module-level `currentTheme`, `settingTheme` and `setCurrentTheme` across cases and never resets them. `settingTheme.value = false` runs after the assertion, so one failure leaks into the later cases. Reset them in a `beforeEach` with `vi.clearAllMocks()`.

The new InstallationSettings case checks the legend text both through the `aria-labelledby` lookup and through `legend.text()`. Keep the `aria-labelledby` check.

<details><summary>Evidence</summary>

ThemeSelector passes 3/3 and InstallationSettings 9/9. The nested-fieldset check (`parentElement.closest("fieldset")`) is kept, because it guards against reintroducing the BFormGroup wrapper.

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>
