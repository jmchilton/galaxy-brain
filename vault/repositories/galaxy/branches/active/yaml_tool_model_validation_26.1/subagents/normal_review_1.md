# Normal review 1 — yaml_tool_model_validation_26.1

Run via Opus 5.5 (general-purpose subagent) at default effort, against `5df3aa1439f`.

Acted on both bugs and the recommended fix, each red→green. (1) YAML collection element tests are now `(file, attributes)` tuples, like XML's, so `file:` is compared; folded into "Verify collection outputs in YAML tool tests". (2) A stored `GalaxyTool` row that fails the model now raises `ToolMissingException` from `dynamic_tool_to_tool`, not a raw `ValidationError`/500. It still fails loud, and `tool_for_job` returns None; folded into the validation commit. (3) YAML tool tests read `assert_stdout`/`assert_stderr` (the model's spelling), as a new commit. Nits taken: `from e`; `create_tool` validation scoped to `from_path`; reworded the stale `_parse_output_collection` comment; moved trusted-path tests to class-less YAML (the real trusted consumer) instead of canonical page sources that no tool can reach.

Not acted on:
- `_encode_tool_request` re-parsing a historical legacy-dialect GalaxyTool `ToolRequest` snapshot now errors on read. This is fail-loud for GalaxyTool as John decided; it goes in PR risks.
- Parser ignores test `metadata` (overwritten with `{}`), `attributes: {collection_type}`, and YAML element `expected_sort_order`. These predate this branch and are separate seams.
- PR body should call out the loss of conda `package` requirements and `credentials` for GalaxyTool YAML. That's for the PR description, not code.

<details><summary>Full review</summary>

Verdict: needs changes. Two real bugs (one new, one a new failure mode); rest sound — model gating placed well, fixtures converted and all 15 in-tree GalaxyTool YAMLs load, no existing test weakened.

1. `file:` on collection element tests silently ignored (`yaml.py` `_parse_test_element_tests`): elements stayed plain dicts, `verify_elements` treats a dict as `(None, attrs)`, so file comparison skipped. XML `__parse_element_tests` emits `(file, attrs)` tuples. Fix: return `(attributes.pop("file", None), attributes)`.
2. Stored GalaxyTool row failing the model raises raw pydantic `ValidationError` → 500 via `dynamic_tool_to_tool`; `tool_for_job` only catches `ToolMissingException`, `serialize_rerunnable`, `JobWrapper.__init__`, `_report_error` catch nothing. Sibling `_lift_stored_user_tool` raises `ToolMissingException`. Fix: catch and convert. Lesser variant: `_encode_tool_request` re-parses historical ToolRequest snapshots.
3. (Recommended, pre-existing) model accepts `assert_stdout`/`assert_stderr`, parser reads `stdout`/`stderr`; GalaxyTool can no longer express stdout assertions at all; `collection_paired_test_y.yml` and `implicit_conversion_shared_input_y.yml` carry no-op `assert_stdout`.

GalaxyUserTool exemption: reasoning holds (creation-time model, stored-row lift, raw-source snapshots would break on schema tightening).

Nits: `from e` in `create_tool`; validation redundant on `src=representation`; stale "bypasses the pydantic UserToolSource model" comment; trusted canonical input path now unreachable via `YamlToolSource` so `test_trusted_inputs_keep_*` pinned dead behavior; parser-ignored model fields (`metadata`, test `attributes.collection_type`); YAML element tests lack `expected_sort_order`; `TestYamlLoader` empty `software_requirements`/`credentials` record a capability removal — call out in PR.

Test quality: class-less split keeps legacy coverage; legacy-dialect parametrization asserts error locations; removing `_LEGACY_FIXTURES` strengthens. Collection-output tests in `collection_creates_pair_y`, `collection_paired_test_y`, `gx_data_collection_list_or_paired` now actually run — run them through the framework.

</details>
