# Test challenges review — PR #24269

Profile: [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md). Model: claude-opus-5-5, medium effort. Reviewed commit `bb9621184d6f58668bc485d127a2c06528c7d57b`.

Detail: [test_challenges_debrief.md](test_challenges_debrief.md).

New GButton `pressed` tests are behavioural, mock-free, and each earns its place; nothing to drop or rewrite. Ran `GButton.test.ts`, `tokensContract.test.ts`, `CellAdd.test.js` under node 22.20.0: 40/40 pass. Token-contract regex widening is legitimate, not a weakening. CSS changes (focus ring, group stacking, grey-250) are not meaningfully unit-testable; screenshots are the right evidence.

### P3 1: Consumer `aria-pressed` override is promised but untested

The PR description says an explicit consumer `aria-pressed` still wins. That depends only on `:aria-pressed` preceding `v-bind="{ ...anchorAttributes, ...$attrs }"` in `GButton.vue`'s template; reordering silently breaks it. Add one case to the `GButton.vue pressed` block: `mountGButton({ pressed: true, "aria-pressed": "mixed" })` expects `"mixed"`.

### P3 2: `CellAdd.vue` `?? false` fix has no test

`CellAdd.test.js` already mounts real `GButton` and `Popper`. Extend "opens the popper when clicking the button" to assert the button's `aria-pressed` is `"false"` before the click (red without `?? false`) and `"true"` after.

### P3 3: Strengthen existing Selenium test to cover the real toggle announcement

`test_editor_place_comments` (`lib/galaxy_test/selenium/test_workflow_editor.py`) already clicks `editor.tool_bar.toggle_bold` and `toggle_italic`, which are `v-model:pressed` GButtons. Assert `aria-pressed` is `"false"` before and `"true"` after each click: end-to-end proof of the PR's headline a11y claim with no new test or selectors.
