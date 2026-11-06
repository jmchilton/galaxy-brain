# lint_input_defaults

Status: merged as [#196](https://github.com/jmchilton/galaxy-tool-util-ts/pull/196) 2026-10-23. Commits `4dcc34a2`, `ef0e5530` (list element checks), `51e0c41b` (non-object `tool_state` → `{}`; Codex review). Base: `origin/main` `a3abfa2b` (rebased after #195 merged; `DEFAULT_CHECKS` table mirrors gxformat2).

[PR description](pr_description.md) · Python twin: [gxformat2 lint_input_defaults](../../../../gxformat2/branches/merged/lint_input_defaults/index.md)

TS port with identical messages and a patch changeset for `@galaxy-tool-util/schema`. Verified: `make check` and `make test` pass.

Fixtures were synced from the unmerged gxformat2 branch, this change's files only. Re-sync from gxformat2 `main` after merge.

#195 merged; rebased, import conflict resolved. `make check` green; `make test` green except the known gxwf-web `--output-schema` 12s timeout, which passes alone.
