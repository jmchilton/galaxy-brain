# Test challenges debrief: PR #24586

Profile: gx_test_challenger. Model: Claude Opus 5.5, low effort. Reviewed commit: c889c700361.

PR adds `GProgress`, `GProgressBar`, `progressContext.ts` to `client/packages/ui` with one Vitest file (`GProgress.test.ts`, 16 tests). No call sites change; nothing renders the components yet.

Vitest was not run locally (worktree has no `client/node_modules`).

## Per-test challenge

| Test | Verdict | Notes |
|---|---|---|
| renders one progressbar with its value range | keep | Asserts ARIA contract and width, the visible result. Inline `width: %` is computed by the component, not faked layout. |
| defaults the maximum to 100 and accepts numeric strings | keep | Two concerns in one test; the 100 default is also covered by the standalone test. Nit only. |
| keeps the bar and its announced value within the range | keep | Covers the 767c2613 fix (valuenow clamp). |
| names the single bar with the label given to the progress | keep | |
| points the single bar at an external label | keep | |
| shows the percentage with showProgress, to the given precision | keep | Also covers precision flowing through the context to the implicit bar. |
| shows the raw value with showValue | keep | |
| shows a label and announces it as the value text | keep | |
| shows no text by default | keep | |
| stacks bars against the progress maximum | keep | |
| groups stacked bars under the progress label | keep | |
| lets a bar override the progress maximum | keep | |
| lets bars take display options from the progress unless they set their own | keep | Only `showProgress` inheritance/override. |
| passes attributes such as data-* and title to the bar element | keep | Matches the job-state bar call site need. |
| renders custom bar content from the default slot | keep | |
| works as a standalone bar with a maximum of 100 | keep | |

No mocks; nothing to replace with noop impls or dataclasses. `mount` rather than `shallowMount` is justified: the provide/inject parent-child contract is the thing under test, and the single-bar `GProgress` output is its internal `GProgressBar`. No tests are silly, implementation-only, or layout-faking.

## Gaps

1. No reactivity test. Every real call site (quota meter, upload/job/collection progress, storage operations) updates `value` over time, and the stacked design depends on `ProgressContext` holding `ComputedRef`s. Nothing checks that a changed `value` updates `aria-valuenow`/width, or that a changed parent `max`/`showProgress` reaches already-mounted children. A regression that provided plain values instead of computeds would pass every current test.
2. Documented content priority (slot > `label` > `showProgress` > `showValue`) is only partly covered; `label` winning over `showProgress`, and `showProgress` over `showValue`, are untested.
3. Fallback paths untested: a stacked `GProgress` with no `aria-label`/`aria-labelledby` must not get `role="group"`; a bar with an invalid own `max` (`0`, `"abc"`) falls back to the parent's max; non-numeric `value` strings fall back to 0.

Variant/striped/animated are expressed only as CSS classes; asserting class names would test implementation, and the contrast claims are visual. Not recommended as unit tests.

## E2E

Not warranted in this PR: no page renders the components. The follow-up swap PRs inherit the existing Selenium/Playwright coverage of the replaced `BProgress` call sites (history collection/dataset progress, quota meter, storage operation outcome); those PRs are where selectors keyed on Bootstrap's `.progress`/`.progress-bar` classes would need checking.

## Test plan (recommendations)

- Add one test that mounts single-bar `GProgress`, calls `setProps({ value })`, and asserts `aria-valuenow` and width change; and one stacked test where the parent's `max` (or `show-progress`) changes and a child bar's `aria-valuemax`/text follows.
- Extend the text tests with `label` + `showProgress` (label shown) and `showProgress` + `showValue` (percentage shown).
- Add a stacked-without-label assertion (`role` undefined) to the grouping test, and an invalid-`max` bar inside a `GProgress` to the override test.
