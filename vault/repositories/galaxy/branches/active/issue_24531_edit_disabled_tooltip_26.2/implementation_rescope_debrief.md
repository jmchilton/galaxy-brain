# Re-scope debrief

The scope evaluation recommended Scope B: also fix GCard's primary/secondary actions, whose callers pass disabled-reason titles ("Log in to run workflow", "…Restore it first.", the favorite-tools login hint), and the rule builder's Finish button. I followed it.

- **Alt:** the original scope is kept as `issue_24531_edit_disabled_tooltip_26.2_alt_original_scope` (1d935c72d14); see [alts/original_scope.md](alts/original_scope.md).
- **0d7b3961ae7:** GCard actions use the `tooltip` prop. Rule builder Reset/Finish use GButton tooltips directly, and `TooltipOnHover.vue` (no other users) is deleted. `JobInformation.test.js` now selects by `data-title`, because GButton tooltips drop the native `title`. That test failed on the branch and passed on base.
- **a4d12ab8b42:** acts on review 2. A red-then-green GCard vitest, and the dead `workflow_card_button` selector is fixed.
- **Full client vitest:** before the `JobInformation` fix, 1 failure out of 5088. That failure is now fixed.
- **Hardening:** the steps are re-run against the expanded branch per "Re-harden".
