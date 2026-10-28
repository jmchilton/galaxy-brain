# galaxy#24200 — Workflow input validators are rewritten on import

[Issue](https://github.com/galaxyproject/galaxy/issues/24200)

Filed 2026-10-16 from [proposal](proposal.md) ([source draft](raw.md), [debrief](debrief.md)). Assigned to jmchilton.

`InputParameterModule.save_to_step` stores `_parse_state_into_dict()`, so import drops `negate`, all but the last range, range `message`s and exclusive bounds. Negated validators are inverted. Separately, `min > max` imports and later asserts in `InRangeValidator`. Format2 side: gxformat2#265 (merged, unreleased; adds `negate`) and gxformat2#266. Related: #24199 (run-form bounds, same `get_runtime_inputs`).

Open decision: the issue proposes honoring `negate`. If John prefers rejecting it at import, gxformat2 should drop `negate` before releasing #265.

Next: land the 5-case red repro from the issue, then stop the import rewrite via `parse_dict_validators` and add `min <= max` to `InRangeParameterValidatorModel`.
