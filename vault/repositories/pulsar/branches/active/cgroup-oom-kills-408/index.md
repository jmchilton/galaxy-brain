---
upstream_base_branch: master
related_records:
  - galaxy/branches/issue_24545_oom_kill_detection
  - pulsar/issues/408
---
# Report cgroup OOM kills from Pulsar job scripts

- [Open PR](https://github.com/galaxyproject/pulsar/compare/master...jmchilton:pulsar:cgroup-oom-kills-408?expand=1)
- [View on GitHub](https://github.com/jmchilton/pulsar/tree/cgroup-oom-kills-408)

## Status

Implemented at `3c23696`; review, hardening and polish pending.

No PR.

Fork CI runs on push; not yet checked.

## Base

Fetched `origin/master` at `f2fde10` (2026-11-03). Worktree: `/Users/jxc755/projects/worktrees/pulsar/branch/cgroup-oom-kills-408`.

## Notes

Addresses the OOM part of [#408](https://github.com/galaxyproject/pulsar/issues/408) / [galaxy#24545](https://github.com/galaxyproject/galaxy/issues/24545). Galaxy counterpart: [`issue_24545_oom_kill_detection`](../../../../galaxy/branches/active/issue_24545_oom_kill_detection/index.md), which owns the detector; this branch only mirrors the job-script check and its option. Orthogonal to [#492](../../../issues/queued/492/index.md)'s `runner_state` wire plan.

- [Implementation debrief](implementation_debrief.md)
