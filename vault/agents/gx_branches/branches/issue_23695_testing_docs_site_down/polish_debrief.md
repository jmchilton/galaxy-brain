# issue_23695_testing_docs_site_down — polish debrief

2026-10-06. Branch `4675d47f162` (on dev `253a4cb0b9c`, 0 behind). Docs only: `doc/source/dev/writing_tests.md`.

## CI
Only "Build docs" applies; queued on `4675d47f162`, earlier runs cancelled. Nothing red.

## Checklist (GENERAL.md)
Subagent: every item pass or N/A; human-read item left for John. All decorator names, URLs, example tests and anchors verified against source. One imprecision: setup-time skip example pointed at `uses_shed.py` as if it had `handle_galaxy_config_kwds`; the check is in `UsesShed.configure_shed`. Fixed in `4675d47f162`.

## Strengthening
Applied (description only):
- Attribution: #23685 added quay/depot/Dockstore decorators and applied the older WorkflowHub one; `unavailable_pattern` / `skip_on_network_error` came from #23842. Context now cites both.
- Noted `skip_if_toolshed_down` under the table.
- Bold lines for audience (Galaxy's own tests, not tool tests), no retrofits, and "skips don't hide regressions".

Left over:
- Docs CI on `4675d47f162` still queued; the description's "no new warnings" is from a standalone render on `56d9d6f16bb` (only one sentence changed since).
- Scope questions for John (not done): move `skip_if_toolshed_down` into `galaxy.util.unittest_utils`? Also document `skip_unless_executable` / `skip_unless_environ`?
