# Debrief: workflow import IntegrityError with embedded UDTs

Source: `workflow_import_udt_after_output_integrity_error.md`. Proposal: `proposed_workflow_import_udt_after_output_integrity_error.md`.

## Research

- Re-checked every code ref on `origin/dev` `557e7f32783`. The chain holds: `WorkflowOutput`/`PostJobAction` `__init__` set the `workflow_step` relationship, so `sa_session.add(m|pja)` cascades the unattached step into the session (workflows.py:2281, modules.py:2829). `workflow.steps = steps` runs at workflows.py:1133, after the loop. `create_unprivileged_tool` (tools.py 202-223) commits in `base.create` (line 492, flush defaults True) and again at 222.
- Admin `create_tool` also commits through `self.create()`. Inferred from code, not reproduced; the issue says so.
- gxformat2 to_native sets `tool_uuid: null` for UDT steps, so format2 imports always create the tool.
- No duplicate issues or fixing PRs found (searched IntegrityError/workflow_step.workflow_id and UDT workflow import).
- The source draft got #22704's date wrong (said merged 2026-10-23). It merged 2026-05-19, and it *added* the embedded-`GalaxyUserTool` → `create_unprivileged_tool` branch, which I confirmed from the PR diff. #19434 added UDTs.
- The repro files (foundry `phase13/`) are gone from disk. The 6 cases were run on `b18269a10f84` and haven't been re-run on dev. The code path is unchanged.

## Rewrite

- Restructured per `GX_ISSUE_DESCRIPTIONS.md`: a one-line opener, then the case table up front (show first). Workflow YAML, traceback and the causal walk are in `<details>`.
- Removed the local foundry path and the "pick one" fix list. The pre-pass (like `__load_subworkflows`) is the Proposed Approach, with the flush-only and defer-add options as alternatives.
- Review subagent: fixed the Context attribution (#22704, not #19434, added the import branch). It moved the red-test location to `test_workflows.py`, since `test_unprivileged_tools.py` has no `workflow_populator` and the existing UDT import tests live in `test_workflows.py` with `dataset_populator.user_tool_execute_permissions()`. It also softened "any real workflow" and added a ref to `base.create` line 492.

## Leftovers

- No re-run on dev. Optional: write the red API test (case A) before posting, to confirm on dev and give the fix a test to start from.
- With autoflush, a query in `ensure_can_use_unprivileged_tool` might flush before `base.create` commits. The traceback frame could differ on dev, but the error would be the same.
