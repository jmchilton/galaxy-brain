# sample_sheet_vue3

Status: `ci_wait`. Base: `dev`. Draft PR: [#24050](https://github.com/galaxyproject/galaxy/pull/24050).

Moves sample sheet grids to Vue 3 patterns and fixes editing bugs.

[Codex review](codex_review.md) · [Implementation](implementation_debrief.md) · [Initial implementation](initial_implementation_debrief.md) · [Polish](polish_debrief.md) · [PR description](pr_description.md) · [Titles](pr_titles.md) · [Scope evaluation](scope_evaluation.md) · [Screenshots](screenshot_debrief.md) · [Test challenges](test_challenges_debrief.md) · [Tracking history](tracking_history.md)

2026-10-11: John authorized rejected-edit feedback, extra-column validation, and the `AgRowData` union; implemented and pushed at `6f8cb56e61d`; John subsequently requested opening a draft while CI runs.

## Follow-up polish — 2026-10-11

John approved all three changes: rejected-edit toast, workbook datatype/genome validation, and `AgRowData` narrowing. The branch rebased without conflicts onto dev `3347e84bc5e`. The PR description now includes Agentic Checks and the prior screenshot review’s findings and limits.

CI checked before edits: browser workflows on `5b921635fb2` passed ([Playwright](https://github.com/jmchilton/galaxy/actions/runs/37873975589), [Selenium](https://github.com/jmchilton/galaxy/actions/runs/37873975627), [integration Selenium](https://github.com/jmchilton/galaxy/actions/runs/37873975598)). [Package CI](https://github.com/jmchilton/galaxy/actions/runs/37873975320) failed while collecting `packages/selenium/tests/seleniumtests/test_context.py` on Python 3.10 and 3.14: `ModuleNotFoundError: No module named galaxy_test`. This package/import failure does not exercise the sample-sheet client changes. Validation on `6f8cb56e61d`: 160/160 relevant Vitest tests, vue-tsc and prettier pass; eslint has no errors and two existing warnings (drop handlers on the outer div and `@gridReady` hyphenation). Pre-commit hooks pass. Fresh checklist review and the strengthening round are complete; the human-read item remains unchecked. Fork CI on this head is queued as of 2026-10-11: [client unit tests](https://github.com/jmchilton/galaxy/actions/runs/38151922591), [client lint](https://github.com/jmchilton/galaxy/actions/runs/38151922740), [Playwright](https://github.com/jmchilton/galaxy/actions/runs/38151922927), and [integration Selenium](https://github.com/jmchilton/galaxy/actions/runs/38151922941).

## Draft PR opened — 2026-10-11

John explicitly requested a draft PR waiting for CI. Opened [#24050](https://github.com/galaxyproject/galaxy/pull/24050) against `dev` from `jmchilton:sample_sheet_vue3` at `6f8cb56e61d3ebed4853c1ce90b6fe9b7950ff89`, titled “Move sample sheet grids to Vue 3 patterns, fix editing bugs”. The description was submitted verbatim from the current local `pr_description.md`, including John’s checked human-read item. No mentions or embedded screenshot assets were added.

Verified open/draft, mergeable, correct base/head and matching body. At the check, 44 of 46 upstream checks were pending; fork client and browser CI remained queued. Moved the queue entry to `ci_wait`. This records authorization to open the draft; CI is still awaited.
