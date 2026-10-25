# Normal review 2 (post re-scope)

**Acted on:** both bugs (comma-free values no longer warn; `string_as_bool` + `_parse_name` for multiple/argument-only params) with red-to-green fixture cases, folded into the linter commit (`2d81ad155af`); shortened message. Confirmed the two `multi` `value_json` framework cases ran green (6 passed with `multi_select`). **Not acted on:** last-segment name matching (same looseness as `TestsParamInInputs`, fine for a warning); `value_json` cases passing on base is noted for the PR text - they back the docs, not the fix.

**Verdict: good to go after one small linter fix.** The re-scope (linter, xsd docs, `value_json` framework cases) fits the plan and is accurate. `TestsParamMultipleSelectCommaOptions` has one real false positive. It warns on comma-free `value=` strings, and planemo lint defaults to `--fail_level warn`, so this would fail IUC-style CI on valid tests. Its `multiple` check is also narrower than Galaxy's own bool parsing. Both fixes are about 10 lines and reuse helpers already in `linters/inputs.py`. Parse fix (skimmed) is unchanged from review 1. Linter unit suite passes (87 passed, 1 skipped). Linting `select_comma_value.xml` itself raises no new warnings or errors, and `TestsCaseValidation` accepts the `value_json` lists.

## Bugs

1. **False positive on comma-free values.** `<param name="m" value="c"/>` on a multiple select with options `a,1` and `c` warns, but nothing gets split (probe confirmed). Only warn when the test value contains a comma.
2. **`[@multiple='true']` misses other truthy spellings.** `multiple="True"`, `"yes"` and `"1"` are all multiple to Galaxy (`get_bool` -> `string_as_bool`), and sibling linters in `inputs.py` use `string_as_bool(param.attrib.get("multiple", "false"))`. Probe: `True`/`yes` give no warning. Same fix also picks up argument-only params (`argument="--m"`, no `name`), which `[@name]` skips. Reuse `_parse_name` as `inputs._iter_param` does.

Fix diff (`lib/galaxy/tool_util/linters/tests.py`):

```diff
-from galaxy.util import asbool
+from galaxy.util import (
+    asbool,
+    string_as_bool,
+)
+from ..parser.util import _parse_name
 from ._util import is_datasource
@@ class TestsParamMultipleSelectCommaOptions(Linter):
-        comma_selects = {
-            param.attrib["name"]
-            for param in tool_xml.findall(".//inputs//param[@type='select'][@multiple='true'][@name]")
-            if any("," in option.attrib.get("value", "") for option in param.findall("option"))
-        }
+        comma_selects = {
+            _parse_name(param.attrib.get("name"), param.attrib.get("argument"))
+            for param in tool_xml.findall("./inputs//param[@type='select']")
+            if ("name" in param.attrib or "argument" in param.attrib)
+            and string_as_bool(param.attrib.get("multiple", "false"))
+            and any("," in option.attrib.get("value", "") for option in param.findall("option"))
+        }
@@
             for param in test.findall(".//param[@value]"):
+                if "," not in param.attrib["value"]:
+                    continue
                 name = param.attrib.get("name", "").split("|")[-1]
```

Test: in `TESTS_PARAM_MULTIPLE_SELECT_COMMA_OPTIONS`, add a comma-free option (e.g. `<option value="c">C</option>`) to `multi` and a test with `<param name="multi" value="c"/>` that must not warn. Add a `multiple="True"` select with comma options that must warn. That makes the test red-to-green for both bugs.

## Nits

- **Message length/style.** Sibling messages are one clause ("Test N: Test param X not found in the inputs"). Suggest `Test {test_idx}: Test param {name} is a multiple select with commas in option values, use value_json with a list instead of value`.
- **Flat name matching.** The last-`|`-segment match against a flat set of names can false-positive when a non-multiple param elsewhere (another conditional branch or section) has the same name. `TestsParamInInputs` has the same looseness, so this is fine for a warning. Not worth path-resolving.
- **`value_json` framework cases aren't red-to-green.** On base, `split_if_str` leaves lists alone, so both new `multi` cases pass before the branch too. They pin the documented workaround, which is fine, but the PR text shouldn't present them as covering the fix.
- **Unrun.** Per instructions I didn't run the framework tests. Confirm the two new `multi` cases were run green (`has_line "x,1,y,2"` relies on Cheetah's comma join of the multi-select value).

<details>

**Linter correctness**
- XPath `.//inputs//param[...]` covers params in sections/conditionals/repeats. Macros are expanded by `XmlToolSource.xml_tree`.
- Test side `.//param[@value]` reaches nested `<conditional>/<section>/<repeat>` test blocks. `name.split("|")[-1]` handles `c|m`. Probes confirmed both warn.
- `value_json` is correctly excluded because of `[@value]`.
- Dynamic options (`<options from_...>`) aren't resolvable here. Static-only is consistent with the scope evaluation.
- Level: warn is right. The value might still work if the split pieces happen to be legal options, and it matches sibling test linters (`TestsExpectNumOutputs`). Error would be too strong for an ecosystem-wide release-branch linter.
- Linter-count test 142 -> 143 is correct. The test asserts the exact message list filtered by linter name, which is strict enough.

**xsd wording.** Checked against `verify/parse.py::_test_value_as_list`: non-multiple, non-data values are wrapped as `[value]`, not split, so "used as given, so it may contain commas" is accurate on the legacy path. The validated path agrees: `SelectParameterModel.split_str` is attached only when `multiple`, and `case.py` splits only multiple params. `value_json` lists pass unchanged through `split_if_str` and through server `SelectToolParameter.from_json` (per-element legal check). The earlier "comma separated list" sentence for multiple selects stays true and the new paragraph qualifies it. Fine.

**Framework tool.** `multi` is `optional="true"`, so the older tests that don't set it still validate. Linting the tool raises only pre-existing-style warnings (duplicate labels, empty help, citations). Test-case validation accepts the `value_json` lists.

**Reuse.** The main reuse miss is `string_as_bool` + `_parse_name` (both already used by `linters/inputs.py`), folded into the bug fix above. No new abstraction is needed for one linter.

**Imports.** The current code adds none. The suggested fix adds top-level imports.

</details>
