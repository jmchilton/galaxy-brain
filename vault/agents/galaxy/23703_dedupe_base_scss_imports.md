# PR 23703 — Remove duplicate scoped `base.scss` copies from the CSS bundle

Reviewed head: `ddf9b734649edf560d5544fc49e17eb604472634`

## Recommendation

Approve once the remaining CI finishes. I found no correctness or architectural blocker in the four-file delta.

## Findings

No blocking findings.

	The replacements preserve the SCSS dependencies each component actually uses:
	
	- `BaseGrid.vue` retains `theme/blue.scss` for its table variables.
	- `ThemeSelector.vue` retains `theme/blue.scss` for `$text-shadow`; the direct `0.25rem` radius and padding match the stock Bootstrap utilities it replaces. Dropping `!important` is safe for the component's own uniquely named elements and is called out in the PR.
	- `FormElement.vue` correctly loads Bootstrap functions before `_form-elements.scss`; this is necessary because `blue.scss` computes the `$state-*` values with `theme-color-level()`. The explicit `.ui-form-element.alert` rule preserves the previous effective one-rem bottom margin without re-emitting Bootstrap.
	- `ListCollectionCreator.vue` uses no SCSS symbols and needs no import.
	
	Removing a global stylesheet import from a Vue `scoped` block is the correct architectural fix: Vue was turning the imported selectors into component-scoped copies, so ordinary global base styles were being duplicated and given component-specific cascade behavior. This change returns these components to the same global Bootstrap/Galaxy stylesheet used by the rest of the client instead of maintaining four accidental local variants.

## Regression and test assessment

The main risk is visual cascade drift rather than application logic. The PR description provides unusually thorough before/after evidence across the affected pages, desktop/mobile layouts, computed styles, pixel diffs, and axe scans. The three intentional visible/interaction differences are narrow and credible consequences of removing the scoped copies.

There is no new automated assertion for bundle size or a lint rule preventing future scoped imports of `base.scss`/Bootstrap. I do not consider that blocking for this cleanup: component tests cannot meaningfully assert the generated aggregate CSS size, and production compilation plus the supplied bundle comparison directly exercises the change. A future static lint/check against importing CSS-emitting entry points from scoped blocks could prevent recurrence more effectively than component tests.

Local focused Vitest execution was unavailable because this worktree has no `client/node_modules`. I did not install the full client dependency tree solely for the review. GitHub's client unit suite, client lint, CodeQL, CircleCI, and one reusable client build have passed at this head. The remaining client builds and browser/server matrices were still pending when checked.

`git diff --check origin/dev...HEAD` passes, and the worktree is clean.
