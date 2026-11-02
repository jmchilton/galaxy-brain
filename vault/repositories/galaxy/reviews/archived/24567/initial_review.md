# Initial review: PR #24567

- Profile: default (with shared.md and REVIEW_FOCUS.md)
- Model: Claude Opus 5.5 (claude-opus-5-5), effort low (as set by the coordinator)
- Reviewed commit: `19e40ed7800` (base `dev`)

## Summary

The PR is small and clean. It replaces the three dependency `BFormCheckbox`es in
`InstallationSettings.vue` with `GCheckbox`, adds a test, and drops the
`update:modelValue` no-op hunks from `client/patches/bootstrap-vue@2.23.1.patch`
for `form-radio-check`, `form-select` and `form-tags`. The `pnpm-lock.yaml`
patch hash is updated to match.

What I checked:

- No `BFormCheckbox`, `BFormCheckboxGroup`, `BFormRadio`, `BFormRadioGroup`,
  `BFormSelect`, `BFormTags`, or their kebab-case or plugin forms remain in
  `client/src` or elsewhere in the repo. The only hits are comments and test
  names in `client/packages/ui` (for example, the `vGTooltip.ts` comment that
  mentions `BFormCheckbox`). The PR doesn't touch those, so they're out of scope.
- The bootstrap-vue components still in use (`BFormDatepicker` in
  `FilterMenuInput.vue` and `FilterMenuRanged.vue`, `BFormInput`, `BFormGroup`,
  `BCard`, and others) don't render the radio/check mixin, `BFormSelect` or
  `BFormTags` internally. The PR description's claim holds.
- The existing Selenium flow (`test_admin_app.py`) uses only the modal OK button
  selector, which is unchanged.
- The flex-column wrapper matches the existing pattern in `ExportIncludeOptions.vue`,
  `PageEmbed.vue` and `SharingPage.vue`.
- The new unit test checks label-to-checkbox mapping, the initial checked state
  from config, and that unchecking one box changes only that field in the emitted
  request. That is real behavioral coverage, not a trivial test. I did not run it
  because the worktree has no `node_modules`.

## Findings

### P3 1: Nothing stops the now-unpatched components from coming back

The PR description says that bringing back `BFormCheckbox`, `BFormRadio`,
`BFormSelect` or `BFormTags` "would need its hunk again, so new code should use
the `G*` components". Nothing enforces that. If someone re-imports one of these
components, it renders, but compat's `v-model` directive has no
`update:modelValue` assigner, so the bug the patch hunks fixed comes back at
runtime. Unit tests won't necessarily catch it, and neither will review.
`eslint.config.mjs` already uses `vue/no-restricted-syntax` to guard a similar
footgun (`v-no-sanitize-html`).

Suggested fix: add a `no-restricted-imports` rule (`paths: [{ name: "bootstrap-vue",
importNames: ["BFormCheckbox", "BFormCheckboxGroup", "BFormRadio", "BFormRadioGroup",
"BFormSelect", "BFormTags"], message: "Unpatched under Vue 3 compat; use the G* components." }]`)
to `client/eslint.config.mjs`. That turns the description's caveat into a lint
error. The group components belong in the list because they render the patched
children.

## Not raised

- `BFormGroup` wrapping the checkbox column is unchanged pre-existing markup.
- Draft #24300's conflict on `InstallationSettings.test.js` is already noted in
  the PR description.
