# Test challenges debrief (round 2, after re-scope)

One test moved, nothing dropped, nothing moved to another layer, no E2E. `test_duplicate_identical_data_test_param_with_children_is_tolerated` passed on base, so it moved into the baseline commit along with `DUPLICATE_DATA_TOOL_TEMPLATE`. It also gained readable ids (`edit_attributes`, `composite_data`). New head: `c33a26283d7`, was `a462963ff1d`. Every commit was rewritten, and the baseline is still first.

## Commits

1. `2a2ff57e989` Baseline tests: identical duplicate test params tolerated (qualified x3, plus data params with identical children x2)
2. `337009b5b44` composite rename prefix constant
3. `dd0e5727580` the fix
4. `53caa8b2b42` content comparison. Its test is now only the conflicting `edit_attributes` one.
5. `c33a26283d7` `edit_attributes` stored as dicts, with the JSON round-trip test

## Challenge results

| test | commit | verdict |
|---|---|---|
| `test_duplicate_identical_qualified_test_param_is_tolerated` (x3) | baseline | keep |
| `test_duplicate_identical_data_test_param_with_children_is_tolerated` (x2) | moved 4 → baseline | keep. It passes on base and fails on the fix commit (the content-comparison regression it guards) |
| `test_duplicate_conflicting_qualified_test_param_is_rejected` (x3) | fix | keep. Covers case_state, the linter and runtime in one test |
| `test_duplicate_conflicting_qualified_test_param_legacy_profile_still_runs` (x3) | fix | keep. Pins that tools below 24.2 still run on legacy inputs |
| `test_tests_duplicate_param_in_container` (25.1 error / 23.0 warning) | fix | keep. Covers lint levels, per-test isolation and the `try` move |
| `test_duplicate_data_test_param_with_conflicting_edit_attributes_is_rejected` | content comparison | keep |
| `test_data_test_param_edit_attributes_survive_json_round_trip` | edit_attributes dicts | keep |

- Implementation-only, silly, or mocks/SimpleNamespace: none. Everything goes through public entry points (`case_state`, `validate_test_cases_for_tool_source`, `parse_tool_test_descriptions`, `ToolTestDescription.to_dict`, the `tests` lint module). The only helper type is the `DuplicateQualifiedPlacement` dataclass.
- Layers:
  - The round-trip test could in principle be an API test on `/api/tools/{id}/test_data`. That would need a new functional tool with `<edit_attributes>`, since none exists, registered in the sample tool conf on a release branch. It would also run in framework tests. The bug is the serialization contract of `to_dict`, which is a pure unit property, so it stays a unit test.
  - The rest is tool-source parsing and linting, with no server needed (writing_tests.md decision tree → unit).
- E2E: not applicable. No UI.
- Design: the code under test is already pure functions. No refactor.
- writing_tests.md (Backend/Python unit): stand-alone pytest in `test/unit/tool_util`, no external services, so no `@external_dependency_management` marker. Compliant.

## Red/green (redone; round 1's checks used an extracted lib copy, which is invalid)

Every check overwrote the lib files in the worktree with `git show <rev>:<path>`, then restored them with `git checkout HEAD --`. `git status` was clean after each one.

- New baseline `2a2ff57e989` tests on base lib: 144 passed, 1 skipped.
- HEAD tests on base lib: 10 failed, all at their own behavior:
  - conflicting x3: `DID NOT RAISE`
  - legacy x3: `request is None`
  - conflicting `edit_attributes`: `assert test_description.error`
  - lint x2: `len(case_messages) == 1`
  - round-trip: `TypeError: Object of type _Element is not JSON serializable` in `json.dumps`. That is the bug's real symptom through an existing API, not a missing fixture.
- HEAD tests on the fix commit's lib: the 2 identical-children tests fail ("Ambiguous test parameter (input)"), and so does the round-trip test.
- HEAD tests on the content-comparison commit's lib: only the round-trip test fails.
- HEAD with only the `test_case_validation` `try` move reverted: conflicting x3 and lint x2 fail. The move is covered.
- Weak spot, not blocking: on the fix commit, the conflicting `edit_attributes` test passes only because Elements compare by identity, so any two conflict. Its real coverage comes from the content comparison.

## Results

At HEAD, `test_parameter_test_cases.py`, `test_tool_linters.py` and `test_test_definition_parsing.py` give 154 passed, 1 skipped. Pre-commit (ruff/flake8/black) passed on the rewritten commits.
