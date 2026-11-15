---
upstream_base_branch: master
related_records: pulsar/branches/queued_manager_monitor_kwarg
pr: 576
---
# Retry removing a job directory that a killed job's process still changes

- [Draft PR #576](https://github.com/galaxyproject/pulsar/pull/576)
- [View on GitHub](https://github.com/jmchilton/pulsar/tree/clean_job_directory_retry)

## Status

Un-stacked onto master `08dedcb` (it shares no code with `queued_manager_monitor_kwarg`) and hardened 2026-11-15 (Codex review, thermo-nuclear review) at `1c8d911`; first implemented as `ffbe698` during stage 6 of the [GA4GH WES and TES project](../../../../../projects/ga4gh_wes_tes/index.md) ([WES on tesp-api](../../../../../projects/wes_tesp_api/)).

Draft [#576](https://github.com/galaxyproject/pulsar/pull/576) opened 2026-11-15 from [pr_description.md](pr_description.md).

CI on `1c8d911`: PR checks running.

## Notes

- `DELETE /jobs/{id}` right after `PUT /jobs/{id}/cancel` races the thread that waits for the killed process: it writes `return_code` and removes the pid file while `clean()`'s rmtree runs. rmtree fails, `clean()` swallowed the error, and the directory stayed (return_code only, or whole). tesp-api's outer Pulsar left 13 directories in 40 cancels (`runs/stage6/tesp-erase-race/` in `~/projects/repositories/galaxy-wes-tes`).
- Live: 0 of 40 cancels left a directory with this branch as the outer Pulsar, against 13 of 40 on `b476ccd` (tesp-api without 0017).
- The demo does not depend on this branch: tesp-api patch 0017 checks that the job is `lost` after the delete and deletes again. The demo's default outer Pulsar stays `b476ccd`; `TESP_PULSAR_SOURCE=https://github.com/jmchilton/pulsar.git@ffbe6987cd84b79ff08a4c6cd9d45ec2f04de408` selects this branch as first implemented (the hardened `1c8d911` behaves the same: 3 attempts, 0.2 s apart, now through `RetryActionExecutor`).

## Review materials

- [Implementation](implementation_debrief.md)
- [Codex review](codex_review.md)
- [Thermo-nuclear review](thermo_nuclear_review.md)
- [PR description](pr_description.md)
