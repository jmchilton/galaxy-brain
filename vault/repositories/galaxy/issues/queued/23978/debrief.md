# Debrief: framework_parameter_tools_ext_attribute

Prepared 2026-10-07. Source: `framework_parameter_tools_ext_attribute.md`. Proposal: `proposed_framework_parameter_tools_ext_attribute.md`.

## Research

- Verified twice on dev `02a2e659909` (drafter + reviewer, scratch worktrees): 14 tools in `test/functional/tools/parameters/` use `ext=` on data params; `parse_extensions()` reads only `format`; other `ext` readers are output-only. 17 of 99 tools (not 100; `macros.xml` isn't a tool) fail the XSD.
- Stray `g` typo in `gx_drill_down_code.xml` adds an XSD error on dev; the issue_18642 branch (fork, tip `1e8e1f9`, no PR yet) already removes it → 16 failures after merge.
- `section`/`repeat` `title` optional at runtime (repeat falls back to `name`). XSD allows `ext` only on `<discover_datasets>`.
- `.ci/validate_test_tools.sh` (CircleCI `validate_test_tools`) covers only top-level tools. `ext=` pattern from `5359f8ba746` (2024-06), copied through 2026-03.
- `parameter_specification.yml` has no entries for the 5 tools whose inputs become restricted under `format=`. No duplicate.

## Rewrite

- Dropped agent chatter. Context cites 🎯 #18642 and 🌿 issue_18642 branch.
- Added Proposed Approach (`ext=`→`format=`/drop, per-row XSD vs tool fixes, extend CI) and Alternatives.
- Reviewer: typo row marked fixed-on-branch, table legend, CI job named, narrowed spec caveat.

## Leftover

- Framework tool tests not rerun after `format=` switch (flagged in issue).
- Out of scope: CI script lints nonexistent `lib/galaxy/tools/xsd/galaxy.xsd`; maybe a separate tiny fix.
- Swap branch link for PR once issue_18642 PR opens. Assign John (his branch).
