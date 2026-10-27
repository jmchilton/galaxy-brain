# [0.15] Introduce towncrier for CHANGELOG management

- [View PR #545](https://github.com/galaxyproject/pulsar/pull/545)
- [View on GitHub](https://github.com/jmchilton/pulsar/tree/towncrier_changelog)

## Status

Branch `towncrier_changelog` on `jmchilton`, base `release_0.15`; `~/projects/worktrees/pulsar/branch/towncrier_changelog`.

PR #545 open, mergeable.

CI green on `65d45d44a5`: `Check changes/ entry` skipped after the `no changelog` label was added (2026-10-26).

CI diagnosis: the only red, `Check changes/ entry`, failed because the migration adds `CHANGELOG.md` directly, which the workflow's guard step forbids; branch-caused but inherent to the migration, so exempted via label rather than code change. All other checks passed.

Review notes: [reviews/active/545](../../../reviews/active/545/index.md).
