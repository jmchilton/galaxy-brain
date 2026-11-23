The one-way doors are a new public YAML input type (`reference_data`), the `ReferenceData` runtime JSON shape that tool expressions (`$(inputs.x.path)`, `.metadata`, `.source`) will bind to, and a new admin-facing `user_accessible` attribute on tool data tables; once user and admin tools are written against these, their names and shapes are hard to change.

<details><summary>Risk Details</summary>

- `reference_data`, `table`, `filter.from_input`, `filter.on_metadata` and `multiple` become part of the YAML tool authoring schema (`ToolSourceSchema.json`, authoring help) for both `GalaxyTool` and `GalaxyUserTool`.
- The runtime object (`class: ReferenceData`, `path`, `basename`/`nameroot`/`nameext`, `source.{table,value}`, `metadata` as all other named columns) is a contract tool authors script against; adding columns to a table silently changes `metadata`, and renaming `class` or flattening `metadata` later breaks tools.
- `user_accessible` on `tool_data_table_conf.xml` is a new admin config knob and a security boundary; it is OR-merged across merged table definitions, stripped from Tool Shed configs, and checked at form time and job time. Admins will start relying on its semantics.
- Load-path divergence (issue #23888): `parse_dynamic_options` exists only on `CanonicalYamlInputSource`, so the type works only for `yaml_origin` tools; a disk YAML tool on the legacy `YamlInputSource` path fails with "reference_data is only supported in YAML tools". Whether disk, admin API, user API and stored-reload all take the canonical path is what decides consistent behavior.
- The parameter is modeled as `SelectParameterModel` plus an optional `reference_data` config rather than its own model type, so every select consumer (workflow editor, tool form, request/job_internal validation) sees a plain select; the dialect split from #23888 is extended rather than closed.
- Two runtime paths resolve entries: `runtimeify` (validated state) and a new `visit_input_values` pass on the deprecated `to_cwl` path, gated on `tool.has_data_table`; they can drift.
- Stored jobs/workflows record only the table entry `value`; if an admin removes or renames the row, or later turns off `user_accessible`, reruns and workflow invocations fail at job time.
- Shared `DataMetaFilter` change (deferring column index resolution for not-yet-loaded tables) touches existing XML tool behavior, though it looks backward compatible.

</details>

<details><summary>Risk Review Advice</summary>

Reviewers should settle the `ReferenceData` runtime shape and the YAML field names now, since tools will bind to them, and confirm they match how `File` inputs look so the two can evolve together. Check that every YAML load path (disk, admin `from_path`, admin API, user API, stored reload from the database) produces a canonical-dialect source so `reference_data` behaves the same everywhere, ideally with a test per path, in the spirit of #23888.

The `user_accessible` gate deserves a human read: default-off, Tool Shed stripping, merge semantics, and that both the form and job-time checks key off the same `trusted` notion (`parse_class() != "GalaxyUserTool"`). Exposing a table also exposes its paths and all column values to any user's container, which admins should understand from the docs.

</details>
