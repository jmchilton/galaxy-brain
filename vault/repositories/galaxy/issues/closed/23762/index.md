# galaxy#23762 — Workflow refactor API creates a new version even when nothing changed

[Issue](https://github.com/galaxyproject/galaxy/issues/23762)

Branch `workflow_refactor_skip_noop_save` ([#23790](https://github.com/galaxyproject/galaxy/pull/23790)) — `PUT /api/workflows/{id}/refactor` saves a new version even when the actions change nothing; spun off from [#22534](https://github.com/galaxyproject/galaxy/issues/22534); state: PR open against `dev`.

Closed 2026-10-06.
