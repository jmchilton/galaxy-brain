---
upstream_base_branch: master
related_records: pulsar/branches/clean_job_directory_retry
pr: 575
---
# Make the queued_python manager honour num_concurrent_jobs

- [Draft PR #575](https://github.com/galaxyproject/pulsar/pull/575)
- [View on GitHub](https://github.com/jmchilton/pulsar/tree/queued_manager_monitor_kwarg)

## Status

Hardened 2026-11-15 (Codex review, no findings; no thermo-nuclear review, since the change is three keyword renames plus a test) at `b476ccd` on master `08dedcb`; first proven in the [GA4GH WES and TES project](../../../../../projects/ga4gh_wes_tes/index.md) demo (tesp-api's outer Pulsar runs 2 tasks at a time instead of 4).

Draft [#575](https://github.com/galaxyproject/pulsar/pull/575) opened 2026-11-15 from [pr_description.md](pr_description.md).

CI on `b476ccd`: settled; only `Framework tests / Test (3.10, master, directory)` fails, an `ImportError` that also fails on master (on base, not rerun).

## Notes

- One commit: `Manager._run` and `QueueManager.run_next` spelt the `monitor` keyword `montior`, so `_start_monitor` always monitored in a background thread and the worker threads never waited. The bug arrived with `8fd077b` (0.15.0) and is in every release through 0.16.0.
- `_start_monitor` now takes `monitor` as a keyword-only parameter, so a misspelt keyword raises `TypeError` and mypy flags it.
- Independent of the coexecution stack.
- The demo's default outer Pulsar is this commit (`TESP_PULSAR_SOURCE` in `config/tesp/tesp.env`, image `wes-tes/tesp-pulsar-rest:git-b476ccd3dfa8-docker29.1.3`), demo commit `02d354a`.

## Review materials

- [Implementation](implementation_debrief.md)
- [Codex review](codex_review.md)
- [PR description](pr_description.md)
