# invocation_subworkflow_input_connections

Status: `ci_wait` — draft PR #24203 (draft at John's request) rebased onto `release_26.2` 2026-10-19, head `2de0931ac07`; fresh CI running.

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

- Test Galaxy packages (3.10, 3.14) fail collecting `packages/data/tests/data/datatypes/test_data.py`: `ModuleNotFoundError: galaxy.tools` from the `Conditional` import. Pre-existing on `release_26.2`; fixed by [`fix_data_package_tests_26_2`](../../merged/fix_data_package_tests_26_2/index.md) (#24213, merged 2026-10-17). Unrelated.
- Tool framework (`never`): `shapefile_composite/1.0.0-0` timed out and output display returned 400. Branch touches workflow run code only. Unrelated; failed job rerun.

## Rebase — 2026-10-19

PR conflicted with `release_26.2` after #24171 merged. Rebased `14584e545ae` → `2de0931ac07`; one mechanical conflict in `run_request.py` (#24171's `_get_input_or_not_found` and this branch's `_step_name`/`_validate_subworkflow_input_connections` added at the same spot), kept both. Ruff clean, `test_workflow_progress.py` 12 passed, no mypy errors in `run_request.py`.

## TICK — 2026-10-20

PR CI on `2de0931ac07`: one red, API tests `test_workflows.py::TestWorkflowsApi::test_parameter_substitution_sanitization` (`409001` "dataset ... is new and has no data"). Looks like a dataset-ready race, but it is a workflow API test and this branch changes workflow runtime, so it is **unconfirmed unrelated** until seen failing on base or another PR. Failed job rerun ([run 39302416630](https://github.com/galaxyproject/galaxy/actions/runs/39302416630)); stays `ci_wait`.

## CI check — 2026-10-22

PR CI green on `2de0931ac07`. John asked to undraft green `ci_wait` drafts; held draft per the standing instruction above pending his explicit call.
