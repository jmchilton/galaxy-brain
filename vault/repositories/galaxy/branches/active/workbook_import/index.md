# workbook_import

Status: `ready`. Base: `dev`. [PR #23922](https://github.com/galaxyproject/galaxy/pull/23922) (open).

Tests the rule builder mapping Galaxy infers from workbook headers, under Selenium and Playwright.

[Polish](polish_debrief.md) · [PR description](pr_description.md) · [Titles](pr_titles.md) · [Tracking history](tracking_history.md)

## TICK — 2026-10-11

Live #23922 is mergeable, regular. Its remaining red is unrelated Integration container-resolver tests: Singularity Hub returns no manifest for `shub://GodloveD/lolcow-installer:latest`, so the image cannot be found. Reran failed jobs in [run 37773225748](https://github.com/galaxyproject/galaxy/actions/runs/37773225748); no stale rebase.
