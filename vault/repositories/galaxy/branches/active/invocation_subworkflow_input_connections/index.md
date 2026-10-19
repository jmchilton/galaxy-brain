# invocation_subworkflow_input_connections

Status: `draft_ready` — draft PR #24203 opened at John's explicit request on 2026-10-16; PR CI greenish (unrelated reds, see CI diagnosis); undraft is John's call.

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

## Revised scope — 2026-10-16

Report partial and wholly disconnected required subworkflow inputs consistently at runtime. Published head `14584e545aebf88552d7204ae165125b77fc3234`; [rescope handoff](implementation_rescope_debrief.md). Fresh normal/test/quality reviews completed; the second scope evaluation recommends KEEP. Original polished scope is preserved as `invocation_subworkflow_input_connections_alt_original_scope` on the fork. New-head CI is pending; earlier polish/CI and draft PR prose above are historical and require reassessment against this changed head.

## Draft PR opened — 2026-10-16

John explicitly requested a draft. Opened [#24203](https://github.com/galaxyproject/galaxy/pull/24203) against `release_26.2` at published head `14584e545aebf88552d7204ae165125b77fc3234`, title `[26.2] Validate required subworkflow connections and report runtime gaps consistently`. Before publication, refreshed the stale original-scope description for the current runtime diagnostic expansion and current implementation test evidence (10 API cases; 197 workflow units, 1 skipped; independent workflow-progress module 12 passed). Preserved John's existing checked human-read item. No code changes or new polish round implied.

Posted current `pr_description.md` verbatim with `kind/bug`, `area/workflows`, `area/workflows/subworkflows`, `area/API`; no mentions. Updated title options and labels to reflect the complete current scope. Fork CI at creation: 13 passing workflows including API, unit, Python lint and workflow framework; 7 queued, 2 skipped; no failures. Remaining queued coverage is not a pass. **Keep this PR draft as explicitly requested by John; do not automatically undraft on green CI without a later instruction.** Authorization covers opening the draft at the recorded SHA.

## CI diagnosis — 2026-10-19

- Test Galaxy packages (3.10, 3.14) fail collecting `packages/data/tests/data/datatypes/test_data.py`: `ModuleNotFoundError: galaxy.tools` from the `Conditional` import. Pre-existing on `release_26.2`; fixed by unmerged [`fix_data_package_tests_26_2`](../fix_data_package_tests_26_2/index.md). Unrelated.
- Tool framework (`never`): `shapefile_composite/1.0.0-0` timed out and output display returned 400. Branch touches workflow run code only. Unrelated; failed job rerun.
