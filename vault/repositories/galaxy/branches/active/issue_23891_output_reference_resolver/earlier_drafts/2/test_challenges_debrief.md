# Test challenges debrief

Top line: tests held up; only change was shortening two multi-line test comments to one line (commit `3f3287c9`). No drops, rewrites or new E2E.

## Per test

- **`test/unit/tool_util/test_output_references.py`** (5 tests): exercise the new `InputReferences`/`output_reference_problem` abstraction on edge cases (repeat reindexing, shadowed alias, param named like a repeat instance, hidden_data, index mismatch). Behavior-level, no mocks, built from a real `XmlToolSource`. Not reachable cheaply via API. Kept. Imports the new module so it can't run against base - expected for a new abstraction.
- **`test/unit/app/tools/test_output_references.py`** (6 tests): tool-load rewrite/drop via `tools_support` (no mocks). Partly overlaps framework tools `format_source_internal_keys` / `format_source_legacy_alias_collision`, but also covers `metadata_source`, repeat reindexing, collection children, profile 26.2 load failure and YAML tools - none of which the framework/API tests hit. Kept. Red on base per earlier debrief (load hook disabled).
- **`test_tool_deserialization.py`** additions (repeat index > 0, ambiguous alias message): small, behavior-level. Kept.
- **Linter tests** (shadowed legacy, non-data format_source, updated message): message-level checks, standard linter pattern. Kept.
- **Framework tools** `format_source_internal_keys.xml`, `format_source_legacy_alias_collision.xml`: right layer for runtime format. Kept.
- **API test** `test_format_source_internal_keys_collection_for_multiple_input`: needed because tool test framework can't feed a collection to a multiple data param. Uses populators; no repeated raw HTTP. Comment shortened to one line.

## Not acted on

- E2E: no UI surface; none warranted.
- Trimming unit rows that duplicate framework rows (`out_conversion`, `out_element`): cheap, give fast load-time signal; left.
- No baseline-tests commit: tests target new behavior, all red without the change.

Verified: `pytest test/unit/tool_util/test_output_references.py test/unit/app/tools/test_output_references.py` - 11 passed; black/ruff/flake8 clean. Force-pushed to `jmchilton`.
