# invocation_completion_action_validation

Status: `ready` — PR #24202 (draft at John's request, undrafted by John 2026-10-20) rebased 2026-10-23 onto `release_26.2` `d2d1dcd883c` (conflicted after #24209 merged), head `f972f92d536`; PR CI re-running.

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

Final local verification: **all 28 distinct selected API/unit cases have passing results**, plus **2 notification compatibility cases passed on the leading baseline-only commit**. Combined suite was 27 passed/1 upload timeout; isolated completion controls then passed 2/2 on both branch and baseline. The initial timeout occurred waiting for input data, before the completion behavior under test; recorded in the debrief, not counted as a passing run. Black/isort/whitespace and vault validation pass (0 errors, 15 advisory warnings). Final-head CI: 19 queued, 1 pending, 2 skipped, no observed failures. One strengthening round: nothing to add. No code/content changes during polish, no PR opened, no approval SHA/title assigned; human-read remains unchecked.

## Draft PR opened — 2026-10-16

John explicitly requested a draft. Opened [#24202](https://github.com/galaxyproject/galaxy/pull/24202) against `release_26.2` at head `ddfbb3b991c185779b0f4e200801d6f4d443d8c2`, using the first polished title: `[26.2] Validate completion actions and required export configuration before invocation`. Used `pr_description.md` verbatim, leaving the human-read item unchecked. Applied `kind/bug`, `area/workflows`, `area/API`; added no mentions. No code or history changes needed.

Final-head fork CI snapshot at creation: 16 queued, 4 pending, 2 skipped; no failures. API and integration coverage remain pending. **Keep this PR draft as explicitly requested by John; do not automatically undraft on green CI without a later instruction.** Authorization covers opening the draft at this SHA.

## CI diagnosis — 2026-10-19

- Test Galaxy packages (3.10, 3.14) fail collecting `packages/data/tests/data/datatypes/test_data.py`: `ModuleNotFoundError: galaxy.tools` from the `Conditional` import. Pre-existing on `release_26.2`; fixed by [`fix_data_package_tests_26_2`](../../merged/fix_data_package_tests_26_2/index.md) (#24213, merged 2026-10-17). Unrelated.

## Rebase — 2026-10-19

PR conflicted with `release_26.2` after #24169/#24197 merged. Rebased `ddfbb3b991c` → `67da46bcfed`. Conflicts were mechanical: adjacent new API tests in `test_workflows.py` (kept all), and in `WorkflowsService.invoke_workflow` the merged scheduler check sits next to `_check_on_complete` (kept both, scheduler check first). Ruff check and whitespace clean; no duplicate test names; no mypy errors in touched files.

## TICK — 2026-10-20

PR CI on `67da46bcfed` green (48 pass, 2 skipped), MERGEABLE. Draft at John's request, so left draft; moved to `draft_ready`.
