
## Collected issues from planning docs:

Some of them are created:

- [#24172](https://github.com/galaxyproject/galaxy/issues/24172) — Column parameters show "No options available." until their dataset finishes, so tools and workflows can't be queued on it
- [#24173](https://github.com/galaxyproject/galaxy/issues/24173) — Give every step, job and output selected in the invocation view a shareable URL
- [#24174](https://github.com/galaxyproject/galaxy/issues/24174) — Record which invocation a workflow rerun came from
- [#24175](https://github.com/galaxyproject/galaxy/issues/24175) — Rerun of an imported workflow invocation fails with a 500 when the run had tool step parameters
- [#24176](https://github.com/galaxyproject/galaxy/issues/24176) — Prefill the full workflow run form when rerunning an invocation
- [#24177](https://github.com/galaxyproject/galaxy/issues/24177) — Workflow rerun silently drops tool parameters the original run set
- [#24178](https://github.com/galaxyproject/galaxy/issues/24178) — Invocation request export can't be posted back when a subworkflow step had runtime parameters

Some of them I'm tracking via bigger galaxy-brain projects:
- [compare_runs](../compare_runs/index.md) — One table of past runs for a workflow step, a workflow's outputs, or a tool
	- Highlight to look at here is the mock up at https://claude.ai/artifact/EnVow5Qbt2pKo8j3BUoQEK
- [invocation_graph_embedded_outputs](../invocation_graph_embedded_outputs/index.md) — Hover previews, embedded workflow-output nodes and preferred step outputs in the invocation graph
	- Highlight to look at here - did a throw away spike and got some screenshots and hardened the plan around real implementation details.

Some of them are internal still:
- [rerun_single_step_from_invocation](../../repositories/galaxy/issues_incubator/internal/rerun_single_step_from_invocation/raw.md) — Edit one step's parameters from a completed invocation and rerun, reusing unchanged upstream jobs

Merged PRs from this work:
- [#24164](https://github.com/galaxyproject/galaxy/pull/24164) — Add E2E tests for the invocation graph
- [#24133](https://github.com/galaxyproject/galaxy/pull/24133) — Document OIDC authorization request parameters for administrators (Dannon's agent had this wrong in the planning docs - hopefully the doc fix would prevent that)

Open PRs from this work:
- [#24307](https://github.com/galaxyproject/galaxy/pull/24307) — Give invocation steps, jobs and outputs shareable URLs

A few branches that didn't make PRs: four stacked branches fixing workflow rerun of step parameters, from the `workflow_rerun_step_parameters` spike. All are based on `dev` and implemented and reviewed by John. Trying to decide if we should ask reviewer time for legacy workflow form:
- [`issue_24178_subworkflow_step_params_export`](../../repositories/galaxy/branches/active/issue_24178_subworkflow_step_params_export/index.md) (#24178, stack base) — Invocation request export keys subworkflow step params as `<index>|name`, so it can be posted back; unknown or malformed keys are a 400. Adds the shared step-param row resolver the others reuse.
- [`issue_24175_imported_invocation_step_params`](../../repositories/galaxy/branches/active/issue_24175_imported_invocation_step_params/index.md) (#24175, on #24178) — Invocation import re-keys step params, so Rerun of an imported run no longer 500s; legacy rows that can't be mapped are dropped with a warning.
- [`issue_24176_rerun_full_form_prefill`](../../repositories/galaxy/branches/active/issue_24176_rerun_full_form_prefill/index.md) (#24176, on #24178) — Server seeds the expanded run form from the original run: step params, inputs (including legacy input keys) and workflow settings.
- [`issue_24177_rerun_step_params_full_form`](../../repositories/galaxy/branches/active/issue_24177_rerun_step_params_full_form/index.md) (#24177, on #24176) — Reruns with tool step params stay in the expanded form so they aren't dropped; the simple form is prefilled and sends `replacement_params`, so `${...}` renames apply.