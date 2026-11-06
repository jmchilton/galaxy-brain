# Implementation debrief

**STATUS: READY.** Base `release_26.1` (`b2b1e1deeee`). Head `48b981a89de`, 4 commits, pushed to `jmchilton`. The previous debrief is in `earlier_drafts/2/`.

This revision, at John's request, moved the two API tests into framework workflow tests. To make that possible, the framework test format can now assert a collection's name.

Commits:
1. `d388358d4a9` **Allow output collection name assertions in test format.** A Collection output in test YAML now accepts `metadata: {name: ...}`. This mirrors File outputs.
   - Changed: `CollectionMetadata` (strict, `name` only) in `tool_util_models`, `TestCollectionOutputDef.metadata`, the `verify_collection` name check, the regenerated `ToolSourceSchema.json`, and unit tests.
   - It's first in the branch so it can split into its own stacked PR.
2. `2de8ea4cc72` Move the `expression_json_hda` helper to `workflow_support.py` (refactor).
3. `d4668d93486` **The fix:** `set_outputs_for_input` stores the expression.json value. Framework tests:
   - `replacement_parameters_nested_expression`: tool and native pick_value renames.
   - `_mapped`: mapped-over subworkflow, checking the collection name and the element name.
   - `_collection`: the issue's `__BUILD_LIST__` repro.
4. `48b981a89de` Pre-read in `subworkflow_progress`, plus 2 unit tests. Unchanged.

Key choices:
- **Key `metadata: {name:}`:** it matches File outputs. A top-level `name` on an output is overwritten with the output label by both the harness and planemo.
- **`__BUILD_LIST__` gets its own workflow file** (normal review). Inside the shared test, the earlier `out1` failure hid it on base.
- `test_workflows.py` is now a net-zero diff against base.

Tests:
- All 3 framework tests are red on base, each at its own repr assertion, and green at head.
- The test challenge strengthened `test_collection_output_metadata_unknown_key_rejected` to pin the error location, because it passed on base.
- Unit tests pass: tool_util, tool_util_models and workflows (143 passed; 199 across the 5 touched files).

Open for John:
- Keep or drop `test_subworkflow_expression_json_parameter_replacement`? It overlaps all 3 framework tests.
- A test-format feature on 26.1 may get pushback. The PR description should say collection names couldn't be asserted before; the fallback is splitting commit 1 into its own PR.

Follow-ups (index.md): see index.md for the earlier list, plus a planemo item: `for_collections()` only recognizes `element_tests`, so a Collection output asserting only `metadata.name` fails there.
