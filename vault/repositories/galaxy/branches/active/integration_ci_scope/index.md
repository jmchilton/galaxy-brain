# integration_ci_scope

Status: `branches_implemented_needs_ci`. Base: `dev`. Tip `ca6a99dd6d9`.

Fork CI on `c6d90c4f585` was red. Python linting failed on isort in `test/integration/conftest.py`, which was ours. Build-client failed because of the dev-wide dompurify lockfile break. On 2026-10-09, with John's OK, the branch was rebased onto dev cleanly, the isort fix was amended into the last commit, and the result was force-pushed as `ca6a99dd6d9`. Fork CI is pending.

Selects costly plugin suites from changed paths; helpers and guide live beside integration tests.

[Implementation](implementation_debrief.md) · [Initial implementation](initial_implementation_debrief.md) · [Scope evaluation](scope_evaluation.md) · [Test challenges](test_challenges_debrief.md) · [Tracking history](tracking_history.md)
