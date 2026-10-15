# invocation_missing_input_404

Status: `ci_wait` — draft [#24171](https://github.com/galaxyproject/galaxy/pull/24171) opened 2026-10-15 at John's request, title "[26.1] Fix 500 when invoking a workflow with a nonexistent dataset input", description verbatim from `pr_description.md`, head `99a44f7d604`. Implementation: READY. Base: `release_26.1` at `92e66c53394` (rebased 2026-10-15 from `dev` `c63ffc2ccae` at John's request; PR targets `release_26.1`).

Return HTTP 404 for nonexistent HDA, LDDA, library dataset, and history collection invocation inputs. Independent extraction from [issue_20900_invocation_validation](../issue_20900_invocation_validation/index.md).

[PR description](pr_description.md) · [PR titles](pr_titles.md) · [Polish debrief](polish_debrief.md) · [Checklist evaluation](checklist_evaluation.md) · [Implementation](implementation_debrief.md) · [Initial implementation](initial_implementation_debrief.md) · [Normal review](subagents/normal_review.md) · [Test challenge](test_challenges_debrief.md) · [Scope evaluation](scope_evaluation.md)

Commits: `23d6e5c1a2e` fix + tests, `99a44f7d604` adopts `_different_user_history` at 8 existing API test sites (head `99a44f7d604`; polished 2026-10-15; rebased from dev `570041b2d04`). Helper `_get_input_or_not_found` replaces 4 copies of the not-found guard. API tests: 4 nonexistent-input regressions (fail on `release_26.1` with 500/403/403/400, pass here), plus library-input (`ldda`/`ld`) and inaccessible-input (`hda`/`hdca`) controls that pass on base and branch; 9 pass with the valid-collection control.

Fork CI: on dev-based `570041b2d04` all green except `Test Galaxy packages` — unrelated mypy error in `galaxy/security/ssh_util.py:18` (untyped paramiko `publickey`). CI on `99a44f7d604` pending.
