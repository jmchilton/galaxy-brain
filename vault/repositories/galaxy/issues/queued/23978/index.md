# galaxy#23978 — Framework `parameters/` test tools use `ext=` on data inputs

[Issue](https://github.com/galaxyproject/galaxy/issues/23978) · [issue draft](issue_draft.md) · [proposal](proposal.md) · [debrief](debrief.md)

Filed 2026-10-08 by Claude for John; assigned jmchilton. Came out of branch `issue_18642_framework_tool_coverage` (#18642).

14 tools in `test/functional/tools/parameters/` use `ext=` (ignored; `parse_extensions` reads `format`; XSD rejects). 17 of 99 tools fail XSD on dev; 16 once the issue_18642 branch merges (it removes a stray `g`). CI (`.ci/validate_test_tools.sh`) never validates `parameters/`.

Next: after issue_18642 lands, drop `ext="data"`, switch `ext="txt"`/`"tabular"` to `format=`, add section/repeat `title`, extend XSD for `type="rules"` and drill_down `option selected`, add `parameters/*.xml` to CI. Rerun framework tool tests after the `format=` switch.

Open: swap the 🌿 branch link in the issue for the PR once issue_18642's PR opens. Side bug: CI script also lints nonexistent `lib/galaxy/tools/xsd/galaxy.xsd`.
