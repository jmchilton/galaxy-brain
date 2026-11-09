# #24770 performance challenges review

Profile: [gx_performance_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_performance_challenger.md) · Claude Opus 5.5 · low effort · reviewed `8ec2452c3bb`.

**Verdict:** this is a clear performance win, with no blocking issues. It replaces a full workflow replay on every monitor pass with one PK-indexed lookup per pass. The new collection query (`blocking_dataset`) reuses the nested-collection builder with `LIMIT 1` and no `ORDER BY`. The check-inputs path walks HDAs that are already loaded, and `HDA.dataset` is joined-eager, so there is no N+1. Nothing was measured; the finding below comes from reading the code. Details and a measurement plan are in [performance_challenges_debrief.md](performance_challenges_debrief.md).

### P3 1: Any non-ready state transition of the blocker wakes a full replay

`ReadinessSnapshot` stores the exact effective state. `_any_dependency_satisfied` reschedules on any snapshot difference, so a blocker moving new→queued→running→setting_metadata→ok causes 3 or more replays that only re-delay on the same blocker. No caller (`require_terminal_states`, `KeepSuccessDatasetsTool` `is_pending`, auto-extension wait) treats those non-ready states differently. With one blocker per step, the wasted replays grow with collection size.

Suggested fix: normalize states in `Dataset.non_ready_states` to a single sentinel, both when building the snapshot (`dataset_readiness`, `blocking_dataset`) and when comparing it in `scheduling_manager._any_dependency_satisfied`. PAUSED, terminal states, extension and deleted flags would still wake the step. This is speculative and unmeasured; the debrief describes a replay-count comparison.

### P3 2: Failed-population inputs still fall back to replaying every pass

At the touched raise sites (`DatabaseOperationTool.check_inputs_ready`, `execute._resolve_collection_ref`, `meta.__expand_collection_parameter`), the condition is `not populated_optimized`, which is also true for `FAILED` population. The dependencies come from `unpopulated_collection_ids()`, which returns only `NEW` collection ids. A failed-population input therefore raises `ToolInputsNotReadyException` with no dependencies. `record_delay` then files it as untracked, and the invocation replays on every pass until the maximum duration. This is a coverage gap, not a regression: base behaves the same.

Suggested fix: either fail the step when population is `FAILED` (it can never become ready), or return the failed collection ids as `DATASET_COLLECTION` dependencies so the replay stops. The first option matches the "reject what can never work" preference.
