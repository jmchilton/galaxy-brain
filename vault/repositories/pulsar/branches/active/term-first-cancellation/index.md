---
upstream_base_branch: master
---
# Allow job cleanup before forced cancellation

- [Open PR](https://github.com/galaxyproject/pulsar/compare/master...jmchilton:pulsar:term-first-cancellation?expand=1)
- [View on GitHub](https://github.com/jmchilton/pulsar/tree/term-first-cancellation)

## Status

Polished and ready for final review at `d87e08f`; awaits John’s read-through.

No PR opened.

Fork CI is queued for `d87e08f`: [Pulsar checks](https://github.com/jmchilton/pulsar/actions/runs/40449379279).

## Base

Fetched `origin/master`: `00a9e8c` (2026-10-27).

## Notes

Addresses [#541](https://github.com/galaxyproject/pulsar/issues/541). Worktree: `/Users/jxc755/projects/worktrees/pulsar/branch/term-first-cancellation`.

## Review materials

- [Implementation](implementation_debrief.md)
- [Normal review](subagents/normal_review.md)
- [Hardening review](thermo_nuclear_review.md)
- [Proposed description](pr_description.md)
- [Title options](pr_titles.md)
- [Labels](pr_tags.md)
- [Polishing and human-read checklist](polish_debrief.md)

The [Galaxy mirror](https://github.com/jmchilton/galaxy/tree/pulsar-term-first-cancellation) is pushed at `c20d1f345ce` with nine passing regression tests.
