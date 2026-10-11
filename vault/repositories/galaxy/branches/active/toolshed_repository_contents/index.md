# toolshed_repository_contents

Status: `branches_implemented`. Base: `dev`.

Adds a bounded repository-files API and Tool Shed contents browser (#22598).

[Implementation](implementation_debrief.md) · [plan](plan.md) · [Tracking history](tracking_history.md)

## TICK — 2026-10-11

Live fork head `682b8a68fbf51e5405d3cf84ceaf4818d6523305`: Tool Shed/API/unit/lint and Playwright/integration-Selenium checks pass. The sole red Selenium workflow failed pulling its job container (`toomanyrequests`), before tests; [run 37950058968](https://github.com/jmchilton/galaxy/actions/runs/37950058968) failed jobs rerun. Relevant Tool Shed coverage ran; promoted on diagnosed unrelated CI red.
