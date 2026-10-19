# PR #24268 initial review (default profile)

- Profile: default (+ shared, REVIEW_FOCUS)
- Model: claude-opus-5-5, medium effort
- Reviewed commit: a6772eccffe8b68e47c0f757d582c782f7fc2805 (merge-base 7c86d742327)

## Scope

The branch carries the 13 commits of #24260 (GRadio sizing, legend padding, `legendClass`, `--color-grey-250`, focus ring; head `cfbc540e642`) followed by this PR's own 10 commits (`c15826c2866..a6772eccffe`). This review focuses on the 10 migration commits; #24260's styling changes are only touched where the migration depends on them (`legendClass`).

## Summary

Clean, well-scoped migration. `grep` confirms no `BFormRadio`/`BFormRadioGroup` left in `client/src`. Every group now has an accessible name, the call sites use the existing `GRadio`/`GRadioGroup`/`GCheckbox` wrappers and `useUid`, and each migrated component gained behavioural tests (checked state, emitted value, name sharing, disabled) rather than snapshot or markup tests. The Selenium selector updates line up with the new markup: GRadio/GCheckbox put `class` on the root `<label>` and derive `data-test-id="<id>-label"`, so `.drilldown-option`, `.select-all-checkbox` and `select_import_dir_item` still hit a clickable element. The new `installed_only` XPath matches `label > input` with the label text normalised.

The changed vitest files (11 files, 55 tests) pass locally under node 22.20.0. I didn't run Selenium.

No P1 or P2 findings.

## Findings

### P3 1: Drilldown radios sharing one name can make the tree unreachable by Tab when the selected option is collapsed

`FormDrilldown` now hands one `useUid` name to every single-select radio in the tree (`FormDrilldownOption.vue`), so the browser treats the whole tree as one radio group. Children are hidden with `v-show` (`display: none`). Browsers let Tab land only on a group's checked radio, or on the first radio when none is checked. Chromium's `RadioInputType::IsKeyboardFocusable` returns `Checked() || !CheckedRadioButtonForGroup()`. So if a user collapses the branch that holds the selected option, no visible radio is tabbable, and keyboard users reach the tree only through the caret buttons. On mount, `toggleInitialization` expands the branch that holds the current value, so this only happens after a manual collapse. Before this PR, each `BFormRadio` had no name and was its own tab stop. This is an edge case I reasoned from the spec and Chromium's code, not something I reproduced in a browser.

Suggested fix: accept it and mention it in the PR, or block collapsing a branch that holds the selected value (or re-expand it). A full roving-tabindex tree is out of scope.

### P3 2: MarkdownEditor's group name repeats its first option

`MarkdownEditor.vue` names the group `aria-label="Editor"`, and its options are "Editor" and "Text". A screen reader announces "Editor, radio group; Editor, radio button, 1 of 2". A name like "Editor mode" or "Editing mode" would be clearer. The tooltip `title="Editor"` comes from the old code and could change with it.

### P3 3: Group labels and descriptions are hand-rolled per caller instead of supported by the group

Two call sites work around missing group features:

- `InstallationSettings.vue` replaces `BFormGroup description="Choose a tool configuration."` with a wrapper `<div class="mb-3">`, a hand-placed `<small id="repository-tool-config-description" class="d-block mt-1 text-muted">` and a matching `aria-describedby`. The id is hard-coded, while the rest of the PR uses `useUid`. In practice the modal is single-instance.
- `CopyModal.vue` is the only consumer of the new `legendClass` prop, from #24260. It uses `legend-class="pb-0"` to cancel the new 7px legend padding so the legend matches the `GFormLabel` title above it. That means `GFormLabel` and `GRadioGroup`'s legend now space their labels differently by default, and callers patch over the difference.

Both are small, but they are the BFormGroup label and description pattern being rebuilt per caller. Consider a `description` prop or slot on `GRadioGroup`/`GCheckboxGroup` that wires `aria-describedby` itself, the way `GFormLabel` has `description`. Also consider whether `GFormLabel` and the group legend should share one label-to-control spacing, so `legendClass` isn't needed for parity. This could be a follow-up rather than a blocker.

## Notes (not actionable here)

- The PR description says the library import-directory selector "broke on dotted names such as `1.axt`". The old selector `[for="drilldown-option-${name}"]` is a quoted attribute selector and copes with dots. It broke because GCheckbox wraps its input in a `<label>` with no `for` attribute. The sibling `tool_form.parameter_drilldown_option` (`#drilldown-option-${value}`, an id selector) *would* break on dotted names, but it predates this PR and isn't touched.
- `FilterMenuBoolean` now keeps local `selected` state, because `GRadioGroup` is fully controlled and `FilterMenu` stages changes in a non-reactive computed object. This matches what `FilterMenuInput` and `FilterMenuDropdown` already do with `localValue`. It watches `props.filters` by identity rather than the derived prop value. That is equivalent, because the object only changes identity when `filterText` changes. The updated `FilterMenu.test.ts` assertions on `.g-checked` cover the staged-display behaviour.
- `check_advanced_search_filter` (`navigates_galaxy.py`) clicks the first `input` under `[data-description='filter X']`. For radio-mode filters that is still the "Any" radio, as before, and its callers use checkbox-mode filters. No change.
- Tests: the new tests are behavioural and not trivial. A few (`MarkdownEditor.test.ts` checking the `g-outline`/`g-blue`/`g-small` classes, `CopyModal.test.ts` checking GRadioGroup props) lean on component internals but stay cheap. Nothing was weakened. The `FilterMenu.test.ts` changes replace BootstrapVue `.btn-secondary.active` selectors with their G equivalents and add accessible-name assertions.
- `RDMDestinationSelector` and `ThemeSelector` swap `v-localize` for `localize()` in the slot text, which is consistent. `HistoryImport` radio texts are still unlocalized, as before.
