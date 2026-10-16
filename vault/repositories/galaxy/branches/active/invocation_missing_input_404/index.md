# invocation_missing_input_404

Status: `ready` (refreshed 2026-10-16).

Return HTTP 404 for nonexistent HDA, LDDA, library dataset, and history collection invocation inputs. Independent extraction from [issue_20900_invocation_validation](../issue_20900_invocation_validation/index.md).

[PR description](pr_description.md) · [PR titles](pr_titles.md) · [Polish debrief](polish_debrief.md) · [Checklist evaluation](checklist_evaluation.md) · [Implementation](implementation_debrief.md) · [Initial implementation](initial_implementation_debrief.md) · [Normal review](subagents/normal_review.md) · [Test challenge](test_challenges_debrief.md) · [Scope evaluation](scope_evaluation.md)

Commits: `23d6e5c1a2e` fix + tests, `99a44f7d604` adopts `_different_user_history` at 8 existing API test sites (head `99a44f7d604`; polished 2026-10-15; rebased from dev `570041b2d04`). Helper `_get_input_or_not_found` replaces 4 copies of the not-found guard. API tests: 4 nonexistent-input regressions (fail on `release_26.1` with 500/403/403/400, pass here), plus library-input (`ldda`/`ld`) and inaccessible-input (`hda`/`hdca`) controls that pass on base and branch; 9 pass with the valid-collection control.

Fork CI: on dev-based `570041b2d04` all green except `Test Galaxy packages` — unrelated mypy error in `galaxy/security/ssh_util.py:18` (untyped paramiko `publickey`). CI on `99a44f7d604` pending.

## Morning refresh — 2026-10-16

Previous-head upstream checks were green (one skipped check). Rebased without conflicts onto actual `origin/release_26.1`; every commit patch is unchanged by range-diff. Published `7778acc770c27a663de777dbc50122c68375b8ce` with exact old-head force-with-lease to jmchilton and marked the PR ready under standing authorization. New-head CI is pending; prior-head green is not new-head coverage.
