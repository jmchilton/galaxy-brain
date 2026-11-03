---
related_records:
  - pulsar/issues/492
  - pulsar/branches/cgroup-oom-kills-408
  - galaxy/branches/issue_24545_oom_kill_detection
---
# pulsar #408 — Pulsar ignores DRM limit kills (walltime, OOM)

[Issue](https://github.com/galaxyproject/pulsar/issues/408) · Open, unassigned. Checked 2026-11-03. Older duplicate: [#75](https://github.com/galaxyproject/pulsar/issues/75). Galaxy-side report: [galaxy#24545](https://github.com/galaxyproject/galaxy/issues/24545).

galaxy#24545: a Pulsar → Slurm job had `sort` OOM-killed mid-pipe; exit 0; Slurm wrote `slurmstepd: error: Detected 1 oom-kill event(s) ...` to the job (DRM) stderr; Galaxy finished it `ok`. Galaxy's own `slurm.py` would miss it too (old wording only, CANCELLED only). [#485](https://github.com/galaxyproject/pulsar/pull/485) (merged) fixed DRMAA `FAILED → failed` but not exit-0 OOM. Broader failure-reason wire plan: [#492](../../queued/492/index.md).

## Implementation (2026-11-03)

Paired branches, OOM part only (walltime is #492's DRM-state work):

- Galaxy [`issue_24545_oom_kill_detection`](../../../../galaxy/branches/active/issue_24545_oom_kill_detection/index.md): scans job stderr for kill lines in `check_tool_output` (covers Pulsar jobs with no wire change), routes Pulsar's finish path through resubmission, adds opt-in `check_cgroup_oom_kills` job-script probe.
- Pulsar [`cgroup-oom-kills-408`](../../../branches/active/cgroup-oom-kills-408/index.md): mirrors the probe into Pulsar's job script plus a manager option and per-job override (cvmfsexec-style).

Richard Burhans offered a `slurm.py` PR on galaxy#24545; overlap is John's call.
