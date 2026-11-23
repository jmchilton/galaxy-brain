# Filtered findings — #24770 round 0

- **Collection-member flattening in `DatabaseOperationTool.check_inputs_ready`** (gx_risk_assessment; thermo_review note): disproved. `execute.py`'s `check_inputs_ready` hook reaches only `ModelOperationToolAction.check_inputs_ready`, which calls `_collect_inputs` and then `_collect_input_datasets`. That adds every `collection.dataset_instances` member to `inp_data` for HDCAs, DCE child collections and adapters. `HarmonizeTool` filters only the collection dict. `require_dataset_ok` now reports the actual failing member; base used a stale loop variable.
- **Failed-population inputs fall back to untracked replay** (gx_performance_challenger P3 2): pre-existing and the same as base. `replacement_for_connection` already fails the invocation for a connected HDCA whose population failed, before the tool's own checks run. The suggested option of passing FAILED ids as collection dependencies would still busy-loop, because the monitor treats `populated_state != NEW` as satisfied.
- **`ToolInputsNotOKException` `id: str` → `int`** (thermo_review P3 2; risk note): the change is correct and type-only. Asking to drop it is a nit.
- **`real_workflow_scheduler` readability** (gx_test_challenger P3 2): a preference nit in test scaffolding.
- **Module move without re-export** (gx_risk_assessment): `SchedulingDependencies` and `unpopulated_collection_dependencies` are new in the 26.2 cycle (absent from `release_26.1`). `DependencyType` and `SchedulingDependency` remain importable from `galaxy.workflow.modules`. Not actionable.
- **`auto`/`_sniff_` check now waits only on non-ready or paused unresolved members** (gx_risk_assessment): intended by the PR's commit "Wait on any unresolved collection member, not an arbitrary one". The default review checked it against `replacement_for_connection`'s paused handling.
- **One blocker per step defers noticing other failures** (gx_risk_assessment; default note): an explicit tradeoff in the PR description.
- **Untracked `ToolInputsNotReadyException` from other call sites** (gx_risk_assessment): disproved. All eight `ToolInputsNotReadyException(` raise sites under `lib/galaxy` pass `dependencies=`. They are in `tools/__init__.py`, `tools/actions/__init__.py`, `tools/execute.py` and `tools/parameters/meta.py`. The only remaining untracked case is failed population, filtered above.
- **Use adapter `dataset_instances` instead of `adapting`** (default P3 3, third bullet): would load every member HDA of a DCE's child collection into Python and bypass the SQL `LIMIT 1` search. The rest of that finding is kept as P3 4.

- P3 5 (`galaxy.exceptions` imports `galaxy.workflow`; thermo P2 2 + default P3 4) — addressed by author in `c44640e7442` (2026-11-10): dependencies moved to `ToolInputsNotReadyWithDependencies` in `galaxy.workflow.scheduling_dependencies`; our `8c1faccd7fa` dropped from `pr_24770_round_0_rev_1`.

## Trimmed by John

- 2026-11-10 Auto-extension wait test can't detect a wrong blocker. Discovered by gx_test_challenger via Claude Opus 5.5 at low.
- 2026-11-10 Monitor snapshot wakes on deletion, missing rows, and batching are untested. Discovered by gx_test_challenger via Claude Opus 5.5 at low.
- 2026-11-10 Element and adapter branches of the blocker search are unexercised. Discovered by gx_test_challenger via Claude Opus 5.5 at low.
