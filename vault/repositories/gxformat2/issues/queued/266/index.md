# gxformat2 #266 — Numeric input bounds: semantic validation gaps

- [Issue](https://github.com/galaxyproject/gxformat2/issues/266) (filed by Claude for John, 2026-10-15). Follow-up to [#264](../../closed/264/index.md) / #265.
- Galaxy-side counterpart queued for gx_issues: [workflow_parameter_validators_lossy_state](../../../../../agents/gx_issues/to_file/workflow_parameter_validators_lossy_state.md)

Probed on `main` `eb1d3ff`:
- `min`/`max` on string/data passes lax validation, and `to_native` drops it. Fix: add both to the type-specific checks in `_semantic_validators.validate_input_parameter` as numeric-only.
- `min > max` passes strict validation. Galaxy then hits an `AssertionError` building the runtime parameter (see the Galaxy draft).
- `min: 0.5` on an `int` input passes strict validation.
- Known and low priority: native → Format2 keeps only the first non-negated `in_range`.

Open question for John: Galaxy ignores stored `negate` at runtime (see the Galaxy draft), but #265 lets Format2 text validators carry `negate: true` and documents it as working. Should we drop or reject `negate` in gxformat2, or wait for a Galaxy fix?
