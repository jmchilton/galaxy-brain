# Implementation rescope debrief

Scope eval (now `earlier_drafts/1/scope_evaluation.md`) recommended modest expansion. Original scope kept as alt `issue_24529_custom_build_fasta_history_26.0_alt_original_scope` @ `cef99a41ee1` (`alts/original_scope.md`).

Expanded (head `dacb7d38dd6`):
- `HistoryManager.history_for_conversion` (owned dataset history → active current → most recent active → None; compares `user_id`, no admin bypass) + `HistoryManager.get_converted_dataset(trans, dataset, ext)` resolving a history only when a conversion must actually run (else 400).
- `add_custom_builds`, `DatasetsService._get_or_create_converted` and `_search_features` route through it — fixes same API-key 500 on `GET /api/datasets/{id}/converted/{ext}`.
- `converted_ext` `encode_id=False`: fixes pre-existing double-encoded ids (public response change; no client callers).
- Cherry-pick of `a3cb32cd95d` (history/target_context through model dependency recursion), already on 26.2/dev.
- Tests: API `test_converted_ext_creates_conversion_in_dataset_history`, `test_converted_ext_without_history`, extended `test_custom_build_from_unowned_fasta`; unit `test_history_for_conversion`, backported `test_dependency_conversion_receives_target_context`.

Rescope review (`subagents/rescope_review_debrief.md`) found and fixed a regression: history was resolved before existing-conversion check (400 instead of 200/204 for already-converted datasets with no history).

Not fixed: tabix first call with deps still 500s; dbkeys/genomes/registry/model `convert_dataset` callers. Merge-forward: model hunk conflicts with `261d166f2ab` on 26.2 (take 26.2), drop re-added backported test there.
