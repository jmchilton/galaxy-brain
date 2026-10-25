# Re-scope debrief

Scope evaluation 1 recommended a modest expansion (Scope B): keep the parse fix, add `galaxy.xsd` docs and a lint warning for the remaining trap - `value=` on a *multiple* select whose option values contain commas (still split, by design).

- Original scope kept as `issue_24438_select_comma_split_25.1_alt_original_scope` (`6caf89ba51d`, pushed), described in `alts/original_scope.md`.
- `3e07ada26ac` - `TestsParamMultipleSelectCommaOptions` (warn) in `linters/tests.py`: multiple selects (`string_as_bool`, `_parse_name` names) with a comma in a static option value; warns per test `param` whose `value=` contains a comma. Linter count 142 -> 143. Unit fixture covers warn (`multiple="true"`, `multiple="True"` + argument-only) and no-warn (comma-free value, `value_json`, single select). Red before linter.
- `7b179cb9202` - `galaxy.xsd` select test-param docs (single select verbatim; multiple uses `value_json` list); `select_comma_value.xml` gains a multiple select with `value_json` list cases (two values and one) - pass end-to-end, confirming the docs (they'd pass on base too; they back the docs, not the fix).
- Normal review 2 found two linter bugs (false positive on comma-free values, narrow `multiple` check); both fixed red-to-green and folded in.
- Not done (scope eval): option-aware splitting (C), moving off the legacy API (D, impossible on 25.1). Dev forward-merge needs `hidden_data` in the split gate and no splitting of `test_case_json` strings (E).
- Pre-commit's trailing-whitespace hook rewrote an unrelated `galaxy.xsd` line; reverted and committed with `SKIP=trailing-whitespace`.

Tests: tool_util linters + parsing + parameter test cases 103 passed / 1 skipped; framework `select_comma_value` + `multi_select` 6 passed; mypy clean on touched modules.

History later restructured by test challenge 2 (`82a6d15cf4e` baseline, `d5ad8013146` fix incl. ftpfile, `3e07ada26ac` linter, `7b179cb9202` docs); the SHAs above are current except the alt.
