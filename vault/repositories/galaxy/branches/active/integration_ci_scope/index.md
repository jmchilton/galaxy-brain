# integration_ci_scope

Status: `branches_implemented_needs_ci`. Base: `dev`. Tip `ca6a99dd6d9`.

Fork CI on `c6d90c4f585` was red. Python linting failed on isort in `test/integration/conftest.py`, which was ours. Build-client failed because of the dev-wide dompurify lockfile break. On 2026-10-09, with John's OK, the branch was rebased onto dev cleanly, the isort fix was amended into the last commit, and the result was force-pushed as `ca6a99dd6d9`. Fork CI is pending.

Selects costly plugin suites from changed paths; helpers and guide live beside integration tests.

[Implementation](implementation_debrief.md) · [Initial implementation](initial_implementation_debrief.md) · [Scope evaluation](scope_evaluation.md) · [Test challenges](test_challenges_debrief.md) · [Tracking history](tracking_history.md)

## TICK — 2026-10-11

Current fork integration-Selenium fails collection with `ModuleNotFoundError: integration_selenium.integration_selection_pytest`; the selection plugin/import is this branch’s change, so CI is not greenish. Docker-pull failures in eight unrelated workflows and the fork release-script failure were rerun. Playwright workflow-input/history-list timeouts remain separate. No promotion or code fix undertaken by TICK.

## TICK — 2026-10-12

Requested failed-job reruns for the recorded unrelated failures: [run 37976218891](https://github.com/jmchilton/galaxy/actions/runs/37976218891). All requests were accepted; this does not claim a passing rerun or recover an evicted client cache/artifact.
