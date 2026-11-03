---
upstream_base_branch: dev
related_records:
  - pulsar/branches/cgroup-oom-kills-408
  - pulsar/issues/408
---
# Fail jobs whose processes were OOM-killed (galaxy#24545)

- [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:issue_24545_oom_kill_detection?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/issue_24545_oom_kill_detection)

## Status

Implemented at `8d8773f4ef0`; review, hardening and polish pending.

No PR.

Fork CI not yet checked.

## Base

Fetched `origin/dev` at `5ab3087a566` (2026-11-03). Worktree: `/Users/jxc755/projects/worktrees/galaxy/branch/issue_24545_oom_kill_detection`.

## Notes

Addresses [galaxy#24545](https://github.com/galaxyproject/galaxy/issues/24545). Pulsar counterpart: [`cgroup-oom-kills-408`](../../../../pulsar/branches/active/cgroup-oom-kills-408/index.md), which carries the opt-in cgroup check to Pulsar-rendered job scripts. The Galaxy half works alone: job-stderr detection and Pulsar resubmission need no Pulsar change.

- [Implementation debrief](implementation_debrief.md)
