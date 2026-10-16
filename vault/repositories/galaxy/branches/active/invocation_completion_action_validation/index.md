# invocation_completion_action_validation

Status: `branches_implemented` (refreshed 2026-10-16).

Reject unknown workflow completion-action names with HTTP 400 before creating histories or invocations, using the shared registered hook registry.

[Implementation](implementation_debrief.md) · [Initial implementation](initial_implementation_debrief.md) · [Normal review](subagents/normal_review.md) · [Test challenge](test_challenges_debrief.md) · [Scope evaluation](scope_evaluation.md) · [Code-quality review](thermo_nuclear_review.md)

Independent extraction from [issue_20900_invocation_validation](../issue_20900_invocation_validation/index.md), requested 2026-10-15. Pushed to the fork, reviewed and locally validated. Fork CI remains to be assessed.

## Morning refresh — 2026-10-16

Fork head `5a3307250474a7371ce3e734995186f7f54e84a8` has passing relevant server/API coverage. Python lint fails only isort in unchanged `test/unit/app/tools/test_expression_basics.py`; browser/startup jobs stop at Restore client cache before tests. Integration fails binding Docker port 8335 (address already in use); OpenAPI fails installing dependencies after network retries. These failures do not exercise the server-only change. Promoted to `branches_implemented` on diagnosed unrelated reds; browser cache misses are unexecuted tests, not passing browser coverage.

Requested failed-job reruns for diagnosed unrelated failures: [run 38812685308](https://github.com/jmchilton/galaxy/actions/runs/38812685308), [run 38812685284](https://github.com/jmchilton/galaxy/actions/runs/38812685284), [run 38812685658](https://github.com/jmchilton/galaxy/actions/runs/38812685658), [run 38812685259](https://github.com/jmchilton/galaxy/actions/runs/38812685259), [run 38812684944](https://github.com/jmchilton/galaxy/actions/runs/38812684944), [run 38812685213](https://github.com/jmchilton/galaxy/actions/runs/38812685213). All requests accepted; reruns are pending evidence, not passing results or recovered cache coverage.
