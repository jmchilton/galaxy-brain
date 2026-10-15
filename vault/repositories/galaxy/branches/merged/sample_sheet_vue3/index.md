# sample_sheet_vue3

Status: MERGED — archived 2026-10-15.

Moves sample sheet grids to Vue 3 patterns and fixes editing bugs.

[Latest review fixes](review_followups_2026-10-14.md) · [Vue 3 migration guide](../../../../../agents/gx_branches/VUE3_COMPONENT_MIGRATION.md) · [Marius follow-up pass](marius_followups_2026-10-13.md) · [Codex review](codex_review.md) · [Implementation](implementation_debrief.md) · [Initial implementation](initial_implementation_debrief.md) · [Polish](polish_debrief.md) · [PR description](pr_description.md) · [Titles](pr_titles.md) · [Scope evaluation](scope_evaluation.md) · [Screenshots](screenshot_debrief.md) · [Test challenges](test_challenges_debrief.md) · [Tracking history](tracking_history.md)

2026-10-11: John authorized rejected-edit feedback, extra-column validation, and the `AgRowData` union; implemented and pushed at `6f8cb56e61d`; John subsequently requested opening a draft while CI runs.

## Follow-up polish — 2026-10-11

John approved all three changes: rejected-edit toast, workbook datatype/genome validation, and `AgRowData` narrowing. The branch rebased without conflicts onto dev `3347e84bc5e`. The PR description now includes Agentic Checks and the prior screenshot review’s findings and limits.

CI checked before edits: browser workflows on `5b921635fb2` passed ([Playwright](https://github.com/jmchilton/galaxy/actions/runs/37873975589), [Selenium](https://github.com/jmchilton/galaxy/actions/runs/37873975627), [integration Selenium](https://github.com/jmchilton/galaxy/actions/runs/37873975598)). [Package CI](https://github.com/jmchilton/galaxy/actions/runs/37873975320) failed while collecting `packages/selenium/tests/seleniumtests/test_context.py` on Python 3.10 and 3.14: `ModuleNotFoundError: No module named galaxy_test`. This package/import failure does not exercise the sample-sheet client changes. Validation on `6f8cb56e61d`: 160/160 relevant Vitest tests, vue-tsc and prettier pass; eslint has no errors and two existing warnings (drop handlers on the outer div and `@gridReady` hyphenation). Pre-commit hooks pass. Fresh checklist review and the strengthening round are complete; the human-read item remains unchecked. Fork CI on this head is queued as of 2026-10-11: [client unit tests](https://github.com/jmchilton/galaxy/actions/runs/38151922591), [client lint](https://github.com/jmchilton/galaxy/actions/runs/38151922740), [Playwright](https://github.com/jmchilton/galaxy/actions/runs/38151922927), and [integration Selenium](https://github.com/jmchilton/galaxy/actions/runs/38151922941).

## Draft PR opened — 2026-10-11

John explicitly requested a draft PR waiting for CI. Opened [#24050](https://github.com/galaxyproject/galaxy/pull/24050) against `dev` from `jmchilton:sample_sheet_vue3` at `6f8cb56e61d3ebed4853c1ce90b6fe9b7950ff89`, titled “Move sample sheet grids to Vue 3 patterns, fix editing bugs”. The description was submitted verbatim from the current local `pr_description.md`, including John’s checked human-read item. No mentions or embedded screenshot assets were added.

Verified open/draft, mergeable, correct base/head and matching body. At the check, 44 of 46 upstream checks were pending; fork client and browser CI remained queued. Moved the queue entry to `ci_wait`. This records authorization to open the draft; CI is still awaited.

## TICK — 2026-10-11

All 60 upstream checks on `6f8cb56e61d3ebed4853c1ce90b6fe9b7950ff89` settled successfully/skipped with no failures; CI was the sole draft blocker. Rebased onto actual dev `c8708636c2f29a233dcce4b9c1fa75f2c5aea24f` without conflicts; range-diff confirms all six patches identical. Existing approval carries to `9474de6d78b123e35ab144883e189fd7e4cffad3`. Reran all 160 affected Vitest cases across 17 files: all pass. Force-pushed with an exact fork lease and undrafted under standing TICK authorization. Fresh checks run on the rebased head; old green results are not claimed for it.

## TICK — 2026-10-12

Live regular PR is mergeable at `9474de6d78b123e35ab144883e189fd7e4cffad3`; all 59 checks have settled without failures. Remains ready from our side. No stale rebase or PR-setting change.


## Marius review — 2026-10-13

[Review](https://github.com/galaxyproject/galaxy/pull/24050#pullrequestreview-5500793156) requests fixing collection-backed workbook reload before merge: the generic parser omits URLs/model objects, and the grid changes to URI mode, producing invalid fetch elements. [Inline reproduction and alternatives](https://github.com/galaxyproject/galaxy/pull/24050#discussion_r4256376934). Moved to attention because this is author-side work. Four additional findings are explicitly optional follow-ups. [Per-PR TODO list](../../../../../agents/gx_branches/REVIEW_WORK_2026_10_13.md). No code changes or public reply made in this task.

## Marius follow-ups implemented — 2026-10-13

John requested a complete pass and authorized the warranted fixes. Addressed all five findings at `ea019fe47001ea9a6205ccd49a86701e6f219ece`; none deferred. Collection workbook reload preserves loaded dataset/pair objects and edited metadata; unsupported replacement targets clear stale table state; an internal Symbol prevents metadata-key collisions; optional restricted columns clear to null; identifier renames update references or reject restriction-breaking changes. [Detailed decisions and verification](marius_followups_2026-10-13.md).

168/168 affected Vitest tests, vue-tsc, Prettier, lint (zero errors), diff checks and commit hooks pass. Confirmed the seven original regressions fail against the old source. Pushed normally to the fork; upstream head matches, remains non-draft and mergeable. Status stays attention pending fresh relevant CI; prior green CI is not attributed to the new SHA. No public reply, PR setting change, or live-browser run. Existing approval is not treated as approval of this changed SHA. Tracking sync remains blocked by existing `vault/reviews/Untitled.md` missing frontmatter.

## Review follow-ups — 2026-10-14

Addressed both inline comments in [Ali’s review](https://github.com/galaxyproject/galaxy/pull/24050#pullrequestreview-5517646707), pushed `88ac10202d82e5e4dc79605e748fae7b458a1e8f`. FetchGrid tests assert new row-array identity for both supported replacements; an in-place splice mutation fails the assertion. Collection-load errors remain visible without a dismiss button. Corrected both outdated real-ag-grid claims in the live PR body and local description. [Verification](review_followups_2026-10-14.md) and the [one-page migration guide](../../../../../agents/gx_branches/VUE3_COMPONENT_MIGRATION.md) collect this round and the earlier work.

168/168 affected Vitest tests, vue-tsc, formatting, diff checks and commit hooks pass; lint has zero errors and one existing event-hyphenation warning in the touched files. No new browser run or public reply. Live base is `release_26.2`; PR is mergeable, non-draft, with fresh CI queued. Remains attention pending fresh CI/review; changed SHA has no carried approval. Vault validation now passes (122 files, zero errors, 15 advisory warnings), superseding the previous sync blocker.

## TICK — 2026-10-14

Current head 88ac10202d82 is non-draft and mergeable against release_26.2. Client/browser checks pass. Both package jobs fail mypy at unchanged galaxy/security/ssh_util.py:18 (untyped publickey call), unrelated to sample-sheet changes; failed jobs rerun. Recorded review fixes are complete, so moved to ready. No review reply or PR description change.

## Merged — 2026-10-15

GitHub confirms [#24050](https://github.com/galaxyproject/galaxy/pull/24050) merged at 2026-10-15T08:41:30Z. Removed from the active queue and archived this record.
