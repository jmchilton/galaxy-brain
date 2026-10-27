---
upstream_base_branch: dev
---
# Allow EXIT cleanup during process-tree cancellation

- [View on GitHub](https://github.com/jmchilton/galaxy/tree/pulsar-term-first-cancellation)

## Status

Reference-only at `c20d1f345ce`, parked for the next shared-helper sync per John on 2026-10-27.

Do not open a companion PR; [Pulsar #554](https://github.com/galaxyproject/pulsar/pull/554) is independently functional.

Nine targeted regression tests and changed-file lint/format passed; fork CI not confirmed.

## Base and handoff

Fetched `origin/dev` at `fd43a3c6ce8` on 2026-10-27. Worktree: `/Users/jxc755/projects/worktrees/galaxy/branch/pulsar-term-first-cancellation`.

[Implementation debrief](implementation_debrief.md). Mirrors [Pulsar #541 implementation](../../../../pulsar/branches/active/term-first-cancellation/index.md).

The helper has no callers in the checked Galaxy `lib/` tree (only definition/internal calls and a re-export); Galaxy's local runner uses `kill_pg`. Retain this branch for the next sync.
