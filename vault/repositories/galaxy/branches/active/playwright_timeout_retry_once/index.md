# playwright_timeout_retry_once

Status: `branches_need_polish`. Base: `dev` (`63192fd64e4`). No PR. Head: `28a5648195e8427555d362edb46ea4dd2edf9a9f`.

`retry_call_during_transitions` retries a Playwright timeout once rather than ten times.

[Implementation](implementation_debrief.md) · [Initial implementation](initial_implementation_debrief.md) · [Review](subagents/normal_review.md) · [Test challenges](test_challenges_debrief.md) · [Codex](codex_review.md) · [Scope](scope_evaluation.md)

Pulled out of [`galaxy_ui_driver`](../galaxy_ui_driver/index.md) (commit 7b, "Retry a Playwright timeout once during transitions, not ten times") per [the upstreaming plan](../../../../../projects/playwright/GALAXY_UI_DRIVER_UPSTREAM.md). Drop the commit from `galaxy_ui_driver` once this merges.

The PR description must say upfront that this partly reverts `2825bb09e42` ("Try to fix transiently failing test?", 2026-03-22), which made Playwright timeouts retryable. John (2026-10-09): that commit's CI run is gone and the flake won't come back; the change justifies itself.

## TICK — 2026-10-11

Live fork head `7682a9a4e096658fb66155235630e871303b4ef1`: unit, Python lint, Playwright and integration-Selenium checks pass. API shard 0’s sole failed case is `test_error_outputs_with_purged_inputs`, expected paused but got error. Raw job log shows PostgreSQL DeadlockDetected/PendingRollbackError; API tests do not use the modified Playwright driver. This is unrelated to the retry limit. [Run 38066018983](https://github.com/jmchilton/galaxy/actions/runs/38066018983) is queued for failed-job rerun; promoted with relevant driver/unit coverage green.

## Polishing — 2026-10-13

Previous head `7682a9a4e09`: 48 successful fork checks, two skipped, no failures. Rebased cleanly onto current `dev` (`63192fd64e4`), preserving the patch exactly per range-diff; pushed to `jmchilton` with an explicit force-with-lease. New head `28a5648195e8427555d362edb46ea4dd2edf9a9f`; fresh CI queued/in progress.

Both retry tests pass. An isolated pytest plugin replaced only the helper with the actual current `dev` function: timeout test fails at `assert 12 == 2`, stale-element test passes. No project files were edited for the red check. Black, isort and diff whitespace checks pass.

[Polishing checklist](polish_checklist.md) · [Strengthening round](polish_strengthening.md) · [PR description](pr_description.md) · [Titles](pr_titles.md). Independent checklist passed; one strengthening round found nothing to add. Broader shared-driver tests are running; no description-driven code changes were required.
