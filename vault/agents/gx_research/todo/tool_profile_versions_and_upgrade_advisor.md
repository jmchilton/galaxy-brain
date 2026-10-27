# Component - Tool Profile Versions and Upgrade Advisor

Cover how a tool's `profile` attribute gates runtime and load behaviour, and the upgrade advisor (`lib/galaxy/tool_util/upgrade/`: `ProfileMigration*` classes, `upgrade_codes.json`, `advise_on_upgrade`, `script.py`, `latest_supported_version`, the skip/break rules and string version comparison). Include a catalog of the profile gates in `lib/galaxy/tools/`, `lib/galaxy/tool_util/` and the XSD changelog (e.g. `structured_like` 26.0 in `execute.py`, the 26.1/26.2 gates), noting which have advisor coverage, which have a matching linter, and the pre-existing advisor bugs (`_find_all` ignoring its xpath, `add("")`). Leave out per-version user-facing release notes.

## Why

Work on #23884 and #23902 each needed to know which profile gates exist and whether the advisor covers them; there is no note, so each branch re-greps. The advisor stops at 24.2 while gates exist for 26.0-26.2.

## Requested by

- vault/repositories/galaxy/branches/active/upgrade_advice_structured_like/brain_research.md: needs the gate-vs-advice-vs-linter map to add the 26.0 migration.
