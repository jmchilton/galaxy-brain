# Implementation debrief

STATUS: READY - held for John's review before a PR.

Branch `issue_24219_foreign_collection_carry_26.1`, base `release_26.1` (`dbe4f2f7e41`), head `3147227b128` (pushed to `jmchilton`). Standalone backport of the 26.2 collection-input carry, split from the #24219 pin branch at John's request.

## Final implementation

- `DataCollectionToolParameter._carry_selected_hdca` (`basic.py`): a selected HDCA from another history is appended to `options["hdca"]` as `"(not in current history) <name>"`, `keep=True`, `column_definitions`; classified via `_classify_hdca` so a map-over-only selection keeps `map_over_type`.
- Tests: `test_build_collection_options_carries_other_history_selection`, `..._map_over_selection` (`test_tools.py`), `test_job_build_for_rerun_other_history_hdca_carried` (`test_jobs.py`); all red on base / previous head, green now.

## Choices

- Narrower than 26.2's condition (other-history only) - hidden is listed on 26.1, deleted never reaches `to_dict`.
- One carried entry per HDCA (direct preferred) - client keep-cache is keyed by id.
- No shared helper with `_carry_unresolved_inputs` - forward-merge friction on a stable branch; dev cleanup candidate.

## Hardening

- Normal review: acted on (rerun test, dropped dead `listify` loop, `keep` assertion); no review debrief written per policy.
- Test challenge: rerun test now cleans up its second history (`1293d18a69f`).
- Codex: map-over finding fixed (`87338280d79`).
- Thermo-nuclear: simplified subcollection pick (`3147227b128`).
- Baseline refactor: nothing to split. Scope evaluation: keep scope. No UI change, no screenshots.

## Tests run

`test_tools.py -k build_` 20 passed (+ `test_build_does_not_leak_hda_from_user_bundle`, fails identically on base); `test_jobs.py -k rerun` 7 passed; `test_data_parameters.py` 20 passed; black, ruff clean; mypy no errors in `basic.py`.
