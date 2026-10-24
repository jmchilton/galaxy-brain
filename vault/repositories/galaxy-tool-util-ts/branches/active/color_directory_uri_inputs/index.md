# color_directory_uri_inputs

- [Open PR](https://github.com/jmchilton/galaxy-tool-util-ts/compare/gxformat2_sync_265_278...color_directory_uri_inputs?expand=1)

Status: pushed to `origin` (jmchilton) at `bf25025d`; no PR yet (awaiting John). Stacked on [gxformat2_sync_265_278](../gxformat2_sync_265_278/index.md) (`40412ab4`).
Worktree: `~/projects/worktrees/galaxy-tool-util-ts/branch/color_directory_uri_inputs`.

[PR description](pr_description.md) · Python twin: [gxformat2 color_directory_uri_inputs](../../../../gxformat2/branches/active/color_directory_uri_inputs/index.md) (PR [#281](https://github.com/galaxyproject/gxformat2/pull/281)) · Issue: [gxformat2#202](../../../../gxformat2/issues/wip/202/index.md)

Commits: `52a232af` sync from gxformat2#281 @ `6b375cf` (12 tests red, all #202), `bf25025d` port.

Adds `packages/schema/src/workflow/input-parameter.ts`, which mirrors gxformat2 `_input_parameter.py`. The semantic field tables, native step-type table and regex validator types now derive from it.

Verified: `make check`, `make test` and `knip` CI pass, and `check-sync` against the gxformat2 #281 worktree is clean.

Re-sync if #281 changes before merge.

Not ported, pre-existing: `connection-validation` types `parameter_input` outputs straight from `parameter_type`, and has no `directory_uri` in `ResolvedInputType`.
