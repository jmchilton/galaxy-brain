# Codex review: issue_23978_parameter_tools_xsd

Re-harden run (2026-10-16). Fresh `codex exec -s read-only` review of `f66d1f0f97d..2bd2d9cf1b4` (this branch's 2 commits; parent `issue_18642_framework_tool_coverage` out of scope). Brief held only #23978 goals. **No findings, no security issues → no code changes.**

Codex's own checks: all 410 macro-expanded tools selected by the CI glob pass XSD validation; shell syntax + XSD well-formedness OK. It could not run `test_tool_linters.py` (read-only sandbox has no writable tmpdir); the test challenge step ran it green (165 passed) and confirmed it fails against the parent XSD.

Not acted on: none.

<details>
<summary>Full Codex output</summary>

```json
{
    "coverage": {
        "files_reviewed": [
            ".ci/validate_test_tools.sh",
            "scripts/validate_tools.sh",
            "tox.ini",
            "lib/galaxy/tool_util/xsd/galaxy.xsd",
            "lib/galaxy/tool_util/loader.py",
            "lib/galaxy/tool_util/loader_directory.py",
            "lib/galaxy/tool_util/linters/xsd.py",
            "lib/galaxy/tool_util/parser/xml.py",
            "lib/galaxy/tools/parameters/basic.py",
            "lib/galaxy/util/xml_macros.py",
            "test/functional/tools/parameters/macros.xml",
            "test/functional/tools/parameters/gx_rules.xml",
            "test/functional/tools/parameters/gx_conditional_select_dynamic.xml",
            "test/functional/tools/parameters/gx_data.xml",
            "test/functional/tools/parameters/gx_data_collection.xml",
            "test/functional/tools/parameters/gx_data_collection_list.xml",
            "test/functional/tools/parameters/gx_data_collection_optional.xml",
            "test/functional/tools/parameters/gx_data_multiple.xml",
            "test/functional/tools/parameters/gx_data_multiple_optional.xml",
            "test/functional/tools/parameters/gx_data_optional.xml",
            "test/functional/tools/parameters/gx_drill_down_code.xml",
            "test/functional/tools/parameters/gx_hidden_data.xml",
            "test/functional/tools/parameters/gx_repeat_select_dynamic.xml",
            "test/functional/tools/parameters/gx_section_boolean.xml",
            "test/functional/tools/parameters/gx_section_data.xml",
            "test/functional/tools/parameters/gx_section_select_dynamic.xml",
            "test/functional/tools/parameters/gx_select_dynamic.xml",
            "test/unit/tool_util/test_tool_linters.py",
            "test/unit/tool_util/parameter_specification.yml"
        ],
        "notes": "Reviewed the full scoped diff and relevant surrounding code. All 410 selected tools passed XSD validation after macro expansion; shell syntax and XSD XML checks passed. The focused unit test could not collect because the read-only sandbox provides no writable temporary directory."
    },
    "findings": []
}
```

</details>
