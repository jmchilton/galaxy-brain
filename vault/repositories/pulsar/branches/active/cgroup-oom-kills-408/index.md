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

Polished at `63969ff`; ready for John's final review.

No PR.

Fork CI for `63969ff` queued at polish hand-off.

## Base

Fetched `origin/master` at `f2fde10` (2026-11-03). Worktree: `/Users/jxc755/projects/worktrees/pulsar/branch/cgroup-oom-kills-408`.

## Notes

Addresses the memory half of [#75](https://github.com/galaxyproject/pulsar/issues/75) / OOM part of [#408](https://github.com/galaxyproject/pulsar/issues/408), for [galaxy#24545](https://github.com/galaxyproject/galaxy/issues/24545). Galaxy counterpart: [`issue_24545_oom_kill_detection`](../../../../galaxy/branches/active/issue_24545_oom_kill_detection/index.md) owns detection; this branch mirrors the job-script check and adds the option. Orthogonal to [#492](../../../issues/queued/492/index.md)'s `runner_state` wire plan. Per-job control from Galaxy needs a Pulsar release + `pulsar-galaxy-lib` bump (Galaxy pins 0.16.0).

Open questions for John: which Pulsar resource managers actually kill silently (best pitch example; HTCondor hold reasons separately?); should `queued_python`/unqueued reject or warn on the option; `docs/compatibility.rst` entry once the Galaxy release is known.

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
