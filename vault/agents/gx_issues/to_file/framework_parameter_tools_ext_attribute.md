# Framework `parameters/` tools use `ext=` on data params, which Galaxy ignores and the XSD rejects

Agent-to-agent issue draft. Found 2026-10-07 while polishing `issue_18642_framework_tool_coverage` (fixes #18642). That branch fixes the drill_down XSD gaps (`from_file`, `display="checkbox"`) and leaves this out of scope. John asked to hand it off separately.

## Symptom

14 of the 100 tools in `test/functional/tools/parameters/` declare data inputs with `ext="…"`. Galaxy's data param attribute is `format`, and `ext` is silently ignored:
- `XmlInputSource.parse_extensions()` (`lib/galaxy/tool_util/parser/xml.py` ~1473) reads only `format`, defaulting to `data`.
- So `ext="tabular"` or `ext="txt"` restricts nothing. Each of these params accepts any datatype.
- The XSD rejects the attribute: `Element 'param', attribute 'ext': The attribute 'ext' is not allowed.`

Affected files (all under `test/functional/tools/parameters/`):

```
gx_conditional_select_dynamic.xml  ext="txt"
gx_data.xml                        ext="data"
gx_data_collection.xml             ext="data"   (data_collection)
gx_data_collection_list.xml        ext="data"   (data_collection)
gx_data_collection_optional.xml    ext="data"   (data_collection)
gx_data_multiple.xml               ext="data"
gx_data_multiple_optional.xml      ext="data"
gx_data_optional.xml               ext="data"
gx_drill_down_code.xml             ext="tabular"
gx_hidden_data.xml                 ext="data"   (hidden_data)
gx_repeat_select_dynamic.xml       ext="txt"
gx_section_data.xml                ext="data"
gx_section_select_dynamic.xml      ext="txt"
gx_select_dynamic.xml              ext="txt"
```

Most date from `5359f8ba746` (2024-06-28, "Input parameter schema."). The pattern was copied into later tools.

## Why CI never caught it

`.ci/validate_test_tools.sh` validates only top-level `test/functional/tools/*.xml` with `scripts/validate_tools.sh`, which expands macros and then runs xmllint against `galaxy.xsd`. `parameters/` is never schema-validated.

## Other XSD failures in `parameters/`

Survey run 2026-10-07 on `issue_18642_framework_tool_coverage` (`1e8e1f9d97d`, dev-based), with macro-expanded validation identical to `validate_tools.sh`. 17 of 100 tools fail. The 14 above, plus:

| Tool | Error | Likely nature |
|---|---|---|
| `gx_section_boolean.xml`, `gx_section_data.xml`, `gx_section_select_dynamic.xml` | `section`: attribute `title` required | Test tool sloppiness. Is `title` actually required at runtime? Check before choosing between fixing the tool and relaxing the XSD. |
| `gx_repeat_select_dynamic.xml` | `repeat`: attribute `title` required | Same as above. |
| `gx_rules.xml` | `type="rules"` not in the param type enum | XSD gap. `rules` is a real (if niche) param type. |
| `gx_drill_down_exact_with_selection.xml` | drill_down `option`: attribute `selected` not allowed | XSD gap. The runtime supports it (`_recurse_drill_down_elems` in `parser/xml.py` ~1708 reads `selected`). John may fold this into the issue_18642 branch, so check that branch or PR before touching it. |

## Suggested scope

1. Replace `ext=` with `format=` in the 14 tools.
   - **Caution:** for `ext="tabular"` and `ext="txt"`, switching to `format=` starts restricting inputs. Check that those tools' tests and the spec entries in `test/unit/tool_util/parameter_specification.yml` still pass, since the spec uses `{src: hda, id: …}` and doesn't check datatypes. Also check the framework tool tests, whose inputs are mostly `.txt`/`.tabular` test-data files.
   - Dropping `ext="data"` (the default) is equivalent and is the simplest choice for those tools.
2. Decide per row on the other failures: fix the tool, or extend the XSD where the runtime supports the attribute (`rules`, drill_down option `selected`).
3. Optional: extend `.ci/validate_test_tools.sh` to cover `parameters/*.xml`, so this can't drift back. It needs (1) and (2) first, or an exclude list.

## Reproduce

```sh
. .venv/bin/activate; export PYTHONPATH=lib
for t in test/functional/tools/parameters/*.xml; do
  grep -q "<tool" "$t" || continue
  python -c "import galaxy.tool_util.loader, lxml.etree, sys; lxml.etree.dump(galaxy.tool_util.loader.load_tool(sys.argv[1]).getroot())" "$t" \
    | xmllint --nowarning --noout --schema lib/galaxy/tool_util/xsd/galaxy.xsd - 2>&1 | grep "validity error" | sed "s|^|$(basename $t): |"
done
```
