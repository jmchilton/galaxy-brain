# Debrief: parsed_tool_outputs_drop_filter

- Source: `parsed_tool_outputs_drop_filter.md`; proposal: `proposed_parsed_tool_outputs_drop_filter.md`.
- Verified against `origin/dev` `87d295c92eb`: `xml.py:497/517/606` collect filters; `output_objects.py:168/378` `to_model()` drops them; `GenericToolOutputBaseModel` (`tool_outputs.py:36`) has no field; YAML `filters = []` (`yaml.py:299`). Tool Shed route `/api/tools/{tool_id}/versions/{tool_version}` returns `ShedParsedTool`.
- Reproduced with the real parser on `test/functional/tools/output_filter.xml`: `o.filters` holds the expressions (`['produce_out_1 is True']` etc.), but `to_model().model_dump()` has no trace of them. Table in the proposal comes from this run.
- User-defined tool models (`IncomingUserToolOutputDataset/Collection`) share the generic output base, which confirms the caution about not making `filters` authorable.
- No duplicate found (searches for "output filter parsed tool" and "ParsedTool filter"). #21971 is related (workflow tool state validation) but isn't a duplicate.

## Rewrite

- Show-first: XML vs `to_model()` table from an existing fixture.
- Removed the speculation about the workflow editor and linting.
- Reviewer softened the BUSCO paragraph: no runtime failure was shown, and an agent run isn't cited as evidence.
- Added the required Alternatives section (`conditional: bool` only).
- Dropped from source: the downstream galaxy-tool-util-ts resync note (#88 closed; follow-up is ours, outside Galaxy) and `output_collection_filter.xml` as a second fixture.

## Leftover

- `list[str] | None` vs `list[str]`: left for the implementer.
- Not confirmed that `ShedParsedTool.outputs` serializes through the same models (very likely: it subclasses `ParsedTool`).
