# invocation_subworkflow_input_connections

Status: `branches_ready_for_final_review` — polished 2026-10-16; human read pending.

Reject disconnected required subworkflow inputs with HTTP 400 before creating histories or invocations, including nested step paths, while preserving optional and defaulted inputs.

[Implementation](implementation_debrief.md) · [Initial implementation](initial_implementation_debrief.md) · [Normal review](subagents/normal_review.md) · [Test challenge](test_challenges_debrief.md) · [Scope evaluation](scope_evaluation.md) · [Code-quality review](thermo_nuclear_review.md)

Independent extraction from [issue_20900_invocation_validation](../issue_20900_invocation_validation/index.md), requested 2026-10-15. Pushed to the fork, reviewed and locally validated. Original CI evidence is historical; see the current polish handoff below.

## Morning refresh — 2026-10-16

Fork head `50fe009221340b21ec685a50dbcbb6fcf29310f1` has passing relevant server/API coverage. Python lint fails only isort in unchanged `test/unit/app/tools/test_expression_basics.py`; browser/startup jobs stop at Restore client cache before tests. These failures do not exercise the server-only change. Promoted to `branches_implemented` on diagnosed unrelated reds; browser cache misses are unexecuted tests, not passing browser coverage.

Requested failed-job reruns for diagnosed unrelated failures: [run 38813555318](https://github.com/jmchilton/galaxy/actions/runs/38813555318), [run 38813555254](https://github.com/jmchilton/galaxy/actions/runs/38813555254), [run 38813555238](https://github.com/jmchilton/galaxy/actions/runs/38813555238), [run 38813555331](https://github.com/jmchilton/galaxy/actions/runs/38813555331), [run 38813555376](https://github.com/jmchilton/galaxy/actions/runs/38813555376). All requests accepted; reruns are pending evidence, not passing results or recovered cache coverage.

## Polish — 2026-10-16

Base: `release_26.2` at `579ca73440d776002b7099538cef000838687d8e`. Final published head: `bdbbdfcd2cc8a2a80306d0d0f28aa9445c5e3768`.

[PR description](pr_description.md) · [Title options](pr_titles.md) · [Polish debrief](polish_debrief.md) · [Checklist evaluation](checklist_evaluation.md) · [One strengthening review](strengthening_review.md)

Conflict-free pre-polish rebase; every commit patch unchanged. Independent checklist and one strengthening round pass with no design decision or scope expansion. 10 focused API cases pass; formatting/whitespace checks pass. Workflow runtime unit suite: **194 passed, 1 skipped**. Fresh fork CI is pending. Human-read item remains unchecked; no SHA approval/title choice assigned and no PR opened.
