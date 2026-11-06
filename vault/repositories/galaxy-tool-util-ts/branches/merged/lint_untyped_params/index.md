# lint_untyped_params

Status: merged as [#195](https://github.com/jmchilton/galaxy-tool-util-ts/pull/195) 2026-10-22. Commits `46afdbe4`, `6275d85b`. Base: `origin/main` `022bc661`.

[PR description](pr_description.md) · Python twin: [gxformat2 lint_untyped_params](../../../../gxformat2/branches/merged/lint_untyped_params/index.md) · Origin: [foundry#677](../../../../foundry/issues/closed/677/index.md)

TS port of the gxformat2 change, with identical messages. Includes a patch changeset for `@galaxy-tool-util/schema`.

Verified: `make check` green. `make test` green except gxwf-web `--output-schema`, which times out at 12s because `npx tsx` takes about 25s wall time locally; it's environmental and passed in the first full run. IWC `.ga` sweep: 0 untyped warnings.

Fixtures were synced from the unmerged gxformat2 branch, untyped-params files only. Re-run `make sync-workflow-fixtures sync-workflow-expectations` against gxformat2 `main` once that merges.
