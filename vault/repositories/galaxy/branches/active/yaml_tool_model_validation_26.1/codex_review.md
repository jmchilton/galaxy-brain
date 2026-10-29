Run via gpt-6-sol at medium effort.

# Codex review (second pass) — yaml_tool_model_validation_26.1

Codex reviewed `19281d57645...bbeabb0cc91` (read-only `codex exec`, intent-only brief). It hit "model at capacity" twice and succeeded on the third try. Of three findings, I fixed one red→green, refuted one as intended behavior, and left one alone. The fix is folded into "Read assert_stdout/assert_stderr in YAML tool tests" (`0c6ad9027f7`). New tip: `6c43b516f4d`.

- **CONFIRMED, fixed: a test with no `outputs` crashed test parsing.** `YamlToolTest.outputs` defaults to `{}`, but `_parse_test` (`tool_util/parser/yaml.py`) read `test_dict["outputs"]`. A test with only `assert_stdout` raised `KeyError: 'outputs'`. Now `test_dict.get("outputs") or {}`. `test_yaml_tool_test_without_outputs` (`test_parsing.py`) was red with that `KeyError`.
- **REFUTED (intended): invalid citations reject a pre-26.1 `GalaxyTool`.** `class: GalaxyTool` validates against its model on every load path; that was John's decision, and the model's `Citation` validator is strict. The XML profile rule applies to class-less YAML via `_parse_citation_list`. My brief overstated it as applying to all YAML.
- **Not acted on: double validation in `create_tool`.** `create_tool` validates and then `load_dynamic_tool` builds `YamlToolSource`, which validates again. The early check is what returns a 400 before the row exists; the extra cost is one model validation on an admin-only path.

Coverage note from Codex: it didn't read every test change or the full generated schema, and couldn't import the parser (read-only sandbox, no writable tmp).

Touched unit modules pass at every commit (348→379); no conflict markers.

<details><summary>Raw findings</summary>

1. P2 correctness `yaml.py:439`: "A model-valid test without outputs crashes during test parsing". Confidence: certain.
2. P2 correctness `yaml.py:105`: "Model validation rejects invalid citations even for pre-26.1 tools". A `class: GalaxyTool` profile `24.2` tool with a malformed DOI fails to load where XML would skip the citation. Confidence: certain.
3. P3 reuse `managers/tools.py:178`: "Dynamic GalaxyTool creation validates the same representation twice". Confidence: certain.

</details>
