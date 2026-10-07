# Framework `parameters/` test tools use `ext=` on data inputs, which Galaxy ignores and the tool XSD rejects

Fourteen framework test tools in `test/functional/tools/parameters/` declare data inputs with `ext="…"` instead of `format="…"`, so their intended datatype restrictions silently don't exist and the tools fail schema validation.

```diff
 <!-- test/functional/tools/parameters/gx_select_dynamic.xml -->
-<param name="ref_parameter" type="data" ext="txt" >
+<param name="ref_parameter" type="data" format="txt" >
```

The XSD accepts `ext` only on `<discover_datasets>`, not on input params. For inputs, `XmlInputSource.parse_extensions()` reads only `format` and defaults to `data`:

```python
# lib/galaxy/tool_util/parser/xml.py
def parse_extensions(self):
    return [extension.strip().lower() for extension in self.get("format", "data").split(",")]
```

So `ext="tabular"` and `ext="txt"` restrict nothing, and every one of these params accepts any datatype. The tool linter already says so:

```
.. ERROR (XSD): Invalid XML: Element 'param', attribute 'ext': The attribute 'ext' is not allowed.
```

| Tool | Attribute | Effect today |
|---|---|---|
| `gx_drill_down_code.xml` | `ext="tabular"` | ⚠️ intended restriction missing |
| `gx_select_dynamic.xml`, `gx_conditional_select_dynamic.xml`, `gx_repeat_select_dynamic.xml`, `gx_section_select_dynamic.xml` | `ext="txt"` | ⚠️ intended restriction missing |
| `gx_data.xml`, `gx_data_optional.xml`, `gx_data_multiple.xml`, `gx_data_multiple_optional.xml`, `gx_section_data.xml`, `gx_hidden_data.xml`, `gx_data_collection.xml`, `gx_data_collection_list.xml`, `gx_data_collection_optional.xml` | `ext="data"` | ✅ same as default, XSD-invalid only |

⚠️ behavior differs from what the tool author intended; ✅ behavior unaffected.

The pattern started with `gx_data.xml` in 5359f8ba746 ("Input parameter schema.", 2024-06-28) and has been copied into new tools since, most recently `gx_hidden_data.xml` (2026-03). Nothing catches it: `.ci/validate_test_tools.sh` (the CircleCI `validate_test_tools` job) validates only top-level `test/functional/tools/*.xml`, never `parameters/`.

<details><summary>All XSD failures in <code>parameters/</code> on current dev (17 of 99 tools)</summary>

Beyond the 14 `ext=` tools, macro-expanded validation (same as `scripts/validate_tools.sh`) reports:

| Tool | Error | Nature |
|---|---|---|
| `gx_drill_down_code.xml` | `inputs`: character content not allowed | Typo: a stray `g` before the second `<param>` (already fixed on the 🌿 branch below) |
| `gx_section_boolean.xml`, `gx_section_data.xml`, `gx_section_select_dynamic.xml` | `section`: attribute `title` required | Tool sloppiness; `title` is optional at runtime |
| `gx_repeat_select_dynamic.xml` | `repeat`: attribute `title` required | Same; runtime falls back to `name` |
| `gx_rules.xml` | `type="rules"` not in param type enum | XSD gap; `rules` is a real param type |
| `gx_drill_down_exact_with_selection.xml` | drill_down `option`: attribute `selected` not allowed | XSD gap; `_recurse_drill_down_elems` reads `selected` |

Reproduce from a Galaxy checkout:

```sh
. .venv/bin/activate; export PYTHONPATH=lib
for t in test/functional/tools/parameters/*.xml; do
  grep -q "<tool" "$t" || continue
  python -c "import galaxy.tool_util.loader, lxml.etree, sys; lxml.etree.dump(galaxy.tool_util.loader.load_tool(sys.argv[1]).getroot())" "$t" \
    | xmllint --nowarning --noout --schema lib/galaxy/tool_util/xsd/galaxy.xsd - 2>&1 \
    | grep "validity error" | sed "s|^|$(basename $t): |"
done
```

</details>

## Context

Found while working on 🌿 [issue_18642_framework_tool_coverage](https://github.com/jmchilton/galaxy/tree/issue_18642_framework_tool_coverage), which addresses 🎯 #18642 (framework tool coverage) and fixes drill_down XSD gaps (`from_file`, `display="checkbox"`) for a new framework tool; it also removes the stray `g` in `gx_drill_down_code.xml`. The rest of this cleanup was kept out of that branch's scope.

## Proposed Approach

Make every `parameters/` tool XSD-valid, then add `parameters/*.xml` to `.ci/validate_test_tools.sh` so it can't drift back: drop `ext="data"` (it's the default), switch `ext="txt"`/`ext="tabular"` to `format=`, add `title` to the sections/repeat, and extend the XSD for `type="rules"` and drill_down `option selected`, which the runtime already supports.

<details><summary>Details</summary>

- Switching to `format="txt"`/`format="tabular"` turns on real restrictions. The tools' own tests use matching test-data (`simple_line.txt`, `1.tabular`), and `test/unit/tool_util/parameter_specification.yml` has no entries for these five tools, but the framework tool tests should be rerun to confirm.
- The XSD additions should land with or after the drill_down XSD fixes on the 🌿 branch above to avoid conflicts; that branch also fixes the stray `g`, leaving 16 failing tools.

</details>

## Alternative Approaches

We could fix only the `ext=` attributes, or only extend CI with an exclude list, but either leaves the other half to rot: fixes without CI coverage regress (the pattern was copied forward for two years), and CI with an exclude list hides the real XSD gaps (`rules`, `selected`). Doing both together is a small, mechanical change.

<details><summary>Alternatives In Detail</summary>

### Alternative: Accept `ext` as an alias for `format` on input params

<details><summary>Description</summary>

#### Details

Teach `parse_extensions()` and the XSD to accept `ext` on inputs, matching `<discover_datasets>`.

#### Why the proposed approach is preferred

It adds a second spelling to the tool language to accommodate test-tool typos; third-party tools have never needed it, and it would change behavior of these tools anyway.

</details>

### Alternative: Extend CI with an exclude list, fix later

<details><summary>Description</summary>

#### Details

Add `parameters/*.xml` to `.ci/validate_test_tools.sh`, excluding the failing tools.

#### Why the proposed approach is preferred

The fixes are small enough to do at once, and an exclude list tends to become permanent.

</details>

</details>
