# ParsedTool output models drop `<filter>`, so API/Tool Shed consumers can't tell an output is conditional

`<data>` / `<collection>` `<filter>` expressions are parsed, but they never reach the pydantic `ParsedTool` models. Every consumer of the Tool Shed TRS endpoint (`/api/tools/{trs_id}/versions/{version}`) or Galaxy's parsed-tool API sees a filtered output as unconditional. That includes galaxy-tool-util-ts (`galaxy-tool-cache`, gxwf), the Foundry agents built on them, and probably the workflow editor/linting.

Why it matters: an agent wiring a workflow can't see that `busco_sum` only exists when `outputs` contains `short_summary`. It wires the output as a workflow output or as a required downstream input, and the workflow fails at runtime when the filter is false. Found in a Foundry ncbi/egapx → Galaxy run: the cached summary of `toolshed.g2.bx.psu.edu/repos/iuc/busco/busco/5.8.0+galaxy1` lists `busco_sum` with no filter, and the agent wired it into workflow output `busco_results`. The same failure class appeared in a nf-core/sarek run.

## Cause (dev `557e7f32783`)

- The parser keeps the filters:
  - `lib/galaxy/tool_util/parser/xml.py:497`, `:517` (collection), `:606`: `output.filters = elem.findall("filter")`.
  - `yaml.py` 299-312 always sets `filters=[]`, so YAML tools carry no filters to begin with.
- `to_model()` drops them:
  - `lib/galaxy/tool_util/parser/output_objects.py:168` (`ToolOutput.to_model`).
  - `:378` (`ToolOutputCollection.to_model`).
  - `:230` (the integer/float/boolean/text outputs). Probably doesn't matter there.
- `lib/galaxy/tool_util_models/tool_outputs.py`: `GenericToolOutputBaseModel` (~line 35) has `name` / `label` / `hidden` but no filter field, so there's nowhere to put them.
- Downstream: galaxy-tool-util-ts vendors this schema (jmchilton/galaxy-tool-util-ts#88, "Sync ParsedTool schema with upstream Galaxy model") and fetches `ParsedTool` from the Tool Shed. It can't add the field until Galaxy does and the Tool Shed is redeployed.

## Example (tools-iuc `tools/busco/busco.xml`)

```xml
<data name='busco_sum' format='txt' ... from_work_dir="busco_galaxy/short_summary.specific.*.txt">
    <filter>outputs and 'short_summary' in outputs</filter>
</data>
<data name='busco_table_generic' format='tabular' ...>
    <filter>lineage['lineage_mode'] == 'auto_detect' and lineage['generic_results']</filter>
</data>
```

Today the parsed model for both outputs has no trace of the `<filter>`.

## Suggested change

- Add `filters: list[str] | None` (the raw expression text, `elem.text.strip()`) to the ParsedTool output models for data and collection outputs. Populate it in both `to_model()`s.
- Caution: `GenericToolOutputBaseModel` is shared with the user-defined tool (`GalaxyUserTool`) source models, and `<filter>` is a Cheetah/Python expression. Don't expose it as an authorable UDT field. Put it on the parsed/output-model side only, or mark it read-only. Decide this explicitly.
- Optional: a derived `conditional: bool`, so consumers needn't parse the expression.
- Regenerate the schema and client types; the Tool Shed serves the new field after deploy.
- Follow-up outside Galaxy, after release: resync the galaxy-tool-util-ts `ParsedTool` schema and surface `filters` in `galaxy-tool-cache summarize`.

## Suggested red test (not written or run)

Unit-level, in `test/unit/tool_util/` near the existing parser/output tests: parse a minimal XML tool with `<data name="out"><filter>flag</filter></data>` and assert `tool_source.parse_outputs(...)` → `to_model().filters == ["flag"]`. Optionally also an API test checking that the parsed-tool endpoint returns the field for a functional-test tool with a filtered output. Existing fixtures to reuse: `test/functional/tools/output_filter.xml` and `output_collection_filter.xml` (data and collection).
