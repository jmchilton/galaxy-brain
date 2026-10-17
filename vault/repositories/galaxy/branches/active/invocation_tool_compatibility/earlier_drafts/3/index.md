# invocation_tool_compatibility

Status: `branches_need_polish` — fresh polish of the revised scope started 2026-10-17.

Reject workflow-incompatible tools before creating histories or invocations, preserving existing missing-tool lookup behavior and diagnostics.

[Implementation](implementation_debrief.md) · [Initial implementation](initial_implementation_debrief.md) · [Normal review](subagents/normal_review.md) · [Test challenge](test_challenges_debrief.md) · [Scope evaluation](scope_evaluation.md) · [Code-quality review](thermo_nuclear_review.md)

Independent extraction from [issue_20900_invocation_validation](../issue_20900_invocation_validation/index.md), requested 2026-10-15. Pushed to the fork, reviewed and locally validated. Original CI evidence is historical; see the current polish handoff below.

## Morning refresh — 2026-10-16

Fork head `8c8c67e4ae55a913be660e8912fd87a752e6ad9c` has passing relevant server/API coverage. Python lint fails only isort in unchanged `test/unit/app/tools/test_expression_basics.py`; browser/startup jobs stop at Restore client cache before tests. These failures do not exercise the server-only change. Promoted to `branches_implemented` on diagnosed unrelated reds; browser cache misses are unexecuted tests, not passing browser coverage.

Requested failed-job reruns for diagnosed unrelated failures: [run 38813130255](https://github.com/jmchilton/galaxy/actions/runs/38813130255), [run 38813130369](https://github.com/jmchilton/galaxy/actions/runs/38813130369), [run 38813130522](https://github.com/jmchilton/galaxy/actions/runs/38813130522), [run 38813130130](https://github.com/jmchilton/galaxy/actions/runs/38813130130). All requests accepted; reruns are pending evidence, not passing results or recovered cache coverage.

## Polish — 2026-10-16

Base: `release_26.2` at `579ca73440d776002b7099538cef000838687d8e`. Final published head: `27e7daa34344d1a99066102e57dd45e894acac41`.

[PR description](pr_description.md) · [Title options](pr_titles.md) · [Polish debrief](polish_debrief.md) · [Checklist evaluation](checklist_evaluation.md) · [One strengthening review](strengthening_review.md)

Conflict-free pre-polish rebase; every commit patch unchanged. Independent checklist and one strengthening round pass with no design decision or scope expansion. 5 focused API cases pass; formatting/whitespace checks pass. Fresh fork CI is pending. Human-read item remains unchecked; no SHA approval/title choice assigned and no PR opened.

## Revised scope — 2026-10-16

Deduplicate identical nested tool references while retaining distinct versions and UUIDs. Published head `77fe189f505160101d2d087248ad83c645aeb220`; [rescope handoff](implementation_rescope_debrief.md). Fresh normal/test/quality reviews completed; the second scope evaluation recommends KEEP. Original polished scope is preserved as `invocation_tool_compatibility_alt_original_scope` on the fork. New-head CI is pending; earlier polish/CI and draft PR prose above are historical and require reassessment against this changed head.
