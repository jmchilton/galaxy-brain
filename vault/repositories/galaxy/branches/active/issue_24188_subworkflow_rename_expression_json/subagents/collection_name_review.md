# Normal review: collection name assertion + API → framework tests

Reviewed `5ce3acf579c..4f041ca7d3b`. No blockers.

Acted on finding 1. The `__BUILD_LIST__` case was `out4` in the shared nested_expression test, so on base the earlier `out1` failure hid it. It is now split into its own `replacement_parameters_nested_expression_collection.gxwf.yml`. All 3 framework tests fail on base, each on its own repr assertion (collection name for the mapped and collection tests), and all pass with the fix. Head `0eefb4ea6b3`.

Not acted on:
- **Test-format feature on 26.1 (finding 2):** this is a call for the PR description, not a code change. Explain that collection names couldn't be asserted before, and that framework workflow tests are the preferred home. Commit `87bbf28a768` comes first on the branch, so it can split into its own stacked PR if reviewers want.
- **Planemo `for_collections()` (finding 3):** it only recognizes `element_tests`, so a Collection output asserting only `metadata.name` would fail there. That predates this branch and lives in planemo, so it's left as a follow-up.
- **Model-test overlap nit:** keeping `test_collection_output_metadata_name_validates`. It is the direct check that the model accepts the new key.

<details>

Findings:

1. Low/medium, `replacement_parameters_nested_expression.gxwf-tests.yml:18-21`: `_verify` raises on the first failing output, so the out4 base-red was never shown. Fix: confirm locally or split into its own file.
2. Low: a maintainer may object to adding a test-format feature on release_26.1. It is small, additive and backward compatible. Justify it in the PR description, or split it as a stacked PR.
3. Low, follow-up: planemo enforces `metadata.name` via `verify_collection` (`show_dataset_collection` includes `name`). But `for_collections()` only recognizes `element_tests`, so a metadata-only Collection output goes to the file checker. This predates the branch.

Checked and fine:
- **Both `verify_collection` consumers return HDCA details that include `name`:** tool tests (`dataset_collections/{id}?instance_type=history`) and the framework harness (`get_history_collection_details`).
- **XML compat:** positional construction in `parser/xml.py` is unaffected. `to_dict` now always emits `metadata: {}`, which is safe in both directions for old and new clients of `/api/tools/{id}/test_data`.
- **Key choice `metadata: {name:}`:** it matches File outputs. A top-level `name` on an output is overwritten with the output label by the harness and by planemo. A top-level `name` on job inputs is the input-side convention and doesn't conflict.
- **Strictness:** `CollectionMetadata` is strict, and nested collection elements don't accept `metadata`, so nothing passes validation only to be silently ignored.
- **`ToolSourceSchema.json`** matches `rebuild.py` output. YAML user tools already ignore output collection assertions (existing TODO).
- **Mapped coverage** matches the removed API test (HDCA name + element name). `test_workflows.py` is a net-zero diff against base.
- Unit tests: 251 passed, 1 skipped. No security concerns.

</details>
