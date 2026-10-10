# playwright_timeout_retry_once

Status: `branches_implemented_needs_ci`. Base: `dev`. No PR.

`retry_call_during_transitions` retries a Playwright timeout once rather than ten times.

[Implementation](implementation_debrief.md) · [Initial implementation](initial_implementation_debrief.md) · [Review](subagents/normal_review.md) · [Test challenges](test_challenges_debrief.md) · [Codex](codex_review.md) · [Scope](scope_evaluation.md)

Pulled out of [`galaxy_ui_driver`](../galaxy_ui_driver/index.md) (commit 7b, "Retry a Playwright timeout once during transitions, not ten times") per [the upstreaming plan](../../../../../projects/playwright/GALAXY_UI_DRIVER_UPSTREAM.md). Drop the commit from `galaxy_ui_driver` once this merges.

The PR description must say upfront that this partly reverts `2825bb09e42` ("Try to fix transiently failing test?", 2026-03-22), which made Playwright timeouts retryable. John (2026-10-09): that commit's CI run is gone and the flake won't come back; the change justifies itself.
