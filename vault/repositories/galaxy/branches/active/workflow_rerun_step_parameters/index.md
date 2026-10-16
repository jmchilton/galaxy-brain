# workflow_rerun_step_parameters

Status: `branches_need_decision`. Base: `dev`. Spike, do not PR as-is.

Spike for `workflow_rerun_drops_step_parameters` (since split and filed as [#24175](https://github.com/galaxyproject/galaxy/issues/24175), [#24176](https://github.com/galaxyproject/galaxy/issues/24176), [#24177](https://github.com/galaxyproject/galaxy/issues/24177), [#24178](https://github.com/galaxyproject/galaxy/issues/24178)): carries step params through rerun, subworkflow export and invocation import, and prefills the full run form.

[Spike debrief](spike_debrief.md)

Decision: split into 4 issues (see debrief), and choose the server-seeded run form or the client-merged export. No DB migration needed.

Superseded by four stacked branches (server-seeded run form chosen, per #24176), all handed off 2026-10-15:

- [`issue_24178_subworkflow_step_params_export`](../issue_24178_subworkflow_step_params_export/index.md) — base `dev`.
- [`issue_24175_imported_invocation_step_params`](../issue_24175_imported_invocation_step_params/index.md) — on #24178.
- [`issue_24176_rerun_full_form_prefill`](../issue_24176_rerun_full_form_prefill/index.md) — on #24178.
- [`issue_24177_rerun_step_params_full_form`](../issue_24177_rerun_step_params_full_form/index.md) — on #24176.
