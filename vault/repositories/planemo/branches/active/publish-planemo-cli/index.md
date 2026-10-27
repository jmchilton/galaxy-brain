# Publish pinned planemo-cli in parallel to planemo

- [View PR #1733](https://github.com/galaxyproject/planemo/pull/1733)
- [View on GitHub](https://github.com/jmchilton/planemo/tree/publish-planemo-cli)

## Status

Branch `publish-planemo-cli` on `jmchilton`, base `master`; `~/projects/worktrees/planemo/branch/publish-planemo-cli`.

PR #1733 open, approved; rebased 2026-10-27 onto `origin/master` to clear conflicts.

CI pending on `9bc15d6046` (previously green on `bc6e1a7bbe`).

Approved.

Review notes: [reviews/active/1733](../../../reviews/active/1733/index.md).

## Rebase notes

- 2026-10-27: rebased onto `origin/master` (52 commits), force-pushed `bc6e1a7bbe` -> `9bc15d6046`. One conflict in `.github/workflows/ci.yaml`: kept upstream `setup-uv@v10.3.0` plus branch's pinned `version` and locked-constraints export step. PR #5 merge commit flattened; mvdbeek's commit retained. `uv lock --check` passes.
- `dependencies.yaml` and `deploy.yaml` still use `setup-uv@v10.2.0` (dependabot will bump).
