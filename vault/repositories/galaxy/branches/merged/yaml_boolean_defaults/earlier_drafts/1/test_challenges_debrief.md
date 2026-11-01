# yaml_boolean_defaults — test challenges debrief

Branch tests challenged per `_shared/GX_PROCESS_CHALLENGE_TESTS.md` against `origin/release_26.1` (merge-base `6df388987b4`). Acted on: merged duplicate disk/user test pairs, strengthened positional lookups, fixed fixture-scope docs drift, split pre-existing-behavior tests into a "Baseline tests" commit, and rebuilt history into red/green pairs. Old tip `10b52988704`, new tip `f3a6eb7a05f` (needs force-push).

## Unit tests

None. The branch has no `test/unit` changes. The original matrix was already replaced by the API suite. Nothing to drop, rewrite, or de-mock.

## API tests (`lib/galaxy_test/api/test_user_tool_contract.py`)

- **Merged duplicates.** `test_user_boolean_contract` + `test_disk_boolean_contract` and `test_user_conditional_contract` + `test_disk_conditional_contract` became `test_boolean_contract` and `test_conditional_contract`. Each is parametrized over the three load paths (disk / API YAML / API JSON) through the existing `loaded_tool` fixture and `RequiredTool.build()`. Same 18 cases, with less code and without the `_assert_*` helpers.
- **Strengthened.** `test_disk_checked_compatibility` now looks inputs up by name rather than `inputs[0]`/`inputs[1]`, and uses `required_tool.build()` instead of a direct `build_tool_state` call.
- **Helpers.** The module makes no raw HTTP calls. Build, create and runtime-model go through populator `*_raw`/convenience pairs, and every endpoint call has a single helper. No new helpers were needed.
- **Kept as is.** Strict xfails for structural repeat/section accept only HTTP 500 via a dedicated exception. `test_user_checked_is_rejected` checks all three endpoints.

## Docs

`doc/source/dev/writing_tests.md` listed `galaxy_interactor`/`dataset_populator` as session-scoped. The branch made them function-scoped. The table and example were corrected, a one-line explanation was added, and a `user_tool` row was added. Prettier and trailing-whitespace hooks were skipped while building the rebuilt commits. Rerunning both over the branch range modified only `writing_tests.md`, rewriting unrelated pre-existing lines across the whole document. Those changes were reverted.

## Red/green check

All 8 production files were reverted to the merge-base, with test infrastructure kept. Result: 35 failed, 11 passed, 4 xfailed. Every failure was at a test assertion (`False is True`, `None is False`, `True is False`, or the `{'flag': False}` vs `None` JSON check), not at a missing helper.

- **Pass at base (whole function), moved to the baseline commit:** `test_user_checked_is_rejected` and `test_user_structural_contract` (strict xfail at base too).
- **Mixed (kept with their change; not split per case):**
  - `test_omitted_optionality`: the api-yaml/api-json cases already pass at base. Only disk cases (×2) are red. The function specifies one fact across load paths.
  - `test_optional_boolean_null`: legacy/21.01 cases pass at base. The request cases (×3) are red.
- **Fully red at base:** boolean, conditional, disk checked compatibility, optional Boolean omitted.
- Per-commit red. Commit-4 tests failed at commit-3 production in the earlier convergence red run: disk optionality ×2 and disk omitted Boolean ×3. This run also verified commit-5: with `8966db2c7b3`'s `convert.py`, `tools/__init__.py` and `evaluation.py`, `test_optional_boolean_null` failed 3 of 9. All 3 were the request cases, failing at the JSON assertion (`{'flag': False}`).

## New history

1. `eaea0064b80` Function-scope API test interactor fixtures (+ docs scope fix)
2. `feef104b578` Baseline tests for user tool authoring contracts: populator helpers, `user_tool` fixture, structural + checked-rejected tests and fixtures
3. `4df74cbc8e1` Honor YAML boolean values when loading tools: production + boolean/conditional/disk-checked tests
4. `8966db2c7b3` YAML tools default omitted optional and Boolean value to False: production + omitted optionality/optional-Boolean-omitted tests
5. `f3a6eb7a05f` Keep explicit null Boolean default for YAML tools in request execution: production + optional-null test

Tree equality: `git diff 10b52988704 HEAD` differs only in the test module (merge/reorder) and the docs fix. Production code is byte-identical to the old tip.

## E2E

Not added. The behavior lives in parsing and request filling. The tool form's initial state comes from `/build`, which every test asserts directly, along with job outputs for all three input formats. A Selenium test would re-check what the API already pins.

## Not acted on

- Did not split mixed functions per load path or input format. Splitting would break the "one fact over all load paths" structure.
- `loaded_tool` and the conftest `user_tool` fixture overlap for path params. `loaded_tool` stays module-local because only this module needs the disk/API union.

## Test results

The contract module was run at each rebuilt commit, one run at a time:

- `feef104b578` (baseline): 1 passed, 4 xfailed
- `4df74cbc8e1`: 22 passed, 4 xfailed
- `8966db2c7b3`: 37 passed, 4 xfailed
- `f3a6eb7a05f` (tip): 46 passed, 4 xfailed, which matches the pre-challenge baseline

Ruff 0.15.13, black and isort pass. Mypy (run from `lib/`) reports no errors in the branch's test files.
