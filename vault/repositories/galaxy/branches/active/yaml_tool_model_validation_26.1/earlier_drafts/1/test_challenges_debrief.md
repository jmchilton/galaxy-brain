Run via Claude Opus 5.5 (claude-opus-5-5) at low effort.

# yaml_tool_model_validation_26.1 — test challenges debrief

Branch rewritten (history only, final production code unchanged); tip `8bd4229cd5b` (was `01767e066a7`), not pushed. HEAD tree vs old tip: +API test/helper, −1 unit test, 2 strengthened asserts, −2 duplicate params.

## Changes

1. **Baseline commit grew** (`30f634afe49`): `TestClasslessYamlLoader` (3 tests, was in "Convert in-tree…") and `test_classless_yaml_tool_keeps_{expression_validators,dynamic_options,parser_only_keys}` (was in "Validate…") pass on `19281d57645` — they pin existing class-less behavior, so they belong in the Baseline commit, not in commits whose other tests must go red. Moved via rebase edit-stop; later commits' trees unchanged.
2. **from_path rejection moved to the API layer.** Dropped `TestDynamicToolManager.test_create_tool_from_path_rejects_legacy_dialect` (file back to base). Added `TestToolsApi.test_dynamic_tool_from_path_rejects_legacy_dialect`: writes a legacy-dialect JSON to a tmpdir, asserts 400 + `command: Extra inputs are not permitted` in `err_msg`, and that its `tool_id` isn't in `list_dynamic_tools()`. New populator helper `create_tool_from_path_raw` (the `*_raw` pattern); `create_tool_from_path` asserts on top of it; shared `_post_dynamic_tool` for the admin POST. Helper lands in its own commit (`33a354a1851`) just before "Validate…" so the API test can go red on the pre-validation state.
3. **Deduped `LEGACY_DIALECT`**: removed `unknown_dataset_output_field` and `scalar_output` from `test_galaxy_tool_rejects_legacy_dialect` — exact duplicates (same loc) of `test_admin_yaml_tool_rejects_unknown_dataset_output_field` / `test_admin_yaml_tool_rejects_scalar_outputs`, which sit on the model commits that make the change. They're model tightenings, not legacy dialect.
4. **Strengthened** `test_yaml_tool_test_stdout_and_stderr_assertions`: full-equality on parsed assert lists. On base it died with `TypeError` iterating `None`; now a clean `AssertionError`.
5. **Strengthened** `test_yaml_collection_output_element_files`: asserts collection names `== ["nested"]` before unpacking (base red was a `ValueError` on unpack).

## Kept, and why

- `test_stored_galaxy_tool_that_fails_its_model_is_refused` (unit): no API path can create an invalid stored row now, so the unit layer is the only place to test it.
- Collection/stdout test-parsing unit tests: framework tests pass vacuously when parsing is missing (exactly how `collection_creates_pair_y` hid), so framework coverage doesn't replace them.
- Model-level tests in `test_user_tool_source_validation.py`: hand-coded next to the existing `test_admin_yaml_tool_rejects_label_referencing_undeclared_input`. The YAML corpus is `UserToolSource`-only.
- Overlap between the trust file's `test_admin_yaml_tool_refuses_keys_outside_its_schema` and `LEGACY_DIALECT` on `command`/`base_command`/`runtime_version` left alone: the trust file pairs admin vs user on one key list, and LEGACY is the scope table.
- Fixture conversions (`test_parsing`, `test_tool_linters`, `test_ontologies`, `test_tool_deserialization`) are fine.

## Not acted on

- No mocks or SimpleNamespace in the new tests; nothing to replace.
- No E2E: there's no UI surface.
- The converted `TestYamlLoader` asserts (`parse_command() is None`, `parse_version_command() is None`, `credentials == []`) are near-vacuous, since the fixture just lacks those keys. Harmless, left.

## Red/green evidence

- Baseline commit's files (`test_yaml_tool_source_validation`, `test_parsing`, `test_user_tool_parser_trust`) at `30f634afe49` (base + baseline only): 122 passed.
- HEAD's new test files on `19281d57645`: all 31 non-baseline new tests fail at their own assertion. 27 fail with `DID NOT RAISE ValidationError`, 1 with `DID NOT RAISE ToolMissingException`, and 3 with `AssertionError` (collection, element files, stdout).
- The new API test passes at HEAD; its sibling `test_dynamic_tool_from_path` also passes. Red was run, not reasoned: at the helper commit `33a354a1851` with HEAD's `test_tools.py`, it fails with `Request status code (200) was not expected value 400`, because the legacy tool was created.
- Touched unit modules are green at every rewritten commit (338/339/341/342/346/346) and at HEAD (362).
- ruff/black/isort are clean on all changed .py files. mypy is clean on `populators.py` and `test_tools.py`.

## For coordinator

- History was rewritten, so a force-push is needed (old tip `01767e066a7`). New SHAs: `30f634afe49` `3a10cdabf2e` `cdc5b864775` `c2cba152f17` `c6e766687a1` `386aabd58ce` `33a354a1851` (new helper commit) `8bd4229cd5b`.
- `initial_implementation_debrief.md` still cites the pre-rewrite SHAs.
