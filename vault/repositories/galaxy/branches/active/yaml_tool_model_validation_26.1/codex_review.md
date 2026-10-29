Run via gpt-6-sol at medium effort.

# Codex review — yaml_tool_model_validation_26.1

The review covered `19281d57645...8bd4229cd5b` in a read-only `codex exec`. Codex was given the intent only; neither my reasoning nor earlier reviews were in the brief. It returned two findings, and I confirmed and fixed both red→green, folding them into "Verify collection outputs in YAML tool tests" (`6e4942dfe4d`). New tip: `3be3d68a7a2`.

Nothing was refuted, and there were no needs-decision items.

Fixes:
- **`attributes.collection_type` ignored (CONFIRMED).** The test model accepts `attributes: {collection_type: …}` (`tool_util_models/__init__.py` `CollectionAttributes`). `TestCollectionOutputDef.from_yaml_test_format` (`tool_util/parser/interface.py`) only mapped a top-level `collection_type`, so a wrong collection type passed. It now falls back to `attributes.collection_type`. No workflow framework test uses `attributes:`, so the shared fix doesn't change any existing test.
- **Test `metadata` discarded (CONFIRMED).** `_parse_test_output_attributes` (`tool_util/parser/yaml.py`) overwrote `metadata` with `{}`, for dataset outputs and the new collection elements alike. Tests with `metadata: {dbkey: …}` passed whatever the output had. Declared metadata is now kept. No in-tree YAML fixture declares test metadata.
- Red→green: `test_yaml_tool_test_keeps_collection_type_and_metadata_assertions` (`test_parsing.py`) failed with `assert {} == {'dbkey': 'hg38'}` before the fix.

Coverage note from Codex: it reviewed every changed file plus `executables.py`, `factory.py`, `xml.py` and `verify/interactor.py`. It could not run pytest, because the read-only sandbox has no writable tmp.

Process note: autosquashing these fixups conflicted where the commits append tests at the end of `test_parsing.py`. My first resolution committed conflict markers into the stdout commit. A follow-up fixup repaired it. No commit contains markers now (`git grep` over every commit), and the touched unit modules pass at every commit (336→363).

<details><summary>Raw findings</summary>

1. P2 correctness, `lib/galaxy/tool_util/parser/yaml.py:509`: "Collection type assertions in `attributes` are silently ignored". A GalaxyTool test with `class: Collection` and `attributes: {collection_type: paired}` against a `list` output passes. Confidence: certain.
2. P2 correctness, `lib/galaxy/tool_util/parser/yaml.py:502`: "Collection element metadata assertions are discarded". `_parse_test_output_attributes` replaces `metadata` with `{}`, so `metadata: {dbkey: hg38}` is never checked. Confidence: certain.

</details>
