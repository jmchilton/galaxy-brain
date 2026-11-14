# Open PR and branch queue

Snapshot: 2026-10-27 (#541 branch and fork CI refreshed; other entries retain their prior snapshots).

## Open Pulsar PRs — ready from our side (`ready`)

- [`term-first-cancellation`](active/term-first-cancellation/index.md) — Allow job EXIT cleanup before forcibly killing cancelled process trees. [#554](https://github.com/galaxyproject/pulsar/pull/554).
- [`job-script-exit-trap-542`](active/job-script-exit-trap-542/index.md) — Runs the job command in a subshell so embedded EXIT traps can't drop cvmfsexec unmount. Base `release_0.15`. [#555](https://github.com/galaxyproject/pulsar/pull/555).

## Open Pulsar PRs — needs attention (`attention`)

- [`towncrier_changelog`](active/towncrier_changelog/index.md) — Introduces towncrier for CHANGELOG management. Base `release_0.15`. [#545](https://github.com/galaxyproject/pulsar/pull/545).
- [`pulsar-transfer-metrics`](active/pulsar-transfer-metrics/index.md) — Records file staging metrics for Galaxy job metrics. [#518](https://github.com/galaxyproject/pulsar/pull/518).
- [`action-destination-defaults`](active/action-destination-defaults/index.md) — Lets file actions declare what they need from the destination. [#517](https://github.com/galaxyproject/pulsar/pull/517).
- [`htcondor2`](active/htcondor2/index.md) — Adds a `queued_htcondor` manager on the htcondor2 bindings, shared with Galaxy. [#486](https://github.com/galaxyproject/pulsar/pull/486).

## Draft Pulsar PRs — ready to undraft (`draft_ready`)

None yet.

## Draft Pulsar PRs — waiting for CI (`ci_wait`)

None yet.

## Draft Pulsar PRs — needs author work (`author_work`)

- [`pulsar-version-metrics`](active/pulsar-version-metrics/index.md) — Records the running Pulsar's version as a job metric. [#529](https://github.com/galaxyproject/pulsar/pull/529).
- [`jobs-directory-version-source`](active/jobs-directory-version-source/index.md) — Says where `pulsar_version` came from in locally built job configs. [#523](https://github.com/galaxyproject/pulsar/pull/523).

## Pulsar branches — implemented, work left (`branches_implemented_needs_ci`)

- [`coexecutor_image_modern_base`](active/coexecutor_image_modern_base/index.md) — Rebuilds the coexecutor (TES/K8s) staging image on python:3.12-slim so it can install current Pulsar. [Open PR](https://github.com/galaxyproject/pulsar/compare/master...jmchilton:pulsar:coexecutor_image_modern_base?expand=1).
- [`coexecution_publish_running`](active/coexecution_publish_running/index.md) — `pulsar-submit --no-wait` publishes `running`, so Galaxy shows TES jobs as running. [Open PR](https://github.com/galaxyproject/pulsar/compare/coexecutor_image_modern_base...jmchilton:pulsar:coexecution_publish_running?expand=1).

## Pulsar branches — implemented, work left, green (`branches_implemented`)

None yet.

## Pulsar branches — needs polish (`branches_need_polish`)

None yet.

## Pulsar branches — ready for final review (`branches_ready_for_final_review`)

- [`cgroup-oom-kills-408`](active/cgroup-oom-kills-408/index.md) — Job-script cgroup OOM-kill check with manager default and per-job override, for galaxy#24545. [Open PR](https://github.com/galaxyproject/pulsar/compare/master...jmchilton:pulsar:cgroup-oom-kills-408?expand=1).

## Pulsar branches — approved, opens when green (`branches_need_pr`)

None yet.

## Pulsar branches — still deciding on (`branches_need_decision`)

None yet.

## Pulsar branches — reference only (`branches_reference`)

None yet.
