# invocation_completion_action_validation

Status: `branches_need_polish` — expanded-head polish in progress 2026-10-16; fork CI running without observed failures.

Reject unknown workflow completion-action names with HTTP 400 before creating histories or invocations, using the shared registered hook registry.

[Implementation](implementation_debrief.md) · [Initial implementation](initial_implementation_debrief.md) · [Normal review](subagents/normal_review.md) · [Test challenge](test_challenges_debrief.md) · [Scope evaluation](scope_evaluation.md) · [Code-quality review](thermo_nuclear_review.md)

Independent extraction from [issue_20900_invocation_validation](../issue_20900_invocation_validation/index.md), requested 2026-10-15. Pushed to the fork, reviewed and locally validated. Original CI evidence is historical; see the current polish handoff below.

## Morning refresh — 2026-10-16

Fork head `5a3307250474a7371ce3e734995186f7f54e84a8` has passing relevant server/API coverage. Python lint fails only isort in unchanged `test/unit/app/tools/test_expression_basics.py`; browser/startup jobs stop at Restore client cache before tests. Integration fails binding Docker port 8335 (address already in use); OpenAPI fails installing dependencies after network retries. These failures do not exercise the server-only change. Promoted to `branches_implemented` on diagnosed unrelated reds; browser cache misses are unexecuted tests, not passing browser coverage.

Requested failed-job reruns for diagnosed unrelated failures: [run 38812685308](https://github.com/jmchilton/galaxy/actions/runs/38812685308), [run 38812685284](https://github.com/jmchilton/galaxy/actions/runs/38812685284), [run 38812685658](https://github.com/jmchilton/galaxy/actions/runs/38812685658), [run 38812685259](https://github.com/jmchilton/galaxy/actions/runs/38812685259), [run 38812684944](https://github.com/jmchilton/galaxy/actions/runs/38812684944), [run 38812685213](https://github.com/jmchilton/galaxy/actions/runs/38812685213). All requests accepted; reruns are pending evidence, not passing results or recovered cache coverage.

## Polish — 2026-10-16

Base: `release_26.2` at `579ca73440d776002b7099538cef000838687d8e`. Final published head: `163b1b36f6f44bd9bae875f7fa396921fffa483e`.

[PR description](pr_description.md) · [Title options](pr_titles.md) · [Polish debrief](polish_debrief.md) · [Checklist evaluation](checklist_evaluation.md) · [One strengthening review](strengthening_review.md)

Conflict-free pre-polish rebase; every commit patch unchanged. Independent checklist and one strengthening round pass with no design decision or scope expansion. 3 focused API cases pass; formatting/whitespace checks pass. Workflow completion unit suite: **15 passed**. Fresh fork CI is pending. Human-read item remains unchecked; no SHA approval/title choice assigned and no PR opened.

## Revised scope — 2026-10-16

Validate required completion-hook configuration before creating invocation state. Published head `9f04be9b5ad7012178c1aac68f66f1894fa329f7`; [rescope handoff](implementation_rescope_debrief.md). Fresh normal/test/quality reviews completed; the second scope evaluation recommends KEEP. Original polished scope is preserved as `invocation_completion_action_validation_alt_original_scope` on the fork. New-head CI is pending; earlier polish/CI and draft PR prose above are historical and require reassessment against this changed head.

## Expanded-head polish — 2026-10-16

Current published head `ddfbb3b991c185779b0f4e200801d6f4d443d8c2`, actual base `release_26.2` at `579ca73440d776002b7099538cef000838687d8e`. Fetch/rebase confirmed already current. The fresh checklist found the two new notification acceptance cases needed a leading baseline-test commit; reordered mechanically into `993613b8a9e` (baseline), `8d60f4e6a09` (unknown-name guard), `ddfbb3b991c` (required export configuration). Final tree exactly matches prior expanded head `9f04be9b5ad`. Published only to jmchilton with an exact old-head force-with-lease. No code or behavior changes during polish.

Fresh independent checklist now passes all agent-answerable items; human-read remains unchecked. [Current description](pr_description.md) · [Titles](pr_titles.md) · [Labels](pr_tags.md) · [Checklist](checklist_evaluation.md) · [Strengthening review](strengthening_review.md) · [Polish debrief](polish_debrief.md). These supersede the old names-only polish evidence above. Fresh 28-case API/unit run and two-case baseline-only run are in progress. Black/isort/whitespace checks pass. Pre-reorder CI had no failures; workflow framework, OpenAPI, postgres units, main tools, converters, performance and mulled units passed while API/general units were running. New-head CI must be assessed separately.
