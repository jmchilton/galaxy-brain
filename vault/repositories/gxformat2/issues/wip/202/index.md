# gxformat2 #202 — First-class `color` and `directory_uri` parameter inputs

- [Issue](https://github.com/galaxyproject/gxformat2/issues/202) (filed by John, 2026-05-06).
- Branch: [color_directory_uri_inputs](../../../branches/active/color_directory_uri_inputs/index.md)

Claimed 2026-10-24 by workflow_libs workhorse. Galaxy `dev` offers both in `InputParameterModule.get_inputs`; `directory_uri` takes regex validators, `color` only a default.

PR [#281](https://github.com/galaxyproject/gxformat2/pull/281) opened 2026-10-24 from `6b375cf`; CI green. On `main`, both types fail validation and conversion.

The TS twin lives in galaxy-tool-util-ts on two stacked branches, neither with a PR yet. Merge order:

1. [gxformat2_sync_265_278](../../../../galaxy-tool-util-ts/branches/active/gxformat2_sync_265_278/index.md) catches TS up to gxformat2 `main` (#265, #278). It can merge now.
2. #281.
3. [color_directory_uri_inputs](../../../../galaxy-tool-util-ts/branches/active/color_directory_uri_inputs/index.md). Re-sync from gxformat2 `main` before merging.
