# Unresolved Questions

Merged from Plans A, B, and C. Resolved items moved to individual plan docs.

## Still Open

### 1. Round-Trip Utility Location

Does the round-trip utility live in `galaxy-tool-util`, `gxformat2`, or both? `gxformat2` can't depend on Galaxy, but `galaxy-tool-util` is runtime-independent.

*Plans A, C — no user input yet*

### 2. `workflow_step` Model Completeness

We don't know if the `workflow_step` models are complete — we won't know until we start validating real workflows. Expect to discover and fix gaps as we go.

*Plans A, B, C — user confirmed this is expected; track as ongoing risk not a blocking question*

### 3. `__current_case__` in Reverse Pipeline

Assume omitting `__current_case__` from format2-to-native conversion works fine. Validate via Galaxy framework tests and IWC corpus. Fixing any defects stemming from this is a project deliverable.

*Plan C — user confirmed approach but wants validation as explicit deliverable*

## Resolved

| # | Question | Decision |
|---|----------|----------|
| 1 | Fill defaults or preserve only explicit? | Don't fill. Native is fully filled; format2 may have absent defaults. |
| 2 | `$link` in format2 `state`? | `workflow_step` fails on `$link`. `workflow_step_linked` handles them. `$link` is frowned upon / not expected in real workflows. |
| 4 | Dynamic select validation? | Lenient pass-through when options unavailable. |
| 6 | Subworkflows: early or deferred? | Early phases — don't get too far without support. |
| 7 | Toolshed lookup depth? | Full Tool Shed 2.0 API + local cache for reuse. |
| 8 | Unavailable tools? | Fail closed — report error. |
| 9 | Round-trip sweep: CI or local? | Part of workflow framework tests — all workflow tests exercise round-trip in CI. |
