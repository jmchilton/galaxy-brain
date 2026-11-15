# Open PR and branch queue

Snapshot: 2026-11-15 (#575 and #576 opened and their CI queried; coexecution stack #577–#583 opened and CI queried at 12:05 UTC; other entries retain their prior snapshots).

## Open Pulsar PRs — ready from our side (`ready`)

- [`term-first-cancellation`](active/term-first-cancellation/index.md) — Allow job EXIT cleanup before forcibly killing cancelled process trees. [#554](https://github.com/galaxyproject/pulsar/pull/554).
- [`job-script-exit-trap-542`](active/job-script-exit-trap-542/index.md) — Runs the job command in a subshell so embedded EXIT traps can't drop cvmfsexec unmount. Base `release_0.15`. [#555](https://github.com/galaxyproject/pulsar/pull/555).

## Open Pulsar PRs — needs attention (`attention`)

- [`towncrier_changelog`](active/towncrier_changelog/index.md) — Introduces towncrier for CHANGELOG management. Base `release_0.15`. [#545](https://github.com/galaxyproject/pulsar/pull/545).
- [`pulsar-transfer-metrics`](active/pulsar-transfer-metrics/index.md) — Records file staging metrics for Galaxy job metrics. [#518](https://github.com/galaxyproject/pulsar/pull/518).
- [`action-destination-defaults`](active/action-destination-defaults/index.md) — Lets file actions declare what they need from the destination. [#517](https://github.com/galaxyproject/pulsar/pull/517).
- [`htcondor2`](active/htcondor2/index.md) — Adds a `queued_htcondor` manager on the htcondor2 bindings, shared with Galaxy. [#486](https://github.com/galaxyproject/pulsar/pull/486).

## Draft Pulsar PRs — ready to undraft (`draft_ready`)

- [`coexecutor_image_modern_base`](active/coexecutor_image_modern_base/index.md) — Rebuilds the coexecutor (TES/K8s) staging image on python:3.12-slim so it can install current Pulsar. [#577](https://github.com/galaxyproject/pulsar/pull/577).
- [`coexecution_publish_running`](active/coexecution_publish_running/index.md) — `pulsar-submit --no-wait` publishes `running`, so Galaxy shows TES jobs as running. [#578](https://github.com/galaxyproject/pulsar/pull/578).

## Draft Pulsar PRs — waiting for CI (`ci_wait`)

- [`queued_manager_monitor_kwarg`](active/queued_manager_monitor_kwarg/index.md) — Fixes `queued_python` ignoring `num_concurrent_jobs` (`montior` keyword typo since 0.15.0). [#575](https://github.com/galaxyproject/pulsar/pull/575).
- [`clean_job_directory_retry`](active/clean_job_directory_retry/index.md) — `clean()` retries when a just-killed job's process changes its directory mid-delete (DELETE left it, 200). [#576](https://github.com/galaxyproject/pulsar/pull/576).
- [`coexecution_stage_failures`](active/coexecution_stage_failures/index.md) — Failed staging exits `pulsar-submit --no-wait`/`pulsar-finish` non-zero; `failed` status carries the error. [#579](https://github.com/galaxyproject/pulsar/pull/579).
- [`coexecution_dependency_dir_default`](active/coexecution_dependency_dir_default/index.md) — Coexecution apps default to no tool dependency dir, so they start on a read-only root. [#580](https://github.com/galaxyproject/pulsar/pull/580).
- [`coexecution_client_fixes`](active/coexecution_client_fixes/index.md) — Published default staging image tag; TES `QUEUED` maps to queued, not failed. [#581](https://github.com/galaxyproject/pulsar/pull/581).
- [`coexecution_stage_out_failures`](active/coexecution_stage_out_failures/index.md) — Stage-out error in `failed` stderr; directory outputs fail; shutdown waits for terminal status. [#582](https://github.com/galaxyproject/pulsar/pull/582).
- [`coexecution_compact_launch`](active/coexecution_compact_launch/index.md) — Launch messages over one argument go zlib-compressed; `pulsar-finish` gets only the job id (108 → 1244 inputs). [#583](https://github.com/galaxyproject/pulsar/pull/583).

## Draft Pulsar PRs — needs author work (`author_work`)

- [`pulsar-version-metrics`](active/pulsar-version-metrics/index.md) — Records the running Pulsar's version as a job metric. [#529](https://github.com/galaxyproject/pulsar/pull/529).
- [`jobs-directory-version-source`](active/jobs-directory-version-source/index.md) — Says where `pulsar_version` came from in locally built job configs. [#523](https://github.com/galaxyproject/pulsar/pull/523).

## Pulsar branches — implemented, work left (`branches_implemented_needs_ci`)


## Pulsar branches — implemented, work left, green (`branches_implemented`)

None yet.

## Pulsar branches — needs polish (`branches_need_polish`)

None yet.

## Pulsar branches — ready for final review (`branches_ready_for_final_review`)

- [`cgroup-oom-kills-408`](active/cgroup-oom-kills-408/index.md) — Job-script cgroup OOM-kill check with manager default and per-job override, for galaxy#24545. [Open PR](https://github.com/galaxyproject/pulsar/compare/master...jmchilton:pulsar:cgroup-oom-kills-408?expand=1).

## Pulsar branches — approved, opens when green (`branches_need_pr`)

None yet.

## Pulsar branches — still deciding on (`branches_need_decision`)

- [`coexecutor_image_pycurl`](active/coexecutor_image_pycurl/index.md) — Superseded: folded into `coexecutor_image_modern_base` (`c4ae861`) on 2026-11-14; suggest abandoning.

## Pulsar branches — reference only (`branches_reference`)

None yet.
