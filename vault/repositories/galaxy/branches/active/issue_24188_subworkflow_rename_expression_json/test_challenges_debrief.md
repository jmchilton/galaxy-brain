# Test challenges debrief

Re-ran every check fresh against head `0eefb4ea6b3`. I acted on one finding: `test_collection_output_metadata_unknown_key_rejected` passed on base, so I strengthened it to pin the error location (commit `c216d8261e4`, since folded into the tooling commit, now `d388358d4a9`). Nothing was dropped. Every other new test fails on base at its own assertion.

Not acted on:
- **`test_subworkflow_expression_json_parameter_replacement`: drop recommended; John agreed, removed in `e36468c480a`.** All 3 framework tests cover the same `set_outputs_for_input` line with real objects, so it meets the "also tested by framework" drop rule.
- **`test_collection_output_metadata_name_validates`: kept.** It overlaps with `test_validate_workflow_tests`, which validates the new `.gxwf-tests.yml` files, but it is the direct check that the model accepts and parses the key.
- **Shared subworkflow setup helper: not done.** `_setup_subworkflow_parameter` repeats about 8 setup lines from the existing `test_subworkflow_progress`. Sharing them would mean editing a pre-existing test on a release branch, for little gain.
- **No E2E test.** This is a backend scheduling fix plus a test-format key, with no UI change.
- **No Baseline tests commit.** Every new test covers new behavior or the fix.

<details>

## Changes

- `test/unit/tool_util_models/test_output_assertions.py::test_collection_output_metadata_unknown_key_rejected` now asserts a single error at `loc == (0, "outputs", "out", "Collection", "metadata", "dbkey")` with type `extra_forbidden`. This follows the style of the file's `test_unknown_field_on_file_output_yields_single_error`. Before the change, base raised `extra_forbidden` at `(..., "Collection", "metadata")` because base has no `metadata` key at all, so a bare `pytest.raises(ValidationError)` passed on base. The test now fails on base at the loc assertion ("Right contains one more item: 'dbkey'") and passes at head.

## Per-test challenges

Layer per `writing_tests.md`: workflow-only behavior goes in workflow framework tests. The branch now follows that. `test_workflows.py` has a net-zero diff against base, and the API helper from the previous challenge went away with the moved tests.

- **Framework `replacement_parameters_nested_expression{,_mapped,_collection}`: kept.** These are the right layer. Each one mirrors the existing `replacement_parameters_nested.gxwf.yml`, with the text input fed through the `pick_value` expression tool. Each covers a different rename path: tool and native `pick_value` dataset renames; the mapped implicit-collection name plus the element name; and the DatabaseOperationTool `__BUILD_LIST__` HDCA name, the reporter's case. The collection case gets its own file so that its base failure isn't hidden by `out1` (`_verify` stops at the first failure). The coordinator had already verified red on base and green at head, and I did not change these files, so I did not rerun them.
- **`test/unit/tool_util/test_verify.py::test_verify_collection_name`: kept.** It covers the only mismatch path of the new `verify_collection` name check. Without it, a no-op check would let the framework tests pass vacuously. The `verify_dataset` argument is already a no-op lambda, and it goes through `from_yaml_test_format`, the same entry point the framework harness uses. On base it fails with `DID NOT RAISE AssertionError`.
- **`test_collection_output_metadata_name_validates`: kept.** On base it fails with `ValidationError` at `model_validate`. Model acceptance is the behavior under test, so that is its own assertion.
- **`test_collection_output_metadata_unknown_key_rejected`: strengthened.** See Changes.
- **`test/unit/workflows/test_workflow_progress.py::test_subworkflow_unreadable_expression_json_parameter_delays_subworkflow`: kept.** It is the only test of the `subworkflow_progress` pre-read. Shared-filesystem lag can't be reproduced at the framework or API layer. It reuses the file's existing `MockModuleInjector`/`MockModule`, real model objects, and a real file under `tmp_path`. No noop, dataclass, or restructure rewrite would remove a mock.
- **`test_subworkflow_expression_json_parameter_replacement`: drop recommended; removed afterwards at John's call.** It is redundant with all 3 framework tests. Its only value is speed.
- **`test_modules.py` and `workflow_support.py`:** these only move the `expression_json_hda` helper so that both unit files can share it. There are no new tests.
- **Not covered by any test:** `TestCollectionOutputDef.to_dict` now emits `metadata`. No consumer reads it back for collections today: XML tests never set it, and YAML tool tests ignore collection assertions. A roundtrip test would test the implementation directly, so I added none. I grepped `test/unit/tool_util/` and found no exact-dict comparison of collection test definitions. `test_parsing.py` gives 90 passed at head.
- **Refactor for testability: none needed.** The `run.py` fix is 2 small hunks, and `modules.py` stays untouched by recorded decision.

## Red/green (run one at a time; sources restored via `git show <rev>:path > path` then `git checkout -- path`, no stash)

| Test | Source swapped in | Result |
|---|---|---|
| `test_verify_collection_name` | base `interface.py`, `interactor.py`, `tool_util_models/__init__.py` | fail: `DID NOT RAISE AssertionError` |
| `test_collection_output_metadata_name_validates` | same | fail: `ValidationError` (model rejects `metadata`) |
| `test_collection_output_metadata_unknown_key_rejected` (original) | same | **pass**, which was the finding |
| `test_collection_output_metadata_unknown_key_rejected` (strengthened) | base `tool_util_models/__init__.py` | fail: loc lacks `'dbkey'` |
| `test_validate_workflow_tests` (existing; validates the new yml) | base tooling | fail: `ValidationError` |
| `test_subworkflow_expression_json_parameter_replacement` (since removed) | base `run.py` | fail: `{'inner_text': '<galaxy.model.HistoryDatasetAssociation(1) ...>'} != {'inner_text': 'moocow'}` |
| same | `9aeaec955f2` `run.py` (fix, no pre-read) | pass |
| `test_subworkflow_unreadable_expression_json_parameter_delays_subworkflow` | base `run.py` | fail: `DID NOT RAISE DelayedWorkflowEvaluation` |
| same | `9aeaec955f2` `run.py` | fail: same |

At head, `test_verify.py`, `test_output_assertions.py`, `test_test_format_model.py`, `test_workflow_progress.py`, and `test_modules.py` give 199 passed and 1 skipped. `black` and `isort` are clean on the edited file, and the pre-commit hooks pass.

</details>
