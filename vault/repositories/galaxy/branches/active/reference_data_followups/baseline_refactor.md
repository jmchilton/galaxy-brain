Run via Claude Opus 5.5 at low effort.

No refactoring of the base branch was performed. The shared-helpers refactor "Share reference_data runtime dumping and table access rule" (`f6723040770`) is already the first commit after the four Baseline tests commits, and nothing else in the branch splits out cleanly.

Head stays `05f155c5e78`. No history was rewritten and no backup branch was made.

## Current order

| Sha | Commit | Kind |
|---|---|---|
| `f65ce85596a` | Baseline tests: Run reference_data fixtures through the user tool contract harness | baseline |
| `11fd2719823` | Baseline tests: Strengthen closed reference_data table tests | baseline |
| `35b5cbf55d4` | Baseline tests: Test an admin GalaxyTool reads a table closed to user tools via the API | baseline |
| `b02887560b1` | Baseline tests: Pin reference_data loading to its authoring model | baseline |
| `f6723040770` | Share reference_data runtime dumping and table access rule | refactor, on dev |
| `901be64fe60` | Reject reference_data unless the input source is a YAML tool's | fix |
| `9d4560807d4` | Load reference_data inputs through their authoring model | fix |
| `05f155c5e78` | Fix YAML text defaults dropped by to_internal() | fix (re-scope) |

Since the earlier pass, the refactor commit has also moved the `setup_for_runtimeify` import in `evaluation.py` to module level. It is still behavior-preserving.

## Considered, not split out

- **`InputSource.parse_reference_data()` hook (`901be64fe60`).** On dev nothing would call it, so splitting it out would land unused infrastructure. The guard that uses it is the fix.
- **`_canonical_input_source()` dispatch (`9d4560807d4`).** It only exists to choose `CanonicalYamlReferenceDataInputSource`. Without that subclass it is a function that always returns `CanonicalYamlInputSource`, which is also unused infrastructure.
- **Factory switch to `reference_data.to_internal()` (`9d4560807d4`).** This changes behavior: disk tools now get model validation, and the `multiple`/`optional` flags are coerced.
- **Rewritten XML guard test (`901be64fe60`).** It asserts the new error message and the new `xml_with_options` and `classless_yaml` rejections, so it fails on dev.
- **Text default fix (`05f155c5e78`).** It is a bug fix, not a refactor. Its only refactor-shaped part is pulling out a 3-line `_fixture_id` test helper, which isn't worth a commit of its own. The fix doesn't depend on the reference_data commits. If John wants it as a separate PR, it could be reordered ahead of `901be64fe60`. I didn't verify that its parity test is green at that point.
- **The new parity test `test_yaml_fixture_parameters_load_like_their_authoring_models`.** It can't be a Baseline tests commit because the text fixtures fail on dev, which is the bug it catches.

## Nit for review (not acted on)

`901be64fe60` adds `parse_reference_data`/`parse_dynamic_options` to `CanonicalYamlInputSource`, and `9d4560807d4` then moves them onto the new subclass. Squashing that churn is a fix-commit concern, so it is out of scope for a baseline refactor.

## Tests

- At refactor commit `f6723040770` (detached checkout in the worktree):
  - unit tests (`test_reference_data.py`, `test_yaml_parameters.py`, `test_user_tool_source_fixtures.py`, `test_evaluation.py`, `test_parsing.py`): 261 passed
  - `test_user_tool_contract.py -k reference`: 18 passed
  - `test_unprivileged_tools.py -k reference`: 2 passed
- At head `05f155c5e78`, the same unit files: 400 passed.
