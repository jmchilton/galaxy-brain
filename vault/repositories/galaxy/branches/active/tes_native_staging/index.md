---
upstream_base_branch: release_26.2
parent_branch: tes_task_state_polling
related_records: galaxy/branches/tes_native_staging_v26.1.2
---
# TES-native job runner (design B)

- [Open PR](https://github.com/jmchilton/galaxy/compare/tes_task_state_polling...tes_native_staging?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/tes_native_staging)

## Status

Port of [`tes_native_staging_v26.1.2`](../tes_native_staging_v26.1.2/index.md) to `release_26.2`, hardened on 2026-11-15 and BLOCKED on a scope decision: 31 commits at `88d6414a6dc` on `tes_task_state_polling` `54d2aa613df`.

No PR.

Fork CI on `88d6414a6dc` was queued at hand-off; locally 103 unit tests, `test/integration/test_job_files.py` (40) and the new end-to-end `test/integration/test_tes_runner.py` (5) pass.

## What it is

- `galaxy.jobs.runners.tes:TesJobRunner`, with task building in `util/tes_staging.py`: each job becomes one plain TES task. TES inputs fetch the job's files from the job files API, one executor runs Galaxy's job script in the tool's container at Galaxy's absolute paths (`outputs_to_working_directory: true`), TES outputs send results back, and Galaxy polls TES and finishes the job locally. No Pulsar in the task.
- `PUT /api/jobs/{job_id}/files?path=` with a raw body (Funnel, TESK), on `JobFilesManager`.
- Signed per-file URLs: `job_token=<expires>.<HMAC>` for one path and one direction (`galaxy.security.job_files_tokens`), instead of the job key.
- With `tes_directory_outputs: true`, the tool working directory and each output's extra files go back as TES `DIRECTORY` outputs through `PUT /api/jobs/{job_id}/files/{rel_path}?path=<dir>` (Funnel and TESK; not tesp-api).
- First seven commits are base refactors the parent could take; `a0c60ba6d80` (MINIMAL-view TES state checks with a 30 s timeout) changes the Pulsar TES runner too.

## Decision for John

Decide (D2): pursue design B upstream at all? The scope evaluation recommends parking it as a reference branch (and retargeting to `dev` if ever pursued), moving only `a0c60ba6d80` into `tes_task_state_polling` now; if pursued, a modest expansion first (refuse at submit time jobs whose discovered outputs or `extra_files` can't come back, `tes_directory_outputs` on by default). Details: [implementation_debrief.md](implementation_debrief.md), [scope_evaluation.md](scope_evaluation.md).

## Review materials

- [Implementation](implementation_debrief.md) ([initial port](initial_implementation_debrief.md))
- [Brain research](brain_research.md)
- [Test challenges](test_challenges_debrief.md)
- [Codex review](codex_review.md)
- [Performance challenges](performance_challenges_debrief.md)
- [Thermo-nuclear review](thermo_nuclear_review.md) ([follow-up refactor issue](thermo_followup_refactor_issue.md))
- [Baseline refactor](baseline_refactor.md)
- [Scope evaluation](scope_evaluation.md)
