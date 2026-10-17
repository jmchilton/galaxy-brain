No refactoring of the base branch was performed.

Fresh pass, post re-scope (2026-10-16). Head stays `04034197ef7`. No rewrite, no push. View formed before reading `earlier_drafts/2/baseline_refactor.md`.

## Commits (unchanged, on base `f66d1f0f97d`)

1. `977e2f3971a` Fix validate_test_tools XSD lint path and fail fast on lint errors. Pre-existing CI defects. Behavior-preserving: same top-level tool list. Already the base-applicable piece, split out last round.
2. `8dcdee07d4b` Make framework parameters/ test tools XSD-valid and validate them in CI (Fixes #23978).
3. `ab7999ce965` XSD docs for rules/group_tag/directory_uri.
4. `04034197ef7` Re-scope: glob `*/*.xml`, macro exclusion `*/macros.xml | *_macros.xml`.

## Options considered for the subdirectory glob (`04034197ef7`)

- **Fold into `977e2f3971a`: rejected.** At the base, `*/*.xml` picks up `parameters/` tools, which are not valid yet. Staying green would need a temporary `*/parameters/*` exclusion arm that exists only to be deleted in the fix commit. That is the same hand-maintained-list pattern the re-scope removes. It would also turn `977e` from behavior-preserving (same files) into a coverage expansion (+21 tools), so it would no longer be a refactor.
- **Fold into `8dcdee07d4b`: rejected.** It would be green, since the other subdirs are already valid at the base, and it would save 2 script lines that get written and then rewritten. The costs:
  - `issue_23978_parameter_tools_xsd_alt_original_scope` (`ab7999ce965`) is currently an ancestor of HEAD, so contracting scope is just "drop the last commit". Scope is still John's call, and folding destroys that.
  - SHAs cited in the fresh codex, thermo-nuclear, test-challenge and re-scope debriefs would go stale.
  - The trailing commit is 5 lines, and its message carries the root-cause rationale on its own.
- **Move the glob ahead of `ab7999ce965`: rejected.** It breaks the same ancestry, and the docs commit belongs next to the enum change.
- **Move the `rules` enum + linter-test update onto the base: rejected.** It would be green there, because the base doesn't validate `parameters/`. But it is part of the #23978 fix, not a refactor, and splitting it has the same SHA and ancestry costs.

## Checks

No commits rewritten, so no new per-commit runs. Existing evidence for these exact SHAs:

- `977e`/`8dcd`/`ab79`: last round's per-commit table. Shellcheck clean; XSD validation 310 / 410 / 410 ok; 136 linter tests passed.
- `04034197ef7`: test challenge stubbed CI run, 431 ok / 0 not ok, plus red checks per subdir.
- Re-confirmed now: worktree clean at `04034197ef7`, `shellcheck .ci/validate_test_tools.sh` clean.

## Notes

- `issue_23978_parameter_tools_xsd_pre_baseline_refactor` (local backup from last round, old head `935eee9c5f2`) still exists. Left alone.
- Compared with `earlier_drafts/2/baseline_refactor.md` (read afterwards): that round did the only worthwhile base split (CI-script fixes into `977e`). The re-scope commit doesn't change that conclusion.
