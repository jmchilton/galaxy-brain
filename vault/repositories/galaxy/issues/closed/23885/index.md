# galaxy#23885 — Workflow refactor API rewrites the source version's steps

[Issue](https://github.com/galaxyproject/galaxy/issues/23885) · [issue draft](issue_draft.md) · [proposal](proposal.md) · [debrief](debrief.md)

Branch `workflow_refactor_detached_executor` ([#23799](https://github.com/galaxyproject/galaxy/pull/23799)) — Non-dry-run refactors (`upgrade_tool`, `upgrade_subworkflow`, `update_step_position`) mutate the persistent source version's steps, so version history loses the pre-refactor workflow; `release_26.1` also affected; state: fix on #23799, opener should become `Fix 🎯 #23762 and 🎯 #23885`.

Closed 2026-10-06.
