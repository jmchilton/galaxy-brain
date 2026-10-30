# Dry-run workflow builds still create embedded tools and preload subworkflows

- Area: lib/galaxy/managers/workflows.py (`_workflow_from_raw_description`, `do_refactor`), lib/galaxy/workflow/modules.py (`ToolModule.resolve_tool_uuid`)
- Found while: [[Component - Workflow Import]]
- Galaxy SHA: 65e6daff
- Severity: low

## Problem

- `_workflow_from_raw_description` gates step-level subworkflow loading on `not dry_run` (`lib/galaxy/managers/workflows.py:1123`), but not the embedded-tool pre-pass (`:1132-1135`) or the top-level `subworkflows` preload (`:1108-1116`). Both commit: `resolve_tool_uuid` (`lib/galaxy/workflow/modules.py:2708-2730`) calls `create_unprivileged_tool` / `create_tool`, and `__build_embedded_subworkflow` (`:2472-2496`) calls `build_workflow_from_raw_description`, which commits (`:958`). A "dry run" is therefore not side-effect free.
- Refactoring is the common way to reach this. `do_refactor` (`:2547-2600`) exports the source version with `allow_upgrade=True`, then builds it detached twice (`_build_detached`, `:2602-2621`), and a non-dry-run refactor builds it a third time through `update_workflow_from_raw_description`.
- The export (`:1923-1935`) adds `tool_representation` to every dynamic-tool step. If the step's `content_id` is a uuid, which is the case for an admin `GalaxyTool` created without an `id` (`create_tool` uses `str(uuid)` as `tool_id`, `lib/galaxy/managers/tools.py:167-170`; `id` is optional on `YamlToolSource`), it nulls `content_id`, `tool_id` and `tool_uuid`. Each build then matches the admin branch of `resolve_tool_uuid` (representation, no id, no uuid):
  - For an admin, every refactor call, including `dry_run=true`, creates and commits up to three new public `DynamicTool` rows and loads each into the toolbox. A non-dry-run refactor repoints the step at the newest of these rows.
  - For a non-admin who owns such a workflow, every refactor raises `AdminRequiredException`.
- `PUT /api/workflows/{id}` passes the payload to `WorkflowUpdateOptions(**payload)` (`lib/galaxy/webapps/galaxy/api/workflows.py:524`), so `dry_run` can also be requested there. A dry-run update whose description has a `subworkflows` map (for example, format2 converted with `deduplicate_subworkflows`) commits hidden stored subworkflows.
- `test_refactor_upgrade_admin_dynamic_tool_step` (`lib/galaxy_test/api/test_workflows.py:12223`) uses an admin tool with an `id`, so `content_id` is not a uuid and the path is never exercised.

## Evidence / repro

As an admin with `enable_beta_tool_formats`, create a `GalaxyTool` through `POST /api/dynamic_tools` without `id`. Create a workflow whose tool step references it by `tool_uuid`. Count the rows from `GET /api/dynamic_tools`, call `PUT /api/workflows/{id}/refactor` with any action and `dry_run: true`, and count again. Then repeat the refactor as a non-admin owner of the same workflow.

## Suggested fix

- Skip creation in `resolve_tool_uuid` for detached builds. A dry run can build the module from the representation without persisting it, or resolve against the source step's existing `dynamic_tool`.
- In `do_refactor`, keep the source step's `tool_uuid` for internal exports, as is already done for user-defined tools, so the build resolves the existing row.
- Gate the `subworkflows` preload on `dry_run`, as the step-level subworkflow loading already is.
- Add a refactor test with an id-less admin dynamic tool that asserts the row count is unchanged after a dry run.

## Related

- [#24530](https://github.com/galaxyproject/galaxy/issues/24530) (non-atomic embedded-tool creation on import; its proposal notes that a dry run leaves created tools)
- `create-tool-commits-before-toolbox-load.md`
