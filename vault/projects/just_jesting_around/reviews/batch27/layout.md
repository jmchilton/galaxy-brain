# layout

Selected originator: `client/src/components/Workflow/Editor/modules/layout.test.ts`. Baseline and final: **4 tests**.

Every case repeated the same scaffolding: scoped step/state stores, `addStep`, one `createMockStepPosition(180, …)` per step, a hand-built steps record, then `autoLayout`. A local `layOutSteps(newSteps, heights)` helper now holds that loop. Its 180×50 default size sits in named constants, and a per-step height override keeps the first case's 180×80 conditional step. A local `datasetInput(name, label)` replaces the two identical dataset-input literals, keeping their distinct labels ("Input File", "Input"). Each case now shows only its step graph and its expectations. Case names state the behavior. Narrating comments are removed, but the two that explain intent remain: the "Referenced shape does not exist" failure mode, and orphaned connections from imported workflows. The four per-test workflow IDs collapse to one `WORKFLOW_ID`. Each test gets a fresh Pinia, so the stores were never shared.

Preserved: every step definition, connection, `when` expression and output/input shape. All assertions remain:

- `result` defined in all four cases. Not vacuous: `autoLayout` returns `undefined` from its catch path.
- step counts 2/3/2
- each to-the-right-of check, by the same step IDs (`addStep` keeps the given IDs)
- the orphan-edge warning prefix
- no warning for a valid edge

One semantic tightening: both `console.warn` spies are now installed before the steps are added, not just before `autoLayout`. The no-warning case therefore also fails if adding the steps warns.

Reuse: existing `createTestStep` and `createMockStepPosition` from `Editor/test_fixtures.ts`. `workflowBoundingBox.test.ts` and `canvasDraw.test.ts` also set step positions, but with different shapes (positioned raw steps; state store only, no layout), so a shared helper has no clean second consumer. No supporting edits.

Validation: 4 tests pass shuffled (seed `270101`, `NODE_OPTIONS=--no-webstorage`). Scoped ESLint and Prettier pass; full `vue-tsc --noEmit` passes.

Guidance: none new.
