# issue_24175_imported_invocation_step_params

Fixes [galaxyproject/galaxy#24175](https://github.com/galaxyproject/galaxy/issues/24175): `GET /api/invocations/{id}/request` (the **Rerun** button) returned a 500 for an imported invocation whose run had tool step parameters. Import copied the step parameter rows' raw step ids verbatim.

- Branch: `jmchilton/issue_24175_imported_invocation_step_params`.
- **Stacked on `issue_24178_subworkflow_step_params_export`** ([parent record](../issue_24178_subworkflow_step_params_export/index.md)). It reuses that branch's `WorkflowStep.step_parameters_by_index`/`_by_id`. The stack base is `dev` (88127f42979). It could be a `release_26.2` backport candidate; not acted on.
- Worktree: `/Users/jxc755/projects/worktrees/galaxy/branch/issue_24175_imported_invocation_step_params`
- Origin: item 2 of the `workflow_rerun_step_parameters` spike ([spike debrief](../workflow_rerun_step_parameters/spike_debrief.md)).
- [Implementation debrief](implementation_debrief.md) (final)
- [Initial implementation debrief](initial_implementation_debrief.md). Its unit-test and mock details were superseded by the test challenges.
- Reviews:
  - [Normal review](subagents/normal_review.md)
  - [Test challenges](test_challenges_debrief.md)
  - [Codex](codex_review.md)
  - [Thermo-nuclear](thermo_nuclear_review.md)
  - [Scope evaluation](scope_evaluation.md)

## Decisions

- This is one of four deliberate sibling branches: #24178 (parent), #24175 (this one), #24176 run-form seeding and #24177 client.
- Archives exported before this fix, which have no `order_index`, get a skip with a logged warning instead of a 500, as the issue proposes. Reviewers may prefer a 4xx that tells the user the step parameters were lost. That would also block the rerun.
- The latent `param_map` keyed-by-id bug in `workflow_run_config_to_request` is noted and not fixed, per the coordinator.
