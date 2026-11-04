# issue_20900_invocation_validation — rebase handoff

STATUS: BLOCKED for upstreaming the full validation change. The requested rebase is COMPLETE and published; inherited request-validation regressions remain.

John requested incorporation of all four polished fixes while keeping those branches independent, plus advice on further splits. Published head: `07377e105318f426e30c1299e972baf10dc7c3db`. Current dev base: `88127f42979`. Original `9b18c329c8f` is preserved locally at `backup/issue_20900_before_polished_rebase_20261015`.

## Reconciliation

Ported nine polished commits individually onto dev at integration base `55a8da51904`, replayed the original thirteen commits, then added two reconciliation commits. The four branches target different releases, so their changes were ported without bringing their release histories into dev. All four source refs remain unchanged: input-copy `33be985c49e`, expected failure `1f3a2434e97`, missing inputs `99a44f7d604`, scheduler `56a8ac23045`.

Includes the input-copy branch's widened schema description, request-type generator and null/empty ds_map fixes, expected-failure branch's runtime step-ID correction, and polished missing/access/library input and scheduler regressions. Preserves current dev's injected scheduler manager, multiple text/integer/float normalization and numeric list rules. Removes a redundant per-entry override and duplicate scheduler test, restoring imports needed by newer dev tests. No tests weakened.

## Validation

- Workflow units and parameter doctests: 209 distinct passed, 1 skipped after import restoration. Initial eight failures were missing test imports from the replayed migration; affected module rerun: 89 passed.
- Landing-manager units: 8 passed.
- Schema-generator Vitest: 3 passed.
- Workflow API selection: 72 passed, 4 failed, 385 deselected. All polished extraction API cases passed.
- Installed commit hooks, compile checks and diff whitespace checks passed. Independent normal review and focused test challenge found no actionable reconciliation regression.

Four failures were already recorded on original head in [tracking history](tracking_history.md):

- `test_workflow_resume_with_mapped_over_collection_input`: valid list:list:paired → mapped list rejected (400).
- `test_mapping_and_subcollection_mapping`: valid list:paired → mapped list rejected (400).
- `test_workflow_rerun_with_use_cached_job_hides_output`: 500.
- `test_run_replace_params_over_default`: 500.

These remain blockers; do not promote the full branch as green. The rebase does not resolve them. Original framework/browser/integration failure records remain relevant; broader suites were not rerun. Fresh fork CI has not been assessed.

Logs: `/private/tmp/issue20900-rebase-api.log`, `/private/tmp/issue20900-rebase-unit.log`, `/private/tmp/issue20900-rebase-modules-green.log`, `/private/tmp/issue20900-rebase-landing.log`, `/private/tmp/issue20900-rebase-generator.log`.

## Scope and handoff

[Four further split candidates](remaining_split_candidates.md): object-store IDs, completion actions, incompatible tools, disconnected subworkflow inputs. No further extraction or PR created. Requested rebase scope is unchanged; deeper validation repairs and further extractions remain separate choices. Main branch is parked under `branches_need_decision` because inherited regressions remain. Existing narrow-branch reviews still apply to their unchanged heads; integration validation is recorded above, while full green CI and the inherited regressions remain unresolved.

[Reconciliation notes](rebase_reconciliation.md) · [Independent review](subagents/rebase_normal_review.md) · [Test challenge](test_challenges_debrief.md) · [Scope evaluation](scope_evaluation.md) · [Previous implementation](earlier_drafts/1/implementation_debrief.md)
