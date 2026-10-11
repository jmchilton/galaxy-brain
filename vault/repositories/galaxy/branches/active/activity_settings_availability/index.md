# activity_settings_availability

Status: `branches_need_polish`. Base: `dev`.

Lists only optional activities available to the current user.

[Implementation](implementation_debrief.md) · [Tracking history](tracking_history.md)

Builds on merged [shared_activity_availability](../../merged/shared_activity_availability/index.md) ([#23921](https://github.com/galaxyproject/galaxy/pull/23921)). Restacked without conflicts onto `dev` (`3347e84bc5e9`) on 2026-10-11; current head `75120e401b0d`.

## Polish started — 2026-10-11

John requested `POLISH_BRANCH` for this branch. General checklist applies: this changes activity settings only, not workflow editing, execution, collection mapping or gxformat2. Prior head `6c0307b4b35` has green client unit, lint, Selenium, integration Selenium and Tool Shed runs. Playwright and first-startup failed restoring the client cache; macOS dependency-install failure is unrelated. Fresh checks will run on the restacked head.
