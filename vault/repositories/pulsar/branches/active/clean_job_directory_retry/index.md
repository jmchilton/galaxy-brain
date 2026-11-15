---
upstream_base_branch: master
parent_branch: queued_manager_monitor_kwarg
related_records: pulsar/branches/queued_manager_monitor_kwarg
---
# Retry removing a job directory that a killed job's process still changes

- [Open PR](https://github.com/galaxyproject/pulsar/compare/queued_manager_monitor_kwarg...jmchilton:pulsar:clean_job_directory_retry?expand=1)
- [View on GitHub](https://github.com/jmchilton/pulsar/tree/clean_job_directory_retry)

## Status

Implemented at `ffbe698` on `queued_manager_monitor_kwarg` (`b476ccd`) during stage 6 of the [GA4GH WES and TES project](../../../../../projects/ga4gh_wes_tes/index.md) ([WES on tesp-api](../../../../../projects/wes_tesp_api/)); pushed to the jmchilton fork.

No PR.

Fork CI for `ffbe698` (runs 43673932134 `pulsar`, 43673932124 `Framework tests`) was queued at the push.

## Notes

- `DELETE /jobs/{id}` right after `PUT /jobs/{id}/cancel` races the thread that waits for the killed process: it writes `return_code` and removes the pid file while `clean()`'s rmtree runs. rmtree fails, `clean()` swallowed the error, and the directory stayed (return_code only, or whole). tesp-api's outer Pulsar left 13 directories in 40 cancels (`runs/stage6/tesp-erase-race/` in `~/projects/repositories/galaxy-wes-tes`).
- Live: 0 of 40 cancels left a directory with this branch as the outer Pulsar, against 13 of 40 on `b476ccd` (tesp-api without 0017).
- The demo does not depend on this branch: tesp-api patch 0017 checks that the job is `lost` after the delete and deletes again. The demo's default outer Pulsar stays `b476ccd`; `TESP_PULSAR_SOURCE=https://github.com/jmchilton/pulsar.git@ffbe6987cd84b79ff08a4c6cd9d45ec2f04de408` selects this branch.

## Review materials

- [Implementation](implementation_debrief.md)
