# Component - Tool Profile Versions and Upgrade Advisor

Cover how a tool's `profile` attribute gates runtime and load behaviour, and the upgrade advisor (`lib/galaxy/tool_util/upgrade/`: `ProfileMigration*` classes, `upgrade_codes.json`, `advise_on_upgrade`, `script.py`, `latest_supported_version`, the skip/break rules and string version comparison). Include a catalog of the profile gates in `lib/galaxy/tools/`, `lib/galaxy/tool_util/` and the XSD changelog (e.g. `structured_like` 26.0 in `execute.py`, the 26.1/26.2 gates), noting which have advisor coverage, which have a matching linter, and the pre-existing advisor bugs (`_find_all` ignoring its xpath, `add("")`). Leave out per-version user-facing release notes.

## Why

Work on #23884 and #23902 each needed to know which profile gates exist and whether the advisor covers them; there is no note, so each branch re-greps. The advisor stops at 24.2 while gates exist for 26.0-26.2.

## Requested by

- vault/repositories/galaxy/branches/active/upgrade_advice_structured_like/brain_research.md: needs the gate-vs-advice-vs-linter map to add the 26.0 migration.

## Debrief

- Created `vault/research/Component - Tool Profile Versions and Upgrade Advisor.md` against Galaxy `origin/dev` @ `65e6daff`. It has a gate catalog of about 30 gates. Each row gives the gate's file and line, whether the XSD changelog lists it, the advice code `dev` emits, and the matching linter. The note also covers the advisor's data model, migrations, skip/break rules, CLI, bugs and tests, and a recipe for adding a migration. Open PR #24524 is described separately, under "Proposed (unmerged)", including what it does not fix.
- Answer for #24524 (the gate/advice/linter map): every 26.x gate (26.0 `structured_like`; 26.1 citations and empty multi-select; 26.2 `galaxy.json`, optional boolean, assertion separator) has no advice on `dev`. 26.0 and both 26.1 gates have profile-gated linters, and no 26.2 gate does. 23.1 booleans and the 24.2 `data_ref` requirement have no advice even with #24524.
- Pre-existing advisor bugs the request named (`_find_all`, `add("")`) are confirmed. Also found: the `<` skip off-by-one, 24.2 advice validating at the hardcoded 26.1 profile, the 17.09 backtick attribute (advice never fires), `--json` raising TypeError, duplicate advice entries, and string-vs-`Version` ordering. One detail corrects the earlier debrief and #24524: before the fix, `_find_all` makes the 23.0 advice fire on each `from_work_dir` output, not "never fire". After the fix its xpath (`.//input[@type='text']`) matches nothing, because tool XML uses `<param>`.
- research_issues: `upgrade-advisor-version-skip-and-helper-bugs.md`, `upgrade-advisor-17-09-backtick-attribute.md`, `upgrade-advisor-json-output-typeerror.md`, `xsd-profile-changelog-drift.md`.
- Out of scope: per-version release notes for users, what each linter checks (see the Tool Linters note), and planemo's use of the advisor. The advisor was checked by reading the code only. The Galaxy clone has no virtualenv, so it wasn't run.
