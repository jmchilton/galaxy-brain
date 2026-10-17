# Tracking history

Imported from the branch agent on 2026-10-09; this preserves the recorded decisions and evidence. CI has not been refreshed by this migration.

- Branch `issue_18642_framework_tool_coverage` (`f66d1f0f97d`, off dev) — Description: Adds `gx_drill_down_from_file` framework tool, fixes relative `from_file` drill_downs having no parameter model, deprecates drill_down `from_file` (no working users; XSD-deprecated + lint warning), closes drill_down XSD gaps (fixes #18642); blockers: fork CI on `f66d1f0f97d`; scope questions in polish debrief. [Description](pr_description.md), [titles](pr_titles.md), [polish debrief](polish_debrief.md), [implementation debrief](implementation_debrief.md). [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:issue_18642_framework_tool_coverage?expand=1).

## Draft PR opened — 2026-10-17

John requested opening a draft PR. Opened [#24208](https://github.com/galaxyproject/galaxy/pull/24208) against `dev`, using `pr_description.md` verbatim, the first saved title, and labels `kind/bug`, `area/tool-framework`, `area/testing`. Preserve draft until John asks otherwise.

Pre-open rebase from `f66d1f0f97d` onto `dev` at `5ff1e46b8c3` completed without conflicts. `git range-diff` marks all seven patches unchanged. Published head `f0bfed218b43b32d8b13a660f689d927f0b62182` to the jmchilton fork with an exact-old-SHA force-with-lease. Focused `test_tool_linters.py`, `test_parameter_specification.py` and `test_parameter_test_cases.py`: 176 passed. Whitespace check passes and worktree is clean. Test log: `/private/tmp/issue18642-open-tests.log`.

Verified PR is draft, mergeable and based on dev with the published head. Upstream/fork CI is queued/running; no failure observed. Moved queue to `ci_wait`.
