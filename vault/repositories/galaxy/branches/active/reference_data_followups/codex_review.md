Run via gpt-6-sol at medium effort.

# Codex review debrief

Codex reviewed `f03e586886f` (isolated worktree) and raised one finding; confirmed and fixed, folded into "Load reference_data inputs through their authoring model" (now `6226ea0abd8`, head `063446e7d2b`).

Acted on:
- **P2 confirmed: form ignores validated flags for disk-loaded tools.** `YamlInputSource.get_bool` returns the raw value, so `multiple: "false"` stayed truthy in `SelectToolParameter` while pydantic coerced it to `False` in the factory's `to_internal()`; the form would submit a list the internal model rejects. Divergence introduced by this branch. Fix: `CanonicalYamlInputSource.__init__` validates a reference_data dict once and replaces it with `model_dump(by_alias=True, exclude_unset=True)`, so raw-dict readers see coerced values; `parse_reference_data()` returns the cached model (also removes the ~3x per-load re-validation noted in normal review 1). Red-to-green: `test_form_uses_the_authoring_model_coerced_flags` (failed `'false' is False` before).

Not acted on: nothing.

Verification after fix: unit (`test_reference_data`, `test_yaml_parameters`, `test_evaluation`, `test_parsing`, parameter spec/test-case suites) 272 passed; API contract harness + `test_unprivileged_tools` reference cases 21 passed.

<details><summary>Raw Codex output</summary>

```json
{
  "coverage": {
    "files_reviewed": [
      "lib/galaxy/tool_util/data/__init__.py",
      "lib/galaxy/tool_util/parameters/convert.py",
      "lib/galaxy/tool_util/parameters/factory.py",
      "lib/galaxy/tool_util/parser/interface.py",
      "lib/galaxy/tool_util/parser/yaml.py",
      "lib/galaxy/tool_util_models/yaml_parameters.py",
      "lib/galaxy/tools/evaluation.py",
      "lib/galaxy/tools/parameters/basic.py",
      "lib/galaxy/tools/runtime.py",
      "lib/galaxy_test/api/test_unprivileged_tools.py",
      "lib/galaxy_test/api/test_user_tool_contract.py",
      "lib/galaxy_test/base/data/user_tools/gx_reference_data_multiple_user.json",
      "lib/galaxy_test/base/data/user_tools/gx_reference_data_user.json",
      "test/unit/app/tools/test_reference_data.py",
      "test/unit/tool_util/test_yaml_parameters.py"
    ],
    "notes": "Reviewed the changed lines and relevant surrounding paths, not every line of the larger files. Tests could not be run with the available Python installation."
  },
  "findings": [
    {
      "severity": "P2",
      "category": "correctness",
      "file": "lib/galaxy/tools/parameters/basic.py",
      "line": 1885,
      "title": "The form ignores validated reference_data flags for disk loaded tools",
      "detail": "The factory uses `reference_data.to_internal()`, but `SelectToolParameter.__init__` still reads `multiple` and `optional` from the raw input source. Pydantic accepts and converts string Boolean values, while the raw strings remain truthy in the form parameter. The validated model and form can therefore disagree.",
      "failure_scenario": "A disk loaded GalaxyTool declares `reference_data` with `multiple: \"false\"`. The internal model expects one string, but the form treats the input as multiple and submits a list, which the internal state rejects.",
      "confidence": "certain"
    }
  ]
}
```

</details>
