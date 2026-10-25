# Implementation debrief

**STATUS: READY.** Base `release_25.1` (`74f52289d82`), head `386a1c925b0`, fork `jmchilton/issue_24438_select_comma_split_25.1`. Fixes [#24438](https://github.com/galaxyproject/galaxy/issues/24438).

**Commits**
1. `82a6d15cf4e` Baseline tests - ftpfile comma-split unit test; `select_comma_value.xml` framework tool with `value_json` list cases for a multiple select with comma option values (all pass on base).
2. `d5ad8013146` Fix - `verify/parse.py` `_test_value_as_list`: legacy test parsing comma-splits only `data` and multiple inputs (`ftpfile` defaults multiple); other values wrapped as `[value]`. Covers plain params and conditional discriminators. Framework cases for single select via `value=`/`value_json=` and conditional `when` with commas - fail on base with the issue's exact error.
3. `30baf371bf0` Linter - `TestsParamMultipleSelectCommaOptions` warns on `value=` for a multiple select with comma option values when the split parts aren't all option values/labels; skips short names shared by several inputs; reuses `inputs._iter_param`.
4. `386a1c925b0` Docs - `galaxy.xsd` select test-param docs: single select takes comma values verbatim; multiple select needs a `value_json` list.

**Choices**
- Fix A from the posted root cause (narrow the split) over moving tests off the legacy API (impossible on 25.1).
- Re-scoped once (scope eval 1) to add linter + docs; original scope kept as `issue_24438_select_comma_split_25.1_alt_original_scope`. Scope eval 2: keep as implemented. Its decomposition section lists 1-3 PR splits if wanted; the linter is the piece to drop for a smaller PR.
- Reviews caught: ftpfile implicit multiple (codex 1); linter false positives - comma-free values, `multiple="True"`/argument-only names (review 2), shared short names, ordinary-option selections (codex 2); nameless-param crash and empty `value=""`.

**Validation**
- Units (`test_tool_linters.py`, `test_test_definition_parsing.py`, `test_parameter_test_cases.py`): 103 passed, 1 skipped.
- Framework `select_comma_value` + `multi_select`: 6 passed; wider select/conditional/section framework set 86 passed at the fix stage.
- Full `test/unit/tool_util` earlier: only conda-resolution / CWL env failures (unrelated to touched code; not compared against base).
- mypy clean for touched files.

**Forward-merge to dev**: add `hidden_data` to the split gate; don't split `test_case_json` strings.

**Env note**: worktree `.venv` is a symlink to the `issue_24411_job_cache_identifier_25.1` worktree's venv.
