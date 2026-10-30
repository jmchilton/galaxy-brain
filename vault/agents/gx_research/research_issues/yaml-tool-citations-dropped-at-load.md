# YAML tools validate `citations` but never load them

- Area: lib/galaxy/tool_util/parser/yaml.py
- Found while: [[Component - Tool Citations and External Metadata Fetch]]
- Galaxy SHA: 65e6daff
- Severity: low

## Problem

`_DynamicToolSourceBase`, the base of both `UserToolSource` and the admin `YamlToolSource` model, declares `citations: list[Citation] | None` (`tool_util_models/_models.py:159, 225-228`), and `Citation._check_citation_shape` validates each entry (`tool_util_models/tool_source.py:239-278`). `YamlToolSource` (`tool_util/parser/yaml.py:79`) doesn't override `parse_citations`, though, so it inherits `ToolSource.parse_citations`, which returns `[]` (`parser/interface.py:421-423`). Only `XmlToolSource` implements it (`parser/xml.py:741-768`).

Effects at this SHA:

- `Tool._parse_citations` (`tools/__init__.py:1862-1871`) gets no citations for any YAML tool, so `to_json` reports `"citations": false` and the tool form footer shows no references.
- `parse_tool` / `ParsedTool.citations` (`tool_util/model_factory.py:38`) is empty for YAML tools, so the Tool Shed tool page lists none.
- An author can write citations, see them validated (and rejected if malformed), and then never see them displayed.

## Evidence / repro

- Read in code (`grep -rn "def parse_citations" lib` finds only `interface.py` and `xml.py`). The unit tests in `test/unit/app/test_agents.py:2181` create user tools with `citations` but never check that they load.
- An in-flight galaxy-brain branch record (`yaml_tool_model_validation_26.1`) adds a shared `ToolSource._parse_citation_list` and a YAML `parse_citations`. It isn't on `dev` at this SHA.

## Suggested fix

Implement `YamlToolSource.parse_citations`, building `Citation` models from `root_dict["citations"]` with the same profile rule as XML. Add a parse test and an API test that `GET /api/tools/{id}/citations` returns them for a YAML tool.
