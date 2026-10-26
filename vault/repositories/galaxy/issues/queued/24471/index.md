# galaxy#24471 — Workflow import IntegrityError with embedded UDT after output/PJA step

[Issue](https://github.com/galaxyproject/galaxy/issues/24471) · [draft](issue_draft.md) · [proposal](proposal.md) · [debrief](debrief.md)

Filed 2026-10-26, assigned to jmchilton. Found during Foundry ncbi/egapx → Galaxy conversion.

Cause: adding a workflow output or PJA puts its `WorkflowStep` in the session before `workflow.steps` is set. Then `create_unprivileged_tool` commits during `ToolModule.from_dict`, which writes the step with a null `workflow_id`.

Next: red API test in `lib/galaxy_test/api/test_workflows.py` (cases A, C, D, E; `dataset_populator.user_tool_execute_permissions()`). Then a pre-pass that creates/resolves embedded UDTs before steps are built, like `__load_subworkflows`. Not yet re-run on dev; the repro was on `b18269a10f84`.
