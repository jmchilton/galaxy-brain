# gxformat2_sync_265_278

- [Open PR](https://github.com/jmchilton/galaxy-tool-util-ts/compare/main...gxformat2_sync_265_278?expand=1)

Status: pushed to `origin` (jmchilton) at `5eb9202d`; no PR yet (awaiting John). Base: `origin/main` `6266935d`.
Worktree: `~/projects/worktrees/galaxy-tool-util-ts/branch/gxformat2_sync_265_278`.

[PR description](pr_description.md)

Catch-up sync to gxformat2 `main` `b81cb14`, plus ports of gxformat2#265 (text input regex validators) and #278 (require Format2 `class`). Prerequisite for [color_directory_uri_inputs](../color_directory_uri_inputs/index.md).

Commits: `59f42d5f` sync (9 tests red), `81021b94` text validators, `5eb9202d` `withDecodeClass` + CLI test, Effect and json-schema modes (red→green verified).

Verified: `make check` and `make test` pass, and `check-sync` against gxformat2 `b81cb14` is clean.

Generator note: `schema-salad-plus-pydantic` 0.1.9 orders the Effect output by Python hash seed. Regenerated with `PYTHONHASHSEED=0`; no seed reproduced the committed output. Possible follow-up: make the generator deterministic.
