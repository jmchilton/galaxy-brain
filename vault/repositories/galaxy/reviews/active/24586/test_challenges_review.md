# Test challenges review: PR #24586

Profile: gx_test_challenger. Model: Claude Opus 5.5, low effort. Reviewed commit: c889c700361.

Debrief: [test_challenges_debrief.md](test_challenges_debrief.md). The 16 Vitest tests in `GProgress.test.ts` are behaviour-focused, mock-free, and assert the ARIA contract and visible text; none should be dropped. E2E is not warranted until a page renders the components. Tests were not run locally.

### P2 1: No test that bars follow changing values or parent options

Progress bars exist to update: every `BProgress` call site this replaces (quota meter, collection/dataset/job progress, storage operations) changes `value` while mounted, and stacked bars read `max` and display options from `ProgressContext` computeds. No test changes a prop after mount, so a regression that provided plain values instead of `ComputedRef`s, or cached the bar's width, would pass the suite.

Suggested fix: mount a single-bar `GProgress`, `await setProps({ value: 60 })`, and assert `aria-valuenow` and `width: 60%`; in a stacked mount bound to a ref, change the parent `max` (or `show-progress`) and assert a child's `aria-valuemax` (or text) follows.

### P3 1: Documented content priority is only partly tested

`GProgressBar` documents content as slot > `label` > `showProgress` > `showValue`. Slot and each option alone are tested, but not `label` beating `showProgress`, or `showProgress` beating `showValue`.

Suggested fix: two extra assertions in the existing text tests.

### P3 2: Fallback paths untested

A stacked `GProgress` with no `aria-label`/`aria-labelledby` should not become `role="group"`; a bar whose own `max` is `0` or non-numeric should fall back to the parent's `max`; a non-numeric `value` string should read as 0. None are exercised.

Suggested fix: add the no-label case to "groups stacked bars under the progress label" and an invalid own `max` to "lets a bar override the progress maximum".
