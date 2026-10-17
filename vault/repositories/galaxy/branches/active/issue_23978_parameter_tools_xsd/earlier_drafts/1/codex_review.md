# Codex review: issue_23978_parameter_tools_xsd

Recovery run. An independent Codex review (`codex exec -s read-only`) ran on `85f79a9ab6c..2a42bff3bfc` (this branch's two commits, not the parent `issue_18642_framework_tool_coverage`). Its brief held only the #23978 goals. It returned no findings and no security issues, so no code changed.

Codex also ran checks itself: all 410 macro-expanded tools selected by the new CI glob pass XSD validation, shellcheck is clean, and the targeted linter/XSD unit tests pass. It did not run server-backed framework tests or the full `validate_test_tools` CI script; the initial implementation covered the five restricted tools under both tool APIs, and CircleCI runs the real script.

Not acted on: none.

<details>
<summary>Full Codex output</summary>

```json
{
  "coverage": {
    "files_reviewed": [
      ".ci/validate_test_tools.sh",
      ".circleci/config.yml",
      "scripts/validate_tools.sh",
      "tox.ini",
      "lib/galaxy/tool_util/xsd/galaxy.xsd",
      "lib/galaxy/tool_util/loader.py",
      "lib/galaxy/tool_util/linters/xsd.py",
      "lib/galaxy/tool_util/linters/inputs.py",
      "lib/galaxy/tool_util/parser/xml.py",
      "lib/galaxy/tool_util/parameters/factory.py",
      "lib/galaxy/tool_util/verify/interactor.py",
      "lib/galaxy/tools/__init__.py",
      "lib/galaxy/tools/parameters/basic.py",
      "lib/galaxy_test/api/test_tools.py",
      "test/functional/tools/parameters/gx_conditional_select_dynamic.xml",
      "test/functional/tools/parameters/gx_data.xml",
      "test/functional/tools/parameters/gx_data_collection.xml",
      "test/functional/tools/parameters/gx_data_collection_list.xml",
      "test/functional/tools/parameters/gx_data_collection_optional.xml",
      "test/functional/tools/parameters/gx_data_multiple.xml",
      "test/functional/tools/parameters/gx_data_multiple_optional.xml",
      "test/functional/tools/parameters/gx_data_optional.xml",
      "test/functional/tools/parameters/gx_drill_down_code.xml",
      "test/functional/tools/parameters/gx_drill_down_code.py",
      "test/functional/tools/parameters/gx_hidden_data.xml",
      "test/functional/tools/parameters/gx_repeat_select_dynamic.xml",
      "test/functional/tools/parameters/gx_section_boolean.xml",
      "test/functional/tools/parameters/gx_section_data.xml",
      "test/functional/tools/parameters/gx_section_select_dynamic.xml",
      "test/functional/tools/parameters/gx_select_dynamic.xml",
      "test/functional/tools/parameters/gx_select_dynamic_options.py",
      "test/functional/tools/parameters/gx_rules.xml",
      "test/functional/tools/parameters/macros.xml",
      "test/unit/tool_util/test_tool_linters.py",
      "test/unit/tool_util/test_parameter_convert.py",
      "test/unit/tool_util/test_parameter_test_cases.py",
      "test-data/1.tabular",
      "test-data/simple_line.txt"
    ],
    "notes": "Reviewed all 18 changed files and relevant surrounding code. All 410 expanded tools selected by the CI glob passed XSD validation; shellcheck and three targeted linter/XSD tests passed. Server-backed framework tests and the full CI startup script were not run."
  },
  "findings": []
}
```

</details>
