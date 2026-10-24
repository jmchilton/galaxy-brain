# gxformat2 #202 — First-class `color` and `directory_uri` parameter inputs

- [Issue](https://github.com/galaxyproject/gxformat2/issues/202) (filed by John, 2026-05-06).
- Branch: [color_directory_uri_inputs](../../../branches/active/color_directory_uri_inputs/index.md)

Claimed 2026-10-24 by workflow_libs workhorse. Galaxy `dev` offers both in `InputParameterModule.get_inputs`; `directory_uri` takes regex validators, `color` only a default.

Implemented and polished on `color_directory_uri_inputs`, which is waiting for John's final review. On `main`, both types fail validation and conversion. Follow-up: a TS twin change in galaxy-tool-util-ts.
