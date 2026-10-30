# Upgrade advisor: skip rule, `_find_all`, empty advice code, and string version comparison

- Area: lib/galaxy/tool_util/upgrade/__init__.py
- Found while: [[Component - Tool Profile Versions and Upgrade Advisor]]
- Galaxy SHA: 65e6daff
- Severity: low
- Fix in flight: draft PR #24524 (`upgrade_advice_structured_like`, head `cc649c94509`) fixes items 1-4, except the 23.0 xpath tag in item 1. Items 5-6 remain.

## Problem

1. `_find_all(tool_source, xpath)` (`:313-314`) ignores `xpath` and always runs `findall(".//data[@from_work_dir]")`. `ProfileMigration23_0` (`:229-234`) therefore loops over `from_work_dir` outputs, not text params. It emits `23_0_consider_optional_text` once for each such output (an output element has no `optional` attribute) and never for an actual text param. Fixing `_find_all` alone isn't enough. The 23.0 xpath is `.//input[@type='text']`, but tool XML declares params as `<param>`, so after the fix it matches nothing and the advice never fires. #24524 fixes `_find_all` but keeps this xpath, and leaves 23.0 untested.
2. `ProfileMigration21_09` (`:214-217`) calls `advice_collection.add("")` for a `from_work_dir` with surrounding whitespace. `""` isn't a key in `upgrade_codes_by_name`, so this raises `KeyError`. The code it should use, `21_09_fix_from_work_dir_whitespace`, exists in `upgrade_codes.json` and is never emitted.
3. `advise_on_upgrade` (`:290-296`) skips a migration only when `migration.to_version < initial_version`, so a tool already at a migration's profile still gets that migration's advice. A 24.2 tool gets `24_2_fix_test_case_validation`.
4. `ProfileMigration24_2` validates test cases with `use_latest_profile=True`, which `validate_test_cases_for_tool_source` hardcodes as `"26.1"` (`parameters/case.py:690-692`). 26.1-only failures, such as `value=""` on a multiple select, are reported as 24.2 must-fix advice.
5. Versions are compared as strings (`:284-296`): `initial_version > latest_supported_version`, `migration.to_version < initial_version`. That works for the canonical profiles Galaxy has shipped. `PROFILE_PATTERN` (`linters/general.py:26`) also accepts forms like `21.1` or `24.10`, and for those string order differs from the `packaging.Version` order the runtime gates use. `"21.09" < "21.1"` as strings, while `Version("21.1") < Version("21.09")`, so a `21.1` tool skips 21.09 advice even though runtime treats it as pre-21.09.
6. Migrations that loop, `ProfileMigration20_09` (once per collection `element_tests`) and `ProfileMigration23_0`, add the same code once per match with no message. The CLI prints identical advice several times.

## Evidence / repro

Read in code. The test module header (`test/unit/tool_util/upgrade/test_upgrade_advice.py:1-3`) lists `21_09_fix_from_work_dir_whitespace` and `23_0_consider_optional_text` as untested, which is how items 1 and 2 went unnoticed.

## Suggested fix

Land #24524 for items 1-4, and change the 23.0 xpath to `.//inputs//param[@type='text']` with a test. For item 5, compare with `packaging.version.Version`, as the runtime gates do. For item 6, pass a per-match message such as the output or param name, or deduplicate in `AdviceCollection.add`.
