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

Polished at `958fa86948d`; ready for John's final review.

No PR.

Fork CI for `958fa86948d` queued at polish hand-off.

## Base

Fetched `origin/dev` at `5ab3087a566` (2026-11-03). Worktree: `/Users/jxc755/projects/worktrees/galaxy/branch/issue_24545_oom_kill_detection`.

## Notes

Addresses [galaxy#24545](https://github.com/galaxyproject/galaxy/issues/24545). It works alone: the job-stderr detection and Pulsar resubmission need no Pulsar change. The Pulsar counterpart [`cgroup-oom-kills-408`](../../../../pulsar/branches/active/cgroup-oom-kills-408/index.md) carries the opt-in cgroup check to Pulsar-rendered job scripts. `CGROUP_OOM_KILLS_STATEMENT.sh` is byte-identical in both.

Open questions for John:

- Richard Burhans offered a `slurm.py` PR on #24545, which overlaps this branch.
- Should the default-on job-stderr check get an opt-out destination param?
- Should there be one shared "user ended this job" state constant (`NOT_RESUBMITTABLE_JOB_STATES`, `local.py`, htcondor)?
- Target `dev`, or a release branch? It's a bug fix, but it changes job outcomes.

## Review materials

- [Implementation](implementation_debrief.md)
- [Normal review](subagents/normal_review.md)
- [Codex review](codex_review.md)
- [Hardening review](thermo_nuclear_review.md)
- [Real-kernel demo](demo/real_kernel_oom_demo.md)
- [Proposed description](pr_description.md)
- [Title options](pr_titles.md)
- [Labels](pr_tags.md)
- [Polishing](polish_debrief.md)
