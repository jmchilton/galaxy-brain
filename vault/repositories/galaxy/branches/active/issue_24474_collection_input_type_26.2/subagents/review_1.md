# Normal review 1

Run via Opus (general-purpose subagent) at default effort, over the baseline and fix commits (`4a936050c47`, `6f134224fc6`).

I acted on every finding except the reuse nit. The one medium finding exposed a real regression. The step-parameter path the legacy workflow run form uses (`test_run_map_over_with_step_parameter_dict`) sends a `list:paired` runtime value to a `paired` input and relies on the invocation mapping over it. The new check rejected that, as the workflow API run that ran alongside the review showed. Fixed by `allow_map_over`: `check_param(..., allow_collection_map_over=True)` is set only for workflow runtime step updates. Values there may also be collections the parameter can map over. Unmappable ones are still rejected with a 400 when the invocation is requested ("Error computing workflow step runtime state"), as `test_run_step_parameter_dict_rejects_incompatible_collection` shows.

- **Late job failure for untyped/mismatched workflow edges (medium):** documented, not prevented. Added `test_untyped_collection_input_incompatible_with_tool_fails_job`. It pins the current outcome: the invocation schedules, `map_over.py` passes the list through, and the job fails at job preparation with the new message in the output's `misc_info`. Before the fix the job ran with the wrong structure. Rejecting at scheduling time in `map_over.py` is a follow-up.
- **Batch truthiness (low):** now `bool(value.get("batch"))`, mirroring `meta.py`.
- **Batch skip unit coverage (low):** added `test_from_json_skips_unexpanded_batch_value` and `test_from_json_checks_non_batch_values_dict`.

Not acted on:

- **Reuse `HistoryQuery.direct_match`:** it takes an HDCA-like object, and DCEs and adapters would need a shim. The three-line loop calls the same `accepts()`, so the form and run-time checks stay consistent.
- **Dataset-only DCE and default values skip the check:** left alone, as the reviewer agreed. Defaults are chosen by the tool author, and the DCE behaviour is unchanged from before.

<details><summary>Full review</summary>

Overall the fix is sound and narrow. No blocking defects; no security concerns. Unit tests pass (22). ruff/black clean; mypy reports nothing new for `basic.py`.

1. Medium: runtime/workflow behavior change not covered. `lib/galaxy/tools/evaluation.py:206` (`_validate_incoming`) runs `from_json` at job prep for every job. In workflows, `lib/galaxy/workflow/map_over.py:82-102` passes a replacement collection straight through when it neither direct-matches nor can map over (e.g. an untyped workflow collection input receiving a `list` feeding a `paired` tool input). Previously such jobs ran with the wrong type; now the job fails at prep. The only workflow-side `check_param` is `modules.py:735` (runtime `step_updates`). Suggest documenting and adding a workflow API test, or rejecting at scheduling in `map_over.py` as a follow-up.
2. Low: batch detection differs from `meta.py` (`is True` vs truthy). The `__class__ == "Batch"` arm looks unreachable today but is a harmless guard.
3. Low: no unit test for the batch skip; suggest a pair of batch / non-batch dict tests.
4. Nit: `HistoryQuery.direct_match` is the same loop but needs an HDCA-like; hand-written loop acceptable.
5. Nit: dataset-only DCE and defaults skip the check. Fine.

Verified fine: legacy `/api/tools` expansion before `populate_state`, async tool requests, rerun (`to_json(job=...)` stores sub-collection DCEs), workflow editor mode early return, adapters' declared types, `accepts()` semantics (sample_sheet into list, paired into paired_or_unpaired, list/list:paired into list:paired_or_unpaired, sample_sheet asymmetry), placement in `from_json`, error message, and baseline/fix commit split.

</details>
