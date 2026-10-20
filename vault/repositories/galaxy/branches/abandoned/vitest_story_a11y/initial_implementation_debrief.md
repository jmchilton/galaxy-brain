# Initial implementation

Added `@storybook/addon-a11y@10.6.1`, matching Storybook. Preview checks `body`
and makes axe violations fail by default; `runOnly` retains WCAG 2.0/2.1 A/AA
and best practices and adds WCAG 2.2 AA. Added desktop, panel, and mobile viewport
presets. Contributor instructions and a story-by-story audit live in
`client/.storybook/README.md` and `A11Y_AUDIT.md`.

First strict run: 236 stories, 115 passed, 120 axe failures, one collection
refresh play failed on its existing behavior assertion. Only observed axe
failures get inline `todo` exceptions naming the rules; no checks or DOM
subtrees disabled. Existing plays and unit tests are unchanged.

The pitch now explains visual regression value for component migration,
Chromatic versus local Vitest screenshots, final-play-state capture, baseline
timing, and remaining CI requirements. No historical bug prevention claim.

Validation and independent reviews are in progress.
