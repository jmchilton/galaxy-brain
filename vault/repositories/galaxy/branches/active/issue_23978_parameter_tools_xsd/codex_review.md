# Codex review: issue_23978_parameter_tools_xsd

Re-harden round 2 (2026-10-16, post re-scope). Fresh `codex exec -s read-only` review of `f66d1f0f97d..04034197ef7` (4 commits; parent `issue_18642_framework_tool_coverage` out of scope). Brief held only #23978 goals. **No findings, no security issues → no code changes.**

Codex's own checks: all selected tools pass XSD after macro expansion, no tool sits below the glob depth, schema lint + shell syntax OK. It counted 429 tools vs 431 in our stubbed CI runs — the 2-tool gap matches the `expression_tools/` symlinked dir, likely unresolved in its sandbox; not a finding. Couldn't run pytest (read-only sandbox, no tmpdir); test challenge ran it green.

Not acted on: none.

<details>
<summary>Full Codex output</summary>

```json
{
    "coverage": {
        "files_reviewed": [
            ".ci/validate_test_tools.sh",
            ".circleci/config.yml",
            "tox.ini",
            "scripts/validate_tools.sh",
            "scripts/common_startup.sh",
            "lib/galaxy/tool_util/xsd/galaxy.xsd",
            "lib/galaxy/tool_util/loader.py",
            "lib/galaxy/tool_util/loader_directory.py",
            "lib/galaxy/tool_util/linters/xsd.py",
            "lib/galaxy/tool_util/parser/xml.py",
            "lib/galaxy/tools/parameters/basic.py",
            "lib/galaxy/util/xml_macros.py",
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
        "notes": "Reviewed the entire scoped diff and relevant surrounding code. All 429 selected tools passed XSD validation after Galaxy macro expansion; no existing tools fall below the script\u2019s directory depth. Schema lint and shell syntax checks passed. Full CI startup was not executed; the targeted pytest run was blocked by the read-only sandbox\u2019s lack of a writable temporary directory."
    },
    "findings": []
}
```

</details>
