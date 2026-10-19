Reviewed by default (Claude Opus 5.5, low effort).

No P1 or P2 issues — the provide/inject live-region key follows the existing `galaxy-ui` context pattern, and no other `LoadingSpan` call site sits inside a live region, so nothing double-announces. Looks good.

**Consider: hide the spinner icon from assistive tech** — `client/src/components/LoadingSpan.vue:8`. The icon's `title="loading"` now sits inside the `role="status"` region, so it may be read alongside the message ("loading Loading..."). The text already covers assistive tech; `GButton`'s spinner is `aria-hidden="true"` for the same reason. [Fix](https://github.com/jmchilton/galaxy/commit/a5682fda098)
