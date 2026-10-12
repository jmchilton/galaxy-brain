# script_setup_polling_unmount

Status: merged 2026-10-12. [PR #24054](https://github.com/galaxyproject/galaxy/pull/24054).

Install Monitor and StsDownloadButton stop polling for good on unmount, even with a request in flight.

[Polish](polish_debrief.md) · [PR description](pr_description.md) · [Titles](pr_titles.md) · [Tracking history](tracking_history.md)

Approved SHA: `2aea857fc59061ee15d8881fb8fb1effcc149cef` (John, 2026-10-07 at `26da6bc30bd`; carried across clean rebases onto dev on 2026-10-09 and 2026-10-11). Chosen title: **Stop Tool Shed install and download polling for good on unmount**.

Recorded CI conditions and description instructions are in the tracking history; [shared CI context](../../queue_context.md) applies.

## TICK — 2026-10-11

Approved-head client unit/lint and API CI passed. Playwright actually ran: workflow export/download browser cases passed; its sole failure is `test_step_parameter_inputs` waiting for a history dataset, also present on unrelated branches and outside polling/download code. Integration failures are Singularity container environment setup; database-index, integration-Selenium and harness jobs failed pulling Docker images (`toomanyrequests`); release-script checks the fork’s old `master` VERSION_MINOR. These reds are unrelated, and failed jobs were rerun. The branch is greenish with relevant coverage executed. Clean rebase onto dev `c8708636c2f29a233dcce4b9c1fa75f2c5aea24f` carries approval to full SHA `2aea857fc59061ee15d8881fb8fb1effcc149cef`; range-diff differs only in surrounding `useConfig()` context from merged #24022. All 19 lifecycle tests pass. Published with an exact fork lease and opened regular [PR #24054](https://github.com/galaxyproject/galaxy/pull/24054) using the chosen title and saved description verbatim. Fresh CI is pending.

## TICK — 2026-10-12

Live PR merged at `2026-10-12T12:01:17Z`, with head `2aea857fc59061ee15d8881fb8fb1effcc149cef`. Removed from the active queue and archived here. The worktree was clean, had zero commits ahead of its upstream, and matched the merged PR head. Existing user description edits are preserved locally and excluded from this maintenance commit.
