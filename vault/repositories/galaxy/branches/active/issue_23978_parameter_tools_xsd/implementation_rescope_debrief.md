# Re-scope debrief: issue_23978_parameter_tools_xsd

Triggered by the re-harden scope evaluation (2026-10-16, now in `earlier_drafts/2/scope_evaluation.md`): modest expansion. #23978's root cause is a hand-maintained subdirectory list in `.ci/validate_test_tools.sh` — `parameters/` was never added. Listing `parameters/` alone leaves that trap, so the glob now covers every subdirectory one level down (`*/*.xml`).

- Original scope preserved as `issue_23978_parameter_tools_xsd_alt_original_scope` (`ab7999ce965`, pushed to `jmchilton`).
- New commit `04034197ef7`: glob `parameters/*.xml` → `*/*.xml`; macro exclusion → `*/macros.xml | *_macros.xml`. Adds 21 tools (`for_workflows/` 17, `expression_tools/` 2 via symlink to production tools, `deprecated/` 1, `for_tours/` 1), all already XSD-valid — no tool edits.
- Verified: stubbed CI run 431 ok / 0 not ok (was 410); injecting `ext="txt"` into `for_workflows/cat_list.xml` → `not ok`, exit 1 (previously unvalidated).
- Normal review: no must-fix; comment + macro-pattern + commit-message fixes applied ([review](subagents/rescope_normal_review.md)).
- Branch history also restructured during re-harden (baseline refactor): pre-existing CI-script fixes split into `977e2f3971a` ahead of the issue fix. Fork force-pushed (no PR open).

Follow-ups, not folded in (from scope evaluation): XSD `collection_type` pattern rejects `sample_sheet` (same class as `rules`, no test tool exercises it, no tracking issue found); XSD-validating production tools (43/202 fail) is far bigger than this issue.
