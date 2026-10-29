```yaml
documents:
  - path: vault/repositories/galaxy/issues/wip/23888/proposed_converge_yaml_disk_and_database_representation.md
    why: Umbrella pitch; slices 3-5 (convert fixtures, one construction path, strict authoring/scalar outputs) are this branch; parser-site table, fixture inventory, stored-row policy (lift_user_tool_source for user rows, nothing for GalaxyTool rows).
  - path: vault/repositories/galaxy/issues/wip/23888/reject_unknown_yaml_dataset_output_fields.md
    why: Spec for the IncomingToolOutputDataset extra="forbid" change; acceptance list (typo rejected, format_source/metadata_source survive dump/reload, collection outputs stay strict) and the warning to inventory incoming vs internal models before forbidding globally.
  - path: vault/repositories/galaxy/branches/active/yaml_boolean_defaults/implementation_debrief.md
    why: Prior merged slice (#24365) on the same parser; canonical vs legacy dialect via is_yaml_origin/CanonicalYaml* sources, fixtures already touched, and contract-test module/helpers to reuse for red-first tests.
    load_when: Writing tests or deciding what the parser may still accept for class-less YAML.
  - path: vault/repositories/galaxy/branches/active/yaml_boolean_defaults/implementation_rescope_debrief.md
    why: Repeat/section canonical loading and strictify decisions; tells you which model-vs-loader mismatches are already closed so validation does not re-open them.
    load_when: Seeing failures from newly strict validation on repeat/section fixtures.
  - path: vault/research/Component - User-Defined Tool Source Validation.md
    why: The authoring contract being enforced at parse time (YamlToolSource vs UserToolSource, extra="forbid" base, yaml_parameters narrow unions, test fixture corpus in section 7); predates lift_user_tool_source and the parser trust gate, so check class names against release_26.1.
    load_when: Understanding which dialect keys the models reject (command, when, display, blocks, numeric version) and converting fixtures.
  - path: vault/research/PR 22615 - UserToolSource Pydantic Semantic Validation.md
    why: Where model validators (id pattern, input refs, output claims) run and the existing parser call YamlToolSource(root_dict); new parse-time validation inherits those checks and error shapes.
    load_when: Choosing exception type/wording raised from YamlToolSource.__init__ and what API callers surface.
  - path: vault/research/Component - User-Defined Tools.md
    why: GalaxyTool (admin) vs GalaxyUserTool trust split, dynamic tool storage and loading, which affects how stored GalaxyTool rows fail loud.
    load_when: Reasoning about stored-row failure paths (tools/__init__.py loading, ToolMissingException).
  - path: vault/repositories/galaxy/branches/active/issue_24530_atomic_embedded_tool_import_26.1/brain_research.md
    why: Code observations on every caller that creates dynamic tools (embedded workflow tools, copy_workflow_for_user, agents, api/dynamic_tools.py) and their tests; all hit YamlToolSource construction so the new validation can break them.
    load_when: Auditing callers and unit/API tests that pass raw tool dicts (e.g. embedded YAML in unit tests).
research_requests:
  - vault/agents/gx_research/todo/yaml_tool_parser_authoring_boundary.md
```

## Code observations (not in any note; verified at worktree HEAD 19281d57645, release_26.1)

- `YamlToolSource` is built at: `parser/factory.py` (raw-source factory line ~57, disk `source_path` ~104), `webapps/galaxy/api/dynamic_tools.py:214` (`from_path`), `managers/tools.py:69` (`tool_payload_to_tool`), `tools/__init__.py:697` (stored-row load), `tool_util/lint.py:348`. Unit tests constructing it directly: `test/unit/tool_util/test_parsing.py` (957, 993, 1025), `test_user_tool_parser_trust.py`, `test_container_shape_lint.py`, `test_user_tool_source_validation.py:157`, `test/unit/app/tools/test_tool_render_output_label.py`, `test_metadata.py:271`.
- Parser `__init__` today (`parser/yaml.py:82`) only runs the user-tool root-key trust check (`USER_TOOL_ROOT_KEYS`, `UntrustedToolSourceError`); `is_yaml_origin()` is true for both `GalaxyTool` and `GalaxyUserTool`, class-less YAML is untouched. `test_parsing.py:957` builds `YamlToolSource({"outputs": {"output": ...}})` class-less, so it stays valid.
- Stored user rows: `tools/__init__.py:515` `_lift_stored_user_tool` runs `lift_user_tool_source` (drops `extra_forbidden`/unsupported validators, raises `ToolMissingException` when invalid). `GalaxyTool` rows have no such step, so new parse-time validation makes them fail loud; `webapps/galaxy/api/tools.py:896` and `dynamic_tools.py:93` also call the lift.
- `tool_util_models/tool_outputs.py`: `IncomingToolOutputDataset` (line ~211) has no `extra="forbid"`; `IncomingUserToolOutputDataset` (~383) and `IncomingToolOutputCollection` (~338) do. Scalar `IncomingToolOutputText/Integer/Float/Boolean` live at ~728-756 (plus internal `ToolOutputText...` ~706-718); check generated schema/client (`schema.ts`, OpenAPI dump) and docs references when removing them from the incoming union.
- Fixtures to convert are in the issue's inventory; `lib/galaxy_test/base/data/minimal_tool_no_id.json` and the `from_path` API test use the raw path.
