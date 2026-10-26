# Parsed tool output models drop `<filter>`, so API consumers see conditional outputs as always produced

The `ParsedTool` output models served by the Tool Shed (`/api/tools/{tool_id}/versions/{tool_version}`) don't include an output's `<filter>`, so there's no way to tell from them that an output might not be created.

| Tool XML (`test/functional/tools/output_filter.xml`) | `to_model()` on `dev` |
| --- | --- |
| `<data name="out_1" ...><filter>produce_out_1 is True</filter></data>` | `{"name": "out_1", "type": "data", "format": "txt", "hidden": false, ...}` |
| `<collection name="list_output" ...><filter>produce_collection is True</filter></collection>` | `{"name": "list_output", "type": "collection", "collection_type": "list", ...}` |

The parser reads the filters (`output.filters == ["produce_out_1 is True"]`), but `to_model()` never copies them across.

This matters for anything that builds workflows from parsed tool metadata instead of a live Galaxy, such as [galaxy-tool-util-ts](https://github.com/jmchilton/galaxy-tool-util-ts) and the tooling built on it. IUC BUSCO (`busco/5.8.0+galaxy1`) is a real example. `busco_sum` only exists when `'short_summary' in outputs`, but its parsed model looks unconditional, so tooling has no reason not to connect `busco_sum` to a workflow output or a required downstream input, which can't be satisfied when the filter is false.

<details><summary>Where the filters are dropped</summary>

- `lib/galaxy/tool_util/parser/xml.py:497`, `:517`, `:606` store `elem.findall("filter")` on the output objects.
- `ToolOutput.to_model()` (`lib/galaxy/tool_util/parser/output_objects.py:168`) and `ToolOutputCollection.to_model()` (`:378`) ignore `self.filters`.
- `GenericToolOutputBaseModel` (`lib/galaxy/tool_util_models/tool_outputs.py:36`) has no field to hold them.
- YAML tool sources always set `filters = []` (`lib/galaxy/tool_util/parser/yaml.py:299`).

</details>

## Proposed Approach

Add `filters: list[str] | None` (the raw expression text) to the parsed data and collection output models, and set it in both `to_model()` methods. Then regenerate the schema and client types. Because `GenericToolOutputBaseModel` is also the base for user-defined tool sources, the field should exist only on the parsed side, or be clearly read-only. Users must not be able to author Cheetah/Python filter expressions this way.

<details><summary>Test plan</summary>

A red unit test in `test/unit/tool_util/` that parses `test/functional/tools/output_filter.xml` and checks `outputs["out_1"].to_model().filters == ["produce_out_1 is True"]`, plus the same check for the `list_output` collection. Optionally, an API test against the parsed-tool endpoint.

</details>

## Alternative Approaches

A derived `conditional: bool` would be simpler for consumers, but it can't say *when* an output exists. Exposing the expression keeps that information, and a boolean can be added later if it turns out to be useful.

<details><summary>Alternatives In Detail</summary>

### Alternative: `conditional: bool` only

<details><summary>Description</summary>

#### Details

Set it to `True` when any `<filter>` is present, and don't expose the expression.

#### Why the proposed approach is preferred

Consumers that can evaluate simple expressions against known inputs (e.g. `outputs and 'short_summary' in outputs`) can decide whether an output will exist. A boolean only tells them to be cautious.

</details>

</details>
