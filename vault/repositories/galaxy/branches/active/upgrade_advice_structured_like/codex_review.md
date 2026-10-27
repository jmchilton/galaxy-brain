# Codex review

Acted on all three findings; each confirmed and fixed red→green with a test in `test/unit/tool_util/upgrade/test_upgrade_advice.py` (commits 2623f0816a7, 9e99e694935, 1b951469a3d, unpushed).

Not acted on:
- Advisor previously also matched `galaxy.json` in any `configfiles/*` body text; shared helper uses the linter's semantics (command text or `configfile filename="galaxy.json"`) so that heuristic was dropped. No test covered it.
- `writes_galaxy_json` in `linters/_util.py` left unannotated like neighbors (`is_datasource`).

<details>

1. **P1 24.2 validates at latest profile** - CONFIRMED. `upgrade/__init__.py:262` used `use_latest_profile=True` (= "26.1", `parameters/case.py:692`), so a 24.0 tool with empty multiple-select `value=""` got `24_2_fix_test_case_validation` when targeting 24.2. Fix: `profile="24.2"`. Now that failure only shows as `26_1_fix_empty_multiple_test_value`, matching the 26.1 advisor comment. Existing `test_24_2_test_case_validation` (column_param) still passes. Test: `test_24_2_validates_at_target_profile`.
2. **P2 26.0 structured_like ignores param type** - CONFIRMED. `upgrade/__init__.py:~278` comprehension filtered only `in_repeat`; linter `output.py:367` requires data/data_collection. Fix: new `InputReference.is_dataset_input` property (`linters/_util.py`), used by both linter and advisor. Test: `test_26_0_non_data_reference_not_advised`.
3. **P2 `_writes_galaxy_json` misses configfile filename** - CONFIRMED. It only checked element text; linter `_has_tool_provided_metadata` (`output.py:~434`) checks `configfile[@filename='galaxy.json']`. Fix: moved shared `writes_galaxy_json(tool_xml)` to `linters/_util.py`; linter helper keeps its `outputs` attribute check and delegates; advisor's private copy removed. Test: `test_26_2_tool_provided_metadata_configfile`.

Tests: upgrade + test_tool_linters + test_parameter_test_cases: 206 passed.
</details>
