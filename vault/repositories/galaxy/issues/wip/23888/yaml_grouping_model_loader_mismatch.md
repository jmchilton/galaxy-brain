# YAML section and repeat definitions validate but fail in the production loader

Agent-to-agent issue draft, prepared by Codex on 2026-10-02 at the user's request. Queue only; not posted to GitHub.

## Problem and evidence
Review of Galaxy PR #23877 at b4740908f881f524610313d925d644727a092be2 exposed a model/parser contract failure. YamlGalaxyToolParameter accepts a section or repeat with children under parameters:. Passing its model_dump(exclude_none=True) through the production parser and input_models_for_tool_source fails:
- repeat: KeyError: 'blocks'
- section: UnknownParameterTypeError: Unknown Galaxy parameter type section

Both outcomes were reproduced locally against that commit, using the repository Python environment. This was a parser/model check, not a server execution.
The existing test_repeat_of_data and test_section_recurses in test/unit/tool_util/test_yaml_parameters.py exercise model conversion via to_internal(), not this loading boundary.

## Reproduction
For each type in ("repeat", "section"), validate:
    {"name": "group", "type": TYPE, "parameters": [{"name": "n", "type": "integer", "value": 1}]}
Then call input_models_for_tool_source(YamlToolSource({"inputs": [model.model_dump(exclude_none=True)]})).

## Implementation pointers
- lib/galaxy/tool_util_models/yaml_parameters.py: YAML authoring models and to_internal().
- lib/galaxy/tool_util/parser/yaml.py: YamlInputSource.parse_input_type recognizes only repeat and conditional as groupings; parse_nested_inputs_source reads blocks.
- lib/galaxy/tool_util/parameters/factory.py: converts production input sources.
- lib/galaxy/tools/__init__.py: production tool grouping construction also needs coverage.

## Intended change
Make the advertised model representation loadable: parameters: for repeat children and proper section handling. Prefer the database-backed model representation as canonical. The user explicitly wants convergence of in-repository disk YAML fixtures toward this shape; do not add permanent duplicate spellings solely to preserve the experimental fixture syntax.

This is a bug fix, not a new tool-profile behavior. Coordinate with the proposed broader disk/database YAML convergence effort so it does not introduce a second normalization implementation.

## Acceptance and meaningful tests
- Cross the full authoring-model -> dumped definition -> parser -> actual tool-loading boundary.
- Execute a tool using a section, a repeat, and nested repeats; assert values in the produced file.
- Exercise database creation/reload, not only to_internal().
- If disk YAML fixtures are converted from blocks:, preserve their runtime assertions.
- Update #23877's warning: this is a known bug until fixed, not an intentional feature limitation.

## Related
PR: https://github.com/galaxyproject/galaxy/pull/23877
Pinned parser: https://github.com/galaxyproject/galaxy/blob/b4740908f881f524610313d925d644727a092be2/lib/galaxy/tool_util/parser/yaml.py#L549
