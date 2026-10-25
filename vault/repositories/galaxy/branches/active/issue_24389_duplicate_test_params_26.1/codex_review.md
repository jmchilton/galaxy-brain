# Codex review

Codex (`codex exec -s read-only`, unprimed brief from #24389) reported one finding. I confirmed it and fixed it in `8a5cec5a2dd`. Nothing was left unaddressed.

**P2, confirmed:** identical duplicate data params that have child elements were rejected as conflicting. `__parse_param_elem` stores each `<edit_attributes>` child as an XML Element, which compares by identity, and gives every `<composite_data>` param its own generated `_COMPOSITE_RENAMED_…` UUID rename. So `_resolve_matching_inputs` dict-equality called byte-identical copies different. Reproduced at profile 25.1: two identical `<param name="input" value="x"><edit_attributes type="name" value="renamed"/></param>` made the test error at load.

Fix:
- `_comparable_test_input` compares the value plus attributes, with `edit_attributes` elements turned into attribute dicts and generated composite renames dropped.
- The rename prefix is now `COMPOSITE_DATA_RENAME_PREFIX` in `parser/util.py`, shared with `xml.py`.

Tests:
- Parametrized red→green test that identical duplicates with `edit_attributes` or `composite_data` are tolerated.
- Guard test that differing `edit_attributes` values are still rejected.

This also fixes the same false rejection on the pre-existing unqualified-duplicate path (5a443294512), which shares `_resolve_matching_inputs`.

<details><summary>Raw output</summary>

```json
{"severity": "P2", "category": "correctness", "file": "lib/galaxy/tool_util/parameters/case.py", "line": 232,
 "title": "Identical dataset parameters with child attributes are rejected as conflicting",
 "failure_scenario": "For a profile 25.1 tool with a data parameter named input, specify <param name=\"input\" value=\"file.txt\"><edit_attributes type=\"name\" value=\"renamed\"/></param> twice. parse_tool_test_descriptions returns error=True with 'Ambiguous test parameter (input) specified more than once with different values'; a single copy succeeds. Reproduced the same false rejection with two identical parameters containing <composite_data value=\"part.txt\"/>.",
 "confidence": "certain"}
```

Coverage notes: reviewed case.py, visitor.py, parser/xml.py, interface.py, verify/parse.py, linters/tests.py and the tests. The sandbox blocked running the linter tests (no temp files).
</details>
