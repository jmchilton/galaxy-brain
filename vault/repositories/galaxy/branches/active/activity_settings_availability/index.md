# activity_settings_availability

Status: `branches_ready_for_final_review`. Base: `dev`.

Lists only optional activities available to the current user.

[Polish](polish_debrief.md) · [Checklist review](checklist_review.md) · [PR description](pr_description.md) · [Titles](pr_titles.md) · [Implementation](implementation_debrief.md) · [Tracking history](tracking_history.md)

Builds on merged [shared_activity_availability](../../merged/shared_activity_availability/index.md) ([#23921](https://github.com/galaxyproject/galaxy/pull/23921)). Restacked without conflicts onto `dev` (`3347e84bc5e9`) on 2026-10-11; restacked head `75120e401b0d`.

## Polish started — 2026-10-11

John requested `POLISH_BRANCH` for this branch. General checklist applies: this changes activity settings only, not workflow editing, execution, collection mapping or gxformat2. Prior head `6c0307b4b35` has green client unit, lint, Selenium, integration Selenium and Tool Shed runs. Playwright and first-startup failed restoring the client cache; macOS dependency-install failure is unrelated. Fresh checks will run on the restacked head.

## Polish complete — 2026-10-11

Final head: `ab57bd6901dc429f5b189837128456313a309b67`, pushed to `jmchilton:activity_settings_availability` with an explicit lease protecting the old head. Two-file settings-only diff; no parent dependency remains. Added mounted configuration and permission transition tests in one strengthening round, then reran the checklist review. Both reviews found no blockers.

Focused local suite: 36/36 across five files; TypeScript, eslint, prettier, whitespace and commit hooks passed. The original two regressions fail against current dev at the rendered Upload and Interactive Tools assertions. Fresh fork CI is pending; prior cache and dependency-install failures are unrelated (see polish debrief). No screenshot review or fresh E2E run claimed.

Description and four title options are prepared. Human-read checklist item remains unchecked; waiting for John's final review. No PR opened and no approval inferred.
