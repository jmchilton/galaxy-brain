# Importing a workflow 500s when an embedded user-defined tool follows a step with a workflow output or PJA

Importing a format2 workflow (`POST /api/workflows/upload`, or planemo's import) fails with `500 IntegrityError: NOT NULL constraint failed: workflow_step.workflow_id` when a step with a workflow output or post-job action is followed, in step order within the same (sub)workflow, by an embedded `GalaxyUserTool` step that Galaxy has to create. The importing user is non-admin and has a `user_tool_execute` role. Beta tool formats are on.

Found by a Foundry ncbi/egapx → Galaxy conversion: 54 embedded UDTs, 7 subworkflows. Every import attempt failed.

## Cause (dev `557e7f32783`, re-checked 2026-10-26; first seen on `b18269a10f84`)

- `lib/galaxy/managers/workflows.py` 2275-2281 (`__module_from_dict`): `step.create_or_update_workflow_output(...)`, then `trans.sa_session.add(m)`. The cascade puts the `WorkflowStep` in the session, but `workflow_id` is still unset.
- `lib/galaxy/workflow/modules.py:2829` (`ToolModule.save_to_step`): `sa_session.add(pja)` for each PJA. Same cascade.
- `workflows.py:1133`: `workflow.steps = steps` only runs after all steps are built.
- `modules.py` 2713-2726 (`ToolModule.from_dict`): every embedded `GalaxyUserTool` with no reusable `tool_uuid` calls `dynamic_tool_manager.create_unprivileged_tool(...)`. Format2 never carries `tool_uuid`, so a format2 import always creates the tool.
- `lib/galaxy/managers/tools.py` 202-223 (`create_unprivileged_tool`): `self.create(..., flush=True)` commits (`managers/base.py` `create`), then a second `session.commit()`. That commit flushes the pending step from the earlier step → IntegrityError.
- The admin path (`create_tool`, `modules.py` ~2727) probably has the same problem. Unverified.
- Related: #22704 ("Harden access control for user-defined tools", merged 2026-10-23) reshaped this branch but left the commit in place.

## Repro (all 6 cases run on a `planemo serve` Galaxy at `b18269a10f84`; non-admin key with the `user_tool_execute` role)

Minimal case A: two busybox UDTs `a → b`, with the workflow output on `a`:

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

`POST /api/workflows/upload` with `{"workflow": <the YAML above as JSON>}`.

| case | shape | result |
|---|---|---|
| A | top level; workflow output on `a`; UDT `b` after it | 500 |
| B | top level; output only on `b`, the last step (control) | 200 |
| C | A wrapped in an embedded subworkflow | 500 |
| D | output only on `b`; `a` has a `rename` PJA | 500 |
| E | `a` is the stock `cat1` with a workflow output; `b` is a UDT | 500 |
| F | output only on `b`; `a` has `doc:` / an annotation (control) | 200 |

Annotations don't trigger it, and neither do subworkflows on their own. A stock tool step with an output (E) does.

Trace (case A):

```
workflows.py __api_import_new_workflow -> _workflow_from_dict
managers/workflows.py build_workflow_from_raw_description -> _workflow_from_raw_description -> __module_from_dict
workflow/modules.py from_dict -> ToolModule.from_dict
managers/tools.py create_unprivileged_tool -> managers/base.py create (session.commit)
sqlalchemy.exc.IntegrityError: (sqlite3.IntegrityError) NOT NULL constraint failed: workflow_step.workflow_id
```

Repro files (gen.py, post.py, all 6 workflows, tracebacks): `foundry` worktree `casts/claude/_emulated-runs/ncbi-egapx/workflow-test-run/repro/phase13/`. The worktree is local and untracked.

## Likely fixes (pick one)

1. Pre-pass: create or resolve all embedded UDTs before any step objects are built, the way subworkflows are already loaded first (`__load_subworkflows`). Cleanest; no commit happens mid-build.
2. Have `create_unprivileged_tool` take a `flush`/`commit` flag and flush only the new tool rows (or run it under `session.no_autoflush` plus a nested transaction) when called during import.
3. Defer the `sa_session.add(m)` / `add(pja)` calls until `workflow.steps` is assigned. Fragile: any future mid-build commit breaks it again.

## Suggested red test (not written or run)

Add to `lib/galaxy_test/api/test_unprivileged_tools.py` (or `test_workflows.py`): grant the user the execute role, as the existing tests there do, then upload case A through `workflow_populator.upload_yaml_workflow` and assert a 200. It fails with a 500 today. Also run cases C, D and E with the same test so fix 3 can't cover only workflow outputs.
