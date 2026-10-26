# Workflow import fails with IntegrityError when an embedded user-defined tool follows a step with a workflow output or PJA

Uploading a format2 workflow fails with `500 IntegrityError: NOT NULL constraint failed: workflow_step.workflow_id` when an embedded `GalaxyUserTool` step comes after a step that has a workflow output or a post-job action.

| case | shape | `POST /api/workflows/upload` |
|---|---|---|
| A | UDT `a` → UDT `b`; workflow output on `a` | 500 ❌ |
| B | same, but the workflow output is only on `b` (last step) | 200 |
| C | case A wrapped in an embedded subworkflow | 500 ❌ |
| D | output only on `b`; `a` has a `rename` PJA | 500 ❌ |
| E | `a` is stock `cat1` with a workflow output; `b` is a UDT | 500 ❌ |
| F | output only on `b`; `a` has `doc:` (annotation) | 200 |

Whether a stock or user-defined tool comes first doesn't matter (E), and neither annotations (F) nor subworkflows (C vs. A) cause it on their own. What triggers it is a workflow output or a PJA on any step *before* an embedded UDT, so most real multi-UDT workflows hit it: a conversion of ncbi/egapx with 54 embedded UDTs and 7 subworkflows failed on every import attempt.

Setup: non-admin user with the `user_tool_execute` role, beta tool formats enabled. All six cases ran on a `planemo serve` Galaxy at `b18269a10f84`. The code below is unchanged on `dev` (`557e7f32783`).

<details><summary>Case A workflow</summary>

```yaml
class: GalaxyWorkflow
label: A
inputs:
  text_file: {type: data, format: txt}
outputs:
  o: {outputSource: a/out}
steps:
  a:
    run:
      class: GalaxyUserTool
      id: rpa_a
      version: 0.1.0
      name: rpa_a
      container: busybox:1.36.1
      shell_command: wc -l < '$(inputs.data_input.path)' > out.txt
      inputs: [{name: data_input, type: data, format: [txt]}]
      outputs: [{name: out, type: data, format: txt, from_work_dir: out.txt}]
    in: {data_input: text_file}
  b:
    run:
      class: GalaxyUserTool
      id: rpa_b
      version: 0.1.0
      name: rpa_b
      container: busybox:1.36.1
      shell_command: wc -l < '$(inputs.data_input.path)' > out.txt
      inputs: [{name: data_input, type: data, format: [txt]}]
      outputs: [{name: out, type: data, format: txt, from_work_dir: out.txt}]
    in: {data_input: a/out}
```

Posted as `POST /api/workflows/upload` with `{"workflow": <the YAML above as JSON>}`.

</details>

<details><summary>Traceback (case A)</summary>

```
workflows.py __api_import_new_workflow -> _workflow_from_dict
managers/workflows.py build_workflow_from_raw_description -> _workflow_from_raw_description -> __module_from_dict
workflow/modules.py from_dict -> ToolModule.from_dict
managers/tools.py create_unprivileged_tool -> managers/base.py create (session.commit)
sqlalchemy.exc.IntegrityError: (sqlite3.IntegrityError) NOT NULL constraint failed: workflow_step.workflow_id
```

</details>

<details><summary>Why</summary>

Steps are built one at a time and only attached to the workflow at the end, but building a UDT step commits the session mid-build.

1. `__module_from_dict` (`lib/galaxy/managers/workflows.py` ~2275) calls `step.create_or_update_workflow_output(...)` and then `sa_session.add(m)`. `ToolModule.save_to_step` (`lib/galaxy/workflow/modules.py` ~2829) does `sa_session.add(pja)` for each PJA. Both set the many-to-one `workflow_step` relationship, so `add` cascades the parent `WorkflowStep` into the session while its `workflow_id` is still unset.
2. `workflow.steps = steps` (`workflows.py:1133`) only runs after every step is built.
3. For each embedded `GalaxyUserTool` without a reusable `tool_uuid`, `ToolModule.from_dict` (`modules.py` ~2713-2726) calls `dynamic_tool_manager.create_unprivileged_tool(...)`. Format2 never carries `tool_uuid`, so a format2 import always creates the tool.
4. `create_unprivileged_tool` (`lib/galaxy/managers/tools.py` ~202-223) commits twice: once in `self.create(..., flush=True)` (`managers/base.py` ~492) and again after adding the `UserDynamicToolAssociation`. The first commit flushes the step from (1) → IntegrityError.

The admin path, `create_tool` (`modules.py` ~2730), also commits through `self.create(...)` (`flush` defaults to `True`), so admin imports with embedded `GalaxyTool` representations probably fail the same way. Not reproduced.

</details>

## Context

Bug found while importing a Foundry conversion of ncbi/egapx into Galaxy. Related to 🔀 #19434, which added user-defined tools, and 🔀 #22704, which added the embedded-`GalaxyUserTool` branch of `ToolModule.from_dict` that calls `create_unprivileged_tool`. The admin `create_tool` branch it sits beside predates both and commits the same way.

## Proposed Approach

Resolve or create every embedded UDT in a pre-pass before any `WorkflowStep` is built, the way `__load_subworkflows` already loads subworkflows first. Then no commit happens while there are half-built steps in the session. A red API test next to the existing UDT import tests in `lib/galaxy_test/api/test_workflows.py` would wrap uploads of cases A, C, D and E (`workflow_populator.upload_yaml_workflow`) in `dataset_populator.user_tool_execute_permissions()` and assert they succeed.

## Alternative Approaches

Making `create_unprivileged_tool` flush-only during import is smaller, but leaves `ToolModule.from_dict` doing database writes in the middle of the build. Moving the `add(m)` / `add(pja)` calls until after `workflow.steps` is set is the smallest change but the most fragile.

<details><summary>Alternatives In Detail</summary>

### Alternative: Don't commit inside `create_unprivileged_tool` during import

<details><summary>Description</summary>

#### Details

Give `create_unprivileged_tool` (and `create_tool`) a `flush`/`commit` flag. During import, flush only the new `DynamicTool` and `UserDynamicToolAssociation` rows, for example under `session.no_autoflush` in a nested transaction, so the outer import transaction commits everything together.

#### Why the proposed approach is preferred

Flushing still sends pending objects unless autoflush and ordering are handled carefully. The importer would still create tools as a side effect of building a step, which is also what dry-run and refactor paths call into.

</details>

### Alternative: Defer adding workflow outputs and PJAs to the session

<details><summary>Description</summary>

#### Details

Skip `sa_session.add(m)` / `add(pja)` in `__module_from_dict` and `save_to_step`, and let the cascade from `workflow.steps = steps` persist them.

#### Why the proposed approach is preferred

It only fixes the two cascades known today. Any other object added mid-build, or any new commit during step construction, brings the bug back.

</details>

</details>
