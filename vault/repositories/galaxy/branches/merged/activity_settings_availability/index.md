# activity_settings_availability

Status: merged 2026-10-12. [PR #24052](https://github.com/galaxyproject/galaxy/pull/24052).

Lists only optional activities available to the current user.

[Polish](polish_debrief.md) · [Checklist review](checklist_review.md) · [PR description](pr_description.md) · [Titles](pr_titles.md) · [Implementation](implementation_debrief.md) · [Tracking history](tracking_history.md)

Builds on merged [shared_activity_availability](../shared_activity_availability/index.md) ([#23921](https://github.com/galaxyproject/galaxy/pull/23921)). Restacked without conflicts onto `dev` (`3347e84bc5e9`) on 2026-10-11; restacked head `75120e401b0d`.

## Polish started — 2026-10-11

John requested `POLISH_BRANCH` for this branch. General checklist applies: this changes activity settings only, not workflow editing, execution, collection mapping or gxformat2. Prior head `6c0307b4b35` has green client unit, lint, Selenium, integration Selenium and Tool Shed runs. Playwright and first-startup failed restoring the client cache; macOS dependency-install failure is unrelated. Fresh checks will run on the restacked head.

## Polish complete — 2026-10-11

Final head: `ab57bd6901dc429f5b189837128456313a309b67`, pushed to `jmchilton:activity_settings_availability` with an explicit lease protecting the old head. Two-file settings-only diff; no parent dependency remains. Added mounted configuration and permission transition tests in one strengthening round, then reran the checklist review. Both reviews found no blockers.

Focused local suite: 36/36 across five files; TypeScript, eslint, prettier, whitespace and commit hooks passed. The original two regressions fail against current dev at the rendered Upload and Interactive Tools assertions. Fresh fork CI is pending; prior cache and dependency-install failures are unrelated (see polish debrief). No screenshot review or fresh E2E run claimed.

Description and four title options are prepared. Human-read checklist item remains unchecked; waiting for John's final review. No PR opened and no approval inferred.

## Approved and PR opened — 2026-10-11

John approved the polished branch and explicitly requested opening its PR. Approved SHA: `ab57bd6901dc429f5b189837128456313a309b67`. Chosen title: “Offer only available optional activities in Activity Settings” (first prepared option). Approval date: 2026-10-11. The current saved description has John's human-read checkbox checked; that user edit was preserved.

Opened [PR #24052](https://github.com/galaxyproject/galaxy/pull/24052) against `dev`, from `jmchilton:activity_settings_availability`, as a regular PR per the direct request. The description was submitted verbatim from `pr_description.md`, without added mentions or assets. CI was still queued at opening; this was John's explicit request to open now rather than an automatic green-CI promotion. No rebase was needed: upstream dev still matched `3347e84bc5e9`.

Verified OPEN, not draft, base `dev`, exact approved head and saved body. Moved to `ready`: no known author-side work, with upstream CI still pending. Pending checks are not recorded as passed. Prior infrastructure diagnoses remain in the polish debrief.

## TICK — 2026-10-12

Live PR merged at `2026-10-12T12:32:04Z`, with head `ab57bd6901dc429f5b189837128456313a309b67`. Removed from the active queue and archived here. The worktree was clean, had zero commits ahead of its upstream, and matched the merged PR head. Existing user description edits are preserved locally and excluded from this maintenance commit.
