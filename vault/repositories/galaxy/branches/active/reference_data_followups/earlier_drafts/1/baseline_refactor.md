Run via Claude Opus 5.5 at low effort.

The behavior-preserving commit "Share reference_data runtime dumping and table access rule" was moved onto the base ahead of the fix commits. It now sits directly after the four Baseline tests commits and ahead of both fix commits.

## Restructure

Old head `218cf520ef0` → new head `809d07fc8ad`. `git diff 218cf520ef0 809d07fc8ad` is empty, so the final tree is unchanged. The old head is kept on the local branch `reference_data_followups_pre_baseline_refactor` and has not been pushed.

| Old | New | Commit |
|---|---|---|
| `f65ce85596a` | `f65ce85596a` | Baseline tests: Run reference_data fixtures through the user tool contract harness |
| `11fd2719823` | `11fd2719823` | Baseline tests: Strengthen closed reference_data table tests |
| `35b5cbf55d4` | `35b5cbf55d4` | Baseline tests: Test an admin GalaxyTool reads a table closed to user tools via the API |
| `03d82719007` | `03d82719007` | Baseline tests: Pin reference_data loading to its authoring model |
| `218cf520ef0` | `6577ac25d71` | Share reference_data runtime dumping and table access rule (refactor, moved) |
| `aa619027828` | `a28d86a9f35` | Reject reference_data unless the input source is a YAML tool's |
| `d3e7d7fdd44` | `809d07fc8ad` | Load reference_data inputs through their authoring model |

The Baseline tests shas are unchanged.

## Refactor commit on dev

The moved commit does two things:

- **Shared dump helper.** It adds `reference_data_runtime_json()` in `tool_util/parameters/convert.py`. Both `runtimeify` and the legacy `UserToolEvaluator` visitor call it. The `runtimeify` import in `evaluation.py` moves to module level.
- **Shared table access rule.** It adds `ToolDataTable.readable_by(trusted=)`. Both `ReferenceDataToolParameter.get_options` and `setup_for_reference_data` in `runtime.py` use it. `requires_user_accessible_table` becomes `self.trusted`. The old name had no other references on dev, and `self.trusted` does not shadow an existing parameter attribute.

The only conflict was the `basic.py` `__init__` context. Resolving it gives:

- on the refactor commit: dev's `table_name = input_source.get("table")` with only the `trusted` change;
- on `809d07fc8ad`: `reference_data.table` plus `trusted`.

## Not split out

- **`aa619027828`** adds the `InputSource.parse_reference_data()` hook. On dev nothing would call it, so splitting it out would leave unused infrastructure. It also tightens the guard, which is part of the fix.
- **`d3e7d7fdd44`** changes behavior: model validation on disk tools and coerced `multiple`/`optional` flags. It belongs to the fix.

## Tests

At the refactor commit `6577ac25d71`:

- Unit tests passed: 227. The files were `test_reference_data.py`, `test_yaml_parameters.py`, `test_evaluation.py` and `test_parsing.py`.
- `test_user_tool_contract.py -k reference` passed: 18.
- `test_unprivileged_tools.py -k reference` passed: 2.

At the new head `809d07fc8ad`, the same unit files passed: 234. The tree is identical to the old head.

I did not use mypy as a signal. A local run of `.venv/bin/mypy` on the changed files printed strict-mode errors on lines this commit doesn't touch, which looks like a config mismatch, so the count was not compared.
