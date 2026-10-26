Fix workflow tests that report a valid `false` output as missing.

Given `outputs: {gate_boolean: false}` and a workflow that returns `false`, Planemo currently fails with `Expected output [gate_boolean] not found in results.` The report builder checks truthiness before checking the expectation, so `0`, `0.0`, `""`, and `[]` have the same problem. Treating only `None` as missing lets these outputs reach the existing assertion checker. Wrong expectations now produce value mismatch diagnostics.

**This fixes the shared Planemo test-result checker used by Galaxy and CWL tests; it is independent of the collection expression.json fix in #1760 and needs no upstream Galaxy change.**

**Missing outputs and `None` keep their existing failure behavior; this does not add null assertions.** Existing file and collection assertion handling is unchanged.

Regression tests cover falsy matches, mismatches, truthy controls and absent/None outputs. Ten regression cases fail on the base implementation for the reported reason. All 29 related tests pass with the fix, and `make lint` passes. **Tests use real TestCase/report construction with a mock run response; no live Galaxy workflow was run.**

## Risks

Risks are minimal: this is a reversible change to one missing-output condition, with no stored data changes or new dependencies. Valid falsy outputs now reach the existing checker and may pass where they previously failed as missing.

## Context

Addresses the false-output workaround documented in [Foundry #713](https://github.com/galaxyproject/foundry/pull/713). Asserting a boolean checks its value; marker steps remain useful when the test needs to prove which conditional branch ran.
