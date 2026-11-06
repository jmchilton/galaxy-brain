# color_directory_uri_inputs

- PR [#200](https://github.com/jmchilton/galaxy-tool-util-ts/pull/200) (base `gxformat2_sync_265_278`)

Status: merged as [#200](https://github.com/jmchilton/galaxy-tool-util-ts/pull/200) 2026-10-25 at `47f5afc9`. Stacked on [gxformat2_sync_265_278](../gxformat2_sync_265_278/index.md) (`5eb9202d`).

[PR description](pr_description.md) · Python twin: [gxformat2 color_directory_uri_inputs](../../../../gxformat2/branches/merged/color_directory_uri_inputs/index.md) (PR [#281](https://github.com/galaxyproject/gxformat2/pull/281)) · Issue: [gxformat2#202](../../../../gxformat2/issues/closed/202/index.md)

Commits: `a4229baa` sync from gxformat2#281 @ `6b375cf` (12 tests red, all #202), `47f5afc9` port.

Adds `packages/schema/src/workflow/input-parameter.ts`, which mirrors gxformat2 `_input_parameter.py`. The semantic field tables, native step-type table and regex validator types now derive from it.

Verified: `make check`, `make test` and `knip` CI pass, and `check-sync` against the gxformat2 #281 worktree is clean.

IWC sweeps (`GALAXY_TEST_IWC_DIRECTORY`) were run on this branch and on `origin/main`. Both show the same two reds, so they predate this branch:
- 4 IWC `-tests.yml` files fail tests-schema validation.
- `Functional_annotation_of_sequences.ga` has a roundtrip error diff.

The schema package passes with IWC set.

Re-sync if #281 changes before merge.

Not ported, pre-existing: `connection-validation` types `parameter_input` outputs straight from `parameter_type`, and has no `directory_uri` in `ResolvedInputType`.
