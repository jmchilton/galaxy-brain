---
pr: 23877
upstream_base_branch: dev
record: galaxy/branches/tool_parameter_references
---
# Tool parameter references developer docs

- [PR #23877](https://github.com/galaxyproject/galaxy/pull/23877) · [branch record](../../../../repositories/galaxy/branches/active/tool_parameter_references/index.md)

Developer reference for how tools, APIs and workflows name nested tool parameters; groundwork for [#23444](https://github.com/galaxyproject/galaxy/issues/23444). The rough edges it documents get fixed as children, then the doc is refreshed.

## Children

- [`upgrade_advice_structured_like`](../../../../repositories/galaxy/branches/active/upgrade_advice_structured_like/index.md) — [#24524](https://github.com/galaxyproject/galaxy/pull/24524) · `open` · `prerequisite` — `structured_like` upgrade advice names the right profile ([#23884](https://github.com/galaxyproject/galaxy/issues/23884)).
- [`issue_23891_output_reference_resolver`](../../../../repositories/galaxy/branches/active/issue_23891_output_reference_resolver/index.md) — `wip` · `prerequisite` — `format_source`/`metadata_source` resolved against declared inputs ([#23891](https://github.com/galaxyproject/galaxy/issues/23891)).
- [`issue_23902_qualified_output_references`](../../../../repositories/galaxy/branches/active/issue_23902_qualified_output_references/index.md) — `wip` · `prerequisite` — Unqualified output references fail from 26.2 ([#23902](https://github.com/galaxyproject/galaxy/issues/23902)); stacked on the #23891 branch.
- [`yaml_tool_model_validation_26.1`](../../../../repositories/galaxy/branches/active/yaml_tool_model_validation_26.1/index.md) — `wip` · `prerequisite` — YAML tools validate against their authoring model ([#23888](https://github.com/galaxyproject/galaxy/issues/23888)).
- [`yaml_boolean_defaults`](../../../../repositories/galaxy/branches/merged/yaml_boolean_defaults/index.md) — [#24365](https://github.com/galaxyproject/galaxy/pull/24365) · `merged` · `prerequisite` — First [#23888](https://github.com/galaxyproject/galaxy/issues/23888) slice.
- [`type_source_nested_inputs`](../../../../repositories/galaxy/branches/merged/type_source_nested_inputs/index.md) — [#23890](https://github.com/galaxyproject/galaxy/pull/23890) · `merged` · `prerequisite` — `type_source` in conditionals and `_<digit>` names ([#23886](https://github.com/galaxyproject/galaxy/issues/23886)).
- [`issue_23896_rename_input_segments`](../../../../repositories/galaxy/branches/merged/issue_23896_rename_input_segments/index.md) — [#23918](https://github.com/galaxyproject/galaxy/pull/23918) · `merged` · `prerequisite` — Rename `#{input}` no longer suffix-matches ([#23896](https://github.com/galaxyproject/galaxy/issues/23896)).
- [`issue_23900_rename_single_pass`](../../../../repositories/galaxy/branches/merged/issue_23900_rename_single_pass/index.md) — [#23943](https://github.com/galaxyproject/galaxy/pull/23943) · `merged` · `prerequisite` — No literal `#{...}` after an empty placeholder ([#23900](https://github.com/galaxyproject/galaxy/issues/23900)).
- [`fix_format_source_docs`](../../../../repositories/galaxy/branches/merged/fix_format_source_docs/index.md) — [#23919](https://github.com/galaxyproject/galaxy/pull/23919) · `merged` · `prerequisite` — `format_source` docs fix.

Queued issues with no branch yet: [#23895](https://github.com/galaxyproject/galaxy/issues/23895) (`fill_defaults` nested connections), [#23981](https://github.com/galaxyproject/galaxy/issues/23981) (rename `#{name }` padding).

## Decisions

- 2026-11-01, John: merge now. The doc describes dev as it is, with inline links to the open issues and PRs that will change it; refresh it as children land.
