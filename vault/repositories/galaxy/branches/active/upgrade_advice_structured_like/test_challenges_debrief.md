# Test challenges debrief

Fresh pass over `test/unit/tool_util/upgrade/test_upgrade_advice.py` (only test file touched). Commit `Tighten upgrade advice tests` on branch (not pushed).

## Changes
- Dropped `test_find_all_uses_xpath`: tested private `_find_all` directly; the xpath fix is exercised behaviorally by 26.2 optional-boolean and `has_n_columns` tests (both would see nothing under the old hardcoded xpath). Removed `_find_all`/`_xml_tool_source` imports.
- Replaced `test_26_2_tool_is_supported`: fixture is profile 26.2 so advice was skipped before any separator check — duplicated `test_advice_skipped_for_tool_already_at_profile` and misnamed. New `test_26_2_tabular_assertion_with_separator` uses an inline profile-26.1 tool with/without `sep`; confirmed red against `7be0b105400` lib (pre-26.x advice).

## Kept (reasoning)
- All structured_like/26.0, 21.09 whitespace, 26.1 citation/empty-multiple, 26.2 boolean/tool-provided-metadata tests: behavioral via `advise_on_upgrade`, fail without branch changes at their own assertions (old code: no 26.x migrations / `<` profile skip / empty advice code). No mocks or SimpleNamespace.
- No baseline-tests commit on branch; nothing to check there.

## Layers
- No API/integration/E2E: upgrade advice is a tool_util library/CLI concern without UI or API surface on this branch.

## Results
- `pytest test/unit/tool_util/upgrade test/unit/tool_util/test_tool_linters.py test/unit/tool_util/test_parameter_test_cases.py`: 203 passed. black/isort clean (ruff not in .venv).
