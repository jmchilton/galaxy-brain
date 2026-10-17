# issue_23978_parameter_tools_xsd — implementation debrief

**STATUS: READY.** Re-hardened 2026-10-16, with one re-scope. Fixes galaxyproject/galaxy#23978. Still stacked on `issue_18642_framework_tool_coverage` (`f66d1f0f97d`). Head is `04034197ef7` on the `jmchilton` fork, force-pushed; no PR is open.

## Commits
1. `977e2f3971a` fixes pre-existing CI script bugs. The XSD lint path was wrong (`tools/xsd` → `tool_util/xsd`), and the lint's exit status was ignored, so it now fails fast. `ls | grep` became a shellcheck-clean glob plus `case` loop. The tool list is unchanged (310).
2. `8dcdee07d4b` fixes #23978. It edits the 14 tools that used `ext=` (5 now really restrict input formats) and adds 4 section/repeat `title`s. It adds `rules` to the XSD `ParamType` enum and to the linter test expectation, and CI now validates `parameters/*.xml` (410 tools).
3. `ab7999ce965` documents `rules`, `group_tag` and `directory_uri` in the XSD.
4. `04034197ef7` is the re-scope. The CI glob now covers every subdirectory one level down (`*/*.xml`), which adds 21 already-valid tools (431 total).

## What the re-harden did
- **Archived debriefs:** round 1 is in `earlier_drafts/2/`; the original recovery is in `earlier_drafts/1/`.
- **Round 1:**
  - **Test challenge:** no changes.
  - **Codex review:** clean.
  - **Thermo-nuclear review:** made the XSD lint fail fast.
  - **Baseline refactor:** split the pre-existing CI script fixes into commit 1.
  - **Scope evaluation:** recommended expanding, because the hand-maintained subdirectory list caused #23978.
- **Re-scope:** see [implementation_rescope_debrief.md](implementation_rescope_debrief.md). The original scope is kept as `issue_23978_parameter_tools_xsd_alt_original_scope` (`ab7999ce965`, pushed), which is an ancestor of HEAD. The normal review led to a comment fix and a narrower macro exclusion ([review](subagents/rescope_normal_review.md)).
- **Round 2 (fresh, all steps on the re-scoped branch):**
  - [Test challenge](test_challenges_debrief.md): no changes.
  - [Codex review](codex_review.md): clean.
  - [Thermo-nuclear review](thermo_nuclear_review.md): approved with no changes.
  - [Baseline refactor](baseline_refactor.md): history kept as is.
  - [Scope evaluation](scope_evaluation.md): **keep**.
  - Screenshots and E2E polish: not applicable, since there are no UI changes.

## Validation
- **CI script:** run with `common_startup.sh` stubbed, 431 ok / 0 not ok, exit 0.
- **Red checks:** an injected `ext=` in each subdirectory, at top level, or a missing `rules` enum value makes the run exit 1. A broken XSD path exits 1 before any tool is checked.
- **Linter test:** `test_tool_linters.py` passes (136). Against the parent's XSD it fails at the enum assertion.
- **shellcheck:** clean.
- **Not run:** the real `tox -e validate_test_tools`. CircleCI `validate_test_tools` on `04034197ef7` is the key check.

## For the PR description (not drafted)
- `validate_test_tools` now also XSD-checks the production tools reached through symlinks: `expression_tools/` and `for_tours/filtering.xml`.
- The parent PR has to open first. Until it merges, the compare shows its commits.

## Follow-ups (not folded in)
- The XSD `collection_type` pattern rejects `sample_sheet`, which core `sample_sheet_to_tabular.xml` uses. No upstream issue was found. It needs a decision on which nestings are legal.
- `ftpfile` is missing from the param type enum. Pair this with a unit test that the XSD enum matches the `parameter_types` keys.
