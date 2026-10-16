# invocation_tool_compatibility

Status: `branches_implemented` (refreshed 2026-10-16).

Reject workflow-incompatible tools before creating histories or invocations, preserving existing missing-tool lookup behavior and diagnostics.

[Implementation](implementation_debrief.md) · [Initial implementation](initial_implementation_debrief.md) · [Normal review](subagents/normal_review.md) · [Test challenge](test_challenges_debrief.md) · [Scope evaluation](scope_evaluation.md) · [Code-quality review](thermo_nuclear_review.md)

Independent extraction from [issue_20900_invocation_validation](../issue_20900_invocation_validation/index.md), requested 2026-10-15. Pushed to the fork, reviewed and locally validated. Fork CI remains to be assessed.

## Morning refresh — 2026-10-16

Fork head `8c8c67e4ae55a913be660e8912fd87a752e6ad9c` has passing relevant server/API coverage. Python lint fails only isort in unchanged `test/unit/app/tools/test_expression_basics.py`; browser/startup jobs stop at Restore client cache before tests. These failures do not exercise the server-only change. Promoted to `branches_implemented` on diagnosed unrelated reds; browser cache misses are unexecuted tests, not passing browser coverage.

Requested failed-job reruns for diagnosed unrelated failures: [run 38813130255](https://github.com/jmchilton/galaxy/actions/runs/38813130255), [run 38813130369](https://github.com/jmchilton/galaxy/actions/runs/38813130369), [run 38813130522](https://github.com/jmchilton/galaxy/actions/runs/38813130522), [run 38813130130](https://github.com/jmchilton/galaxy/actions/runs/38813130130). All requests accepted; reruns are pending evidence, not passing results or recovered cache coverage.
