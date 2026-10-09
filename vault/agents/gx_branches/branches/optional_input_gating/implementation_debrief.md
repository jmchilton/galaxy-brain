# optional_input_gating — cleanup amend debrief (2026-10-06)

Amended the single commit: `2837cb477f8` → `b9052402baa` (force-pushed with lease to `jmchilton/optional_input_gating`).

2026-10-06 later: dangling-gate lint split out to `dangling_when_lint` (`9df25acd96c`); this branch rebased on it → `ceb85694e94` (lint-file conflicts were wording only; took the parent's).

## Done

- Removed `presenceGateIsSpellable` / `presenceGateInputPath` wrappers; callers use `resolveConnectionNameToInputPath(name, step.tool_state)`.
- New store helpers reused across the editor:
  - `stepOutputCanBeAbsent`: used by `connectedInputCanBeAbsent`, probe typing, and `SVGConnection.vue`.
  - `effectiveOutputExtensions`: replaces the inline ChangeDatatype override in `terminals.ts` `getConnectedTerminals`.
  - `isParameterOutput` / `isCollectionOutput`: replace the private guards in `terminals.ts`.
- Test trims:
  - Dropped the `presenceGateIsSpellable`, `normalizeConnectionOutputLinks` and `hasGatedSteps` tests.
  - Moved the JSON-encoded conditional case into `workflowInputPath.test.ts`.
  - Restored the #23816 test "does not confuse a connection name..." in its original place.
  - Removed the redundant `vi.mock` in `FormDefault.test.js`.
- `terminals.test.ts`: the new describes now share one `presence gating` setup, and the spellability block is merged into `canAcceptWithPresenceGate`.
- Added `NodeInput.test.ts` coverage for drop → confirm → connection + `when` → undo, and for the decline case. A mutation check confirmed the undo assertion fails when `onUndo` doesn't clear `when`.
- Framework workflows: replaced toplevel / nested_dot / nested_bracket / repeat / nogate with one `optional_input_gating.gxwf.yml` (three gated steps: top-level, conditional, repeat). `twin_probe` kept.

## Verification

- 432 workflow-editor and store vitest pass under node 22.20.0.
- `vue-tsc` is clean.
- `pytest lib/galaxy_test/workflow/test_framework_workflows.py -k optional_input_gating -m workflow`: 4 passed.
- Selenium not run; its tests are unchanged.

## Not done / deliberately left

- `BaseOutputTerminal` constructor (`attr.optional || step.when`) not switched to `stepOutputCanBeAbsent`, because it reads terminal args rather than the step's output list.
- `canAcceptWithPresenceGate › leaves the terminal ungated afterwards` kept. It guards the `presenceGateAssumed` flag from leaking.
- No trimming of `FormConditional.test.ts` overlap (nested/repeat option cases).
- `getConnectedTerminals` now always copies data/collection output sources (previously only when a ChangeDatatype PJA existed). No behaviour change.

## Candidate splits (unchanged boundaries, kept separable)

1. **Dangling-gate lint**: `getDanglingGates`, `Lint.vue` section, `useLinting`, `lintingTypes`, `linting.test.ts`, `Lint.test.ts` block, docs section.
2. **Data probes and twin dispatch**: `gatePortTerminalSource` and the refresh logic in the store, `gatedThroughSharedSource`, the `synthesized gate ports` store tests, the nested `twin dispatch acceptance` describe, the Selenium twin test, the `twin_probe` fixture, docs section.
3. **Inverse-gate evaluator**: `classifyWhenInputIsNull` / `PresenceEvaluator`, plus the `null_behavior` / `guards_presence` spec rows. Fallback policy: gate references the input. Pairs with split 2.
