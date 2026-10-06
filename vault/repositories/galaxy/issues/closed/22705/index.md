# galaxy#22705 — Expose implicit_collection_jobs_id on the Job detail API

[Issue](https://github.com/galaxyproject/galaxy/issues/22705)

Branch `issue_22705_job_icj_id` ([#23606](https://github.com/galaxyproject/galaxy/pull/23606)) — The Job detail API hides `implicit_collection_jobs_id` even though the model association exists, forcing consumers to rebuild map-over grouping from the outside; state: implemented per [the verified plan](ISSUE_22705_PLAN.md) as one atomic commit on dev `48c7d7028fc`, pushed to `jmchilton` at `a672d44b8eb`; subagent review applied before squashing — `/api/jobs/search` covered, agent id encoding fixed, and the `test_model.py` scoping guard dropped at John's request; the three field tests and the agent-encoding assertion were each verified red first, full `test_workflow_extraction.py` 65 passed 1 skipped, client schema regenerated and `pnpm type-check` clean; opened as a draft PR on 2026-09-20 from `vault/agents/gx_branches/old/issue_22705_job_icj_id_pr_description.md`, monitoring CI before undrafting.

Closed 2026-09-22.
