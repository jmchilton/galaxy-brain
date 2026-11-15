---
upstream_base_branch: master
child_branches: clean_job_directory_retry
related_records: pulsar/branches/clean_job_directory_retry
---
# Make the queued_python manager honour num_concurrent_jobs

- [Open PR](https://github.com/galaxyproject/pulsar/compare/master...jmchilton:pulsar:queued_manager_monitor_kwarg?expand=1)
- [View on GitHub](https://github.com/jmchilton/pulsar/tree/queued_manager_monitor_kwarg)

## Status

Implemented at `b476ccd` on master `08dedcb` during stage 5 of the [GA4GH WES and TES project](../../../../../projects/ga4gh_wes_tes/index.md); proven in the demo, where tesp-api's outer Pulsar now runs 2 tasks at a time instead of all 4 (`runs/tesp-stage5/pulsar-concurrency/` in `~/projects/repositories/galaxy-wes-tes`).

No PR.

Fork CI for `b476ccd` (runs 43650770433 `pulsar`, 43650770354 `Framework tests`) was still queued behind the coexecution branches' runs about 25 minutes after the push.

## Notes

- One commit: `Manager._run` and `QueueManager.run_next` spelt the `monitor` keyword `montior`, so `_start_monitor` always monitored in a background thread and the worker threads never waited. The bug arrived with `8fd077b` (0.15.0) and is in every release through 0.16.0.
- `_start_monitor` now takes `monitor` as a keyword-only parameter, so a misspelt keyword raises `TypeError` and mypy flags it.
- Independent of the coexecution stack.
- The demo's default outer Pulsar is this commit (`TESP_PULSAR_SOURCE` in `config/tesp/tesp.env`, image `wes-tes/tesp-pulsar-rest:git-b476ccd3dfa8-docker29.1.3`), demo commit `02d354a`.

## Review materials

- [Implementation](implementation_debrief.md)
