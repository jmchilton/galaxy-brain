# invocation_subworkflow_input_connections

Status: `branches_implemented` (refreshed 2026-10-16).

Reject disconnected required subworkflow inputs with HTTP 400 before creating histories or invocations, including nested step paths, while preserving optional and defaulted inputs.

[Implementation](implementation_debrief.md) · [Initial implementation](initial_implementation_debrief.md) · [Normal review](subagents/normal_review.md) · [Test challenge](test_challenges_debrief.md) · [Scope evaluation](scope_evaluation.md) · [Code-quality review](thermo_nuclear_review.md)

Independent extraction from [issue_20900_invocation_validation](../issue_20900_invocation_validation/index.md), requested 2026-10-15. Pushed to the fork, reviewed and locally validated. Fork CI remains to be assessed.

## Morning refresh — 2026-10-16

Fork head `50fe009221340b21ec685a50dbcbb6fcf29310f1` has passing relevant server/API coverage. Python lint fails only isort in unchanged `test/unit/app/tools/test_expression_basics.py`; browser/startup jobs stop at Restore client cache before tests. These failures do not exercise the server-only change. Promoted to `branches_implemented` on diagnosed unrelated reds; browser cache misses are unexecuted tests, not passing browser coverage.

Requested failed-job reruns for diagnosed unrelated failures: [run 38813555318](https://github.com/jmchilton/galaxy/actions/runs/38813555318), [run 38813555254](https://github.com/jmchilton/galaxy/actions/runs/38813555254), [run 38813555238](https://github.com/jmchilton/galaxy/actions/runs/38813555238), [run 38813555331](https://github.com/jmchilton/galaxy/actions/runs/38813555331), [run 38813555376](https://github.com/jmchilton/galaxy/actions/runs/38813555376). All requests accepted; reruns are pending evidence, not passing results or recovered cache coverage.
