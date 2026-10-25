# Test challenges debrief

Kept every test. Restructured the parametrize table and tightened assertions. Nothing dropped, nothing moved to another layer, no E2E. New head: `74913630f85` (baseline `23d7dbe5c7d`, fix `74913630f85`). The old `603e09ad2e5`/`85fdcfa736f` are rewritten.

## Changes

- Baseline commit: the `DUPLICATE_QUALIFIED_BODIES` dict of `(body, path)` tuples became `DUPLICATE_QUALIFIED_PLACEMENTS`, which maps to a `DuplicateQualifiedPlacement` dataclass (`body`, `state_path`). Tests are now parametrized on the dataclass values with ids. This removes `DUPLICATE_QUALIFIED_BODIES[placement][1]` indexing.
- Fix commit: added `flat_name` (`top`, `plain_0|a`, `nested_0|source|a`) to the dataclass. Strengthened:
  - conflicting test: the `case_state`, lint and runtime checks now match `Ambiguous test parameter (<flat_name>)`, not just the prefix. This pins which param is reported.
  - legacy-profile test: `test_description.inputs[flat_name] == "A2"`, replacing `"A2" in inputs.values()`. The reason check also includes the path.

## Challenge results

| test | verdict |
|---|---|
| `test_duplicate_identical_qualified_test_param_is_tolerated` (baseline, x3) | keep. Tests behavior through public `case_state` and passes on base |
| `test_duplicate_conflicting_qualified_test_param_is_rejected` (x3) | keep, tightened. One test covers case_state, the linter (`validate_test_cases_for_tool_source`) and runtime (`parse_tool_test_descriptions`) |
| `test_duplicate_conflicting_qualified_test_param_legacy_profile_still_runs` (x3) | keep, tightened. Pins that tools below 24.2 still run on the legacy inputs |
| `test_tests_duplicate_param_in_container` (25.1 error / 23.0 warning) | keep. It is the only test of lint levels, of a sibling-`<repeat>` test staying valid, and of the `test_case_validation` move into `try` |

- Implementation-only / silly: none. All go through public entry points, with no mocks or SimpleNamespace.
- Overlap: the lint check in the conflicting test overlaps `test_tests_duplicate_param_in_container` only for the repeat>conditional placement. Kept both: one covers all 3 placements, the other covers level and per-test isolation.
- Other layers: not needed. This is tool-source parsing and linting, with no API or UI surface. An API/functional tool test couldn't express "errors at load" any better. No E2E.
- Design: the code under test is already pure functions (`case_state`, `test_case_validation`). No refactor needed.

## Red/green

Checked by extracting HEAD into `/private/tmp/claude-503/` and swapping in base `case.py`:

- All 8 non-baseline tests fail at their own assertions. The 3 conflicting tests fail with `DID NOT RAISE`, the 3 legacy tests on `request is None`, and the 2 lint tests on `len(case_messages) == 1`.
- With only the `try` hunk reverted, the conflicting tests and both lint tests fail: lint reports the coarse "Serious problem parsing" message instead of "Test 1:". So the `try` move is covered.
- The baseline commit `23d7dbe5c7d` passes on base. The only failure is `test_validate_framework_test_tools`, caused by the extraction: the `ucsc_tablebrowser.xml` symlink target isn't in the archive.
- Branch head: `test_parameter_test_cases.py`, `test_tool_linters.py` and `test_test_definition_parsing.py` give 150 passed, 1 skipped.
