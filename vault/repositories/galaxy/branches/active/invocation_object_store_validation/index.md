# invocation_object_store_validation

Status: `branches_need_polish` — polish started 2026-10-16.

Reject invalid workflow object-store preferences with HTTP 400 before creating a target history; preserve valid single-store and split-store selections.

[Implementation](implementation_debrief.md) · [Initial implementation](initial_implementation_debrief.md) · [Normal review](subagents/normal_review.md) · [Test challenge](test_challenges_debrief.md) · [Scope evaluation](scope_evaluation.md)

Independent extraction from [issue_20900_invocation_validation](../issue_20900_invocation_validation/index.md), requested 2026-10-15. Pushed to the fork, reviewed and locally validated. Fork CI remains to be assessed.

## Morning refresh — 2026-10-16

Fork head `f862f9f9f4dbb6732834591da053c42ba48afbce` has passing relevant server/API coverage. Python lint fails only isort in unchanged `test/unit/app/tools/test_expression_basics.py`; browser/startup jobs stop at Restore client cache before tests. The fork release-script test rejects historical master VERSION_MINOR = None; this branch changes no release/version code. These failures do not exercise the server-only change. Promoted to `branches_implemented` on diagnosed unrelated reds; browser cache misses are unexecuted tests, not passing browser coverage.

Requested failed-job reruns for diagnosed unrelated failures: [run 38812270827](https://github.com/jmchilton/galaxy/actions/runs/38812270827), [run 38812270878](https://github.com/jmchilton/galaxy/actions/runs/38812270878), [run 38812270805](https://github.com/jmchilton/galaxy/actions/runs/38812270805), [run 38812270720](https://github.com/jmchilton/galaxy/actions/runs/38812270720), [run 38812270932](https://github.com/jmchilton/galaxy/actions/runs/38812270932), [run 38812271028](https://github.com/jmchilton/galaxy/actions/runs/38812271028). All requests accepted; reruns are pending evidence, not passing results or recovered cache coverage.
