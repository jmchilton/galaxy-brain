# optional_input_gating — thermo-nuclear review debrief (2026-10-27)

Moved presence-gate logic into `presenceGate.ts` and two terminal methods, without changing behavior (about −35 lines); `dac9c04b582` → `1d69a689cdf`.

## Findings

1. **Gate-for-input logic was computed in three places** (structural).
   - The three copies:
     - `FormConditional.gateExpression`
     - `NodeInput.offerPresenceGate`, which re-resolved the path after the confirm dialog and silently returned on null, although `canAcceptWithPresenceGate` had already checked it
     - the resolve check in `canAcceptWithPresenceGate`
   - FormConditional also resolved the path twice: once in the `gateableInputs` filter and again in `gateExpression`.
   - **Fixed.**
2. **Drop orchestration lived in the view** (wrong layer).
   - NodeInput carried a `DropAssessment` type and `assessDrop` (try direct acceptance, then fall back to gated).
   - It also hand-rolled an undo action that re-implemented `BaseInputTerminal.connect` (`makeConnection` + `setDefaultMapOver`) plus a raw `stepStore.updateStepValue`.
   - `Terminal` already owns undoable `connect`/`disconnect`, so this belongs there.
   - **Fixed.**
3. **The step-level gating policy was embedded in `BaseInputTerminal`** (decomposition).
   - The data part of `isPresenceGated` and `gatedThroughSharedSource` only reads the step plus the source's `stepId`/`name`.
   - terminals.ts was already 1089 lines on dev and the branch grew it to 1155. That isn't a threshold crossing, but it is growth in an oversized file.
   - **Fixed.**
4. **`connectedInputCanBeAbsent` sat in `workflowStepStore.ts`** but is a gating concept with one caller, and its caller then needed a second filter. **Fixed.**
5. **Comments broke the one-line rule.** Multi-paragraph docstrings and comments were on:
   - `canAcceptWithPresenceGate`, `isPresenceGated`, `gatedThroughSharedSource`
   - `classifyWhenInputIsNull`, `expressionGuardsInputPresence`
   - `combineAnd`/`combineOr`, `compare`, `parseIdentifier`
   - `gatePortTerminalSource`, and the refresh comment in `updateStep`

   **Fixed.**
6. **`presenceGateAssumed`**: a mutable mode flag toggled with try/finally inside `canAcceptWithPresenceGate`. **Left** (see below).
7. **`UpdateStepConnectionsAction`** is a subclass, plus a `"input_connections" in toPartial` branch in `useStepActions.updateStep`. **Left.**
8. **`gatePortSourceShapeChanged`** relies on the reference identity of `outputs`/`post_job_actions`. **Left.**
9. **Checked for canonical helpers already on dev.** No existing single-or-array link normalizer or parameter/collection output guard exists (dev's guards were private in terminals.ts), so `normalizeConnectionOutputLinks` / `isParameterOutput` / `isCollectionOutput` are the canonical versions now. dev's store `addConnection`/`removeConnection` still do `Array.isArray` inline. That code mutates and is outside the branch's scope, so I left it.

## Changes

- **New `client/src/components/Workflow/Editor/modules/presenceGate.ts`**, the step-aware gating policy:
  - `presenceGateForStepInput(step, inputName)`: resolves the path and builds `$(inputs.… !== null)`, or returns null.
  - `canGateOnInput(step, inputName, stepStore)`: the input may arrive empty and a gate can be written for it. It absorbs `connectedInputCanBeAbsent`, which was removed from the store.
  - `stepGatesInputPresence(step, inputName, source?)` plus the private `gatedThroughSharedSource`: moved out of `BaseInputTerminal` unchanged.
- **`terminals.ts`** (1155 → 1142 lines):
  - New `assessDrop(other)` returns the exported `DropAssessment`.
  - New `connectWithPresenceGate(other)`: one undo action, with the same run/undo body NodeInput had.
  - `canAcceptWithPresenceGate` now uses `presenceGateForStepInput`.
  - `isPresenceGated` is now the flag short-circuit plus a delegation.
  - Removed the `whenExpression`/`workflowInputPath`/`normalizeConnectionOutputLinks`/`Step` imports.
- **`NodeInput.vue`**: no longer knows about step stores, input paths or gate expressions. It calls `terminal.assessDrop`, shows the confirm dialog, then calls `terminal.connectWithPresenceGate`. 56 lines removed.
- **`FormConditional.vue`**: uses `canGateOnInput` and `presenceGateForStepInput`. The local `gateExpression` and its double path resolution are gone.
- **`whenExpression.ts` and `workflowStepStore.ts`**: comments trimmed to one line each. No code changes besides the move.

## Left, and why

- **`presenceGateAssumed` flag** (recommend as follow-up debt). Removing it means threading an "assume gated" argument through `canAccept` → `attachable` (5 subclass overrides) → `_producesAcceptableDatatypeAndOptionalness` / `InputParameterTerminal.attachable`, and through `getInvalidConnectedTerminals`/`BaseOutputTerminal` callers that call `attachable` directly. That widens dev's terminal API for one caller. The try/finally keeps the flag contained, and the existing test "leaves the terminal ungated afterwards" guards against it leaking.
- **`UpdateStepConnectionsAction`**: folding connection-dropping into `UpdateStepAction` would change its constructor and every caller (`SetDataAction`, etc.), which is out of scope. The subclass is the narrower change.
- **`gatePortSourceShapeChanged`**: fine while steps stay frozen and replaced wholesale, which `updateStep` enforces. If anything starts mutating `outputs` in place, it becomes brittle.
- **Not changed, per instructions**: the permissive `unknown` policy in `expressionGuardsInputPresence`, and `BaseOutputTerminal` keeping `attr.optional || step.when`.
- **Split recommendations, carried forward and not done**:
  - Data probes / twin dispatch (now `stepGatesInputPresence`'s synthesized-port and `gatedThroughSharedSource` paths, `gatePortTerminalSource` and the refresh logic in the store, the twin tests and fixture).
  - The inverse-gate evaluator (`classifyWhenInputIsNull` / `PresenceEvaluator`, about 300 lines in `whenExpression.ts`).
  - `presenceGate.ts` now makes the first split cleaner to cut.

## Tests run

- `NODE_OPTIONS=--no-experimental-webstorage npx vitest run src/stores src/components/Workflow/Editor src/components/Form`: 112 files, 1140 passed. This includes the NodeInput drop → confirm → undo and decline tests, which guard the moved undo action.
- `npx vue-tsc --noEmit`: clean.
- eslint: no errors, only 2 `no-explicit-any` warnings that already existed. prettier and the pre-commit hooks passed.
- `pytest lib/galaxy_test/workflow/test_framework_workflows.py -k optional_input_gating -m workflow`: 4 passed.
- E2E was not rerun. No selectors or Selenium tests changed. `test_editor_drop_optional_output_gates_step` exercises the moved drop path, so CI should confirm it.
- Red-to-green doesn't apply, because this is a behavior-preserving refactor. No assertions were weakened or removed.

## Git

Amended into the single commit with the message unchanged, and force-pushed with lease to `jmchilton/optional_input_gating`: `dac9c04b5820ba5126fdd433994888c63a6d2684` → `1d69a689cdf6420a1c3fc29f526c3bfd947c1bd9`.
