# workflow_rerun_step_parameters

Status: `branches_need_decision`. Base: `dev`. Spike, do not PR as-is.

Spike for `workflow_rerun_drops_step_parameters` (since split and filed as [#24175](https://github.com/galaxyproject/galaxy/issues/24175), [#24176](https://github.com/galaxyproject/galaxy/issues/24176), [#24177](https://github.com/galaxyproject/galaxy/issues/24177), [#24178](https://github.com/galaxyproject/galaxy/issues/24178)): carries step params through rerun, subworkflow export and invocation import, and prefills the full run form.

[Spike debrief](spike_debrief.md)

Decision: split into 4 issues (see debrief), and choose the server-seeded run form or the client-merged export. No DB migration needed.
