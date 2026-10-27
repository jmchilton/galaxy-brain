---
upstream_base_branch: master
---
# Allow job cleanup before forced cancellation

- [PR #554](https://github.com/galaxyproject/pulsar/pull/554)
- [View on GitHub](https://github.com/jmchilton/pulsar/tree/term-first-cancellation)

## Status

Ready from our side at `d87e08f`; John authorized opening the PR on 2026-10-27.

[#554](https://github.com/galaxyproject/pulsar/pull/554) is open, non-draft, targeting master.

Fork Pulsar CI passes; framework CI fails during Galaxy master collection on an unrelated `build_client_manager` import. Fresh PR checks are queued.

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

The [Galaxy mirror](https://github.com/jmchilton/galaxy/tree/pulsar-term-first-cancellation) is parked as reference-only for the next sync, per John (2026-10-27); no companion PR is needed. Its helper has no callers in the checked Galaxy tree; the local runner uses `kill_pg`.
