# Codex review debrief

One P2 confirmed and fixed (orphaned `when` connection on leaving boolean mode), one P1 needs John's decision, one P3 skipped; HEAD `dac9c04b5820ba5126fdd433994888c63a6d2684`.

## Triage

| ID | Finding | Verdict | Action |
| --- | --- | --- | --- |
| P1 | `whenExpression.ts` `expressionGuardsInputPresence`: `$(inputs.input1 !== null \|\| inputs.force)` classifies `unknown` and is accepted, though it can run with `input1` absent when `force` is true. | NEEDS-DECISION | Not changed. The permissive policy is deliberate (docstring: "deliberately permissive ... runtime remains authoritative"), and `when_expression_spec.yml` lists this exact case as `null_behavior: unknown`. John: keep permissive, or accept only `false-when-null` (stricter; rejects hand-written expressions the evaluator can't parse). |
| P2 | `FormConditional.vue`: boolean → presence (and boolean → none, also on dev) emits only a new `when`, leaving the `when` link in `input_connections`; `findStepExtraInputs` then hides the port, so a connection is persisted with no terminal to remove it. | CONFIRMED | Fixed (below). |
| P3 | `terminals.ts` `BaseOutputTerminal` computes `attr.optional \|\| Boolean(step.when)` separately from `stepOutputCanBeAbsent`. | SKIPPED | `implementation_debrief.md` records this as deliberate (constructor reads terminal args, not the step's output list); no behavioral divergence today. |

## P2 fix

The bug was two-layered. Besides the form not dropping the link, `UpdateStepAction` only writes the step store, while edges render from `connectionStore.connections`. Emitting `input_connections` without `when` alone would have fixed the saved JSON but left a ghost edge, which reappears when switching back to boolean.

- `FormConditional.vue`: leaving boolean mode (to presence or none) now also emits `input_connections` without the `when` key (`withoutBooleanGateConnection()`).
- `Actions/stepActions.ts`: new `UpdateStepConnectionsAction extends UpdateStepAction`. It captures the step's input-side connections that the new `input_connections` no longer lists. On run it removes them via `connectionStore.removeConnection`, which keeps the step store in sync. On undo it re-adds them before restoring `fromPartial`, so the original link shape comes back exactly. `useStepActions.updateStep` uses it whenever the partial carries `input_connections`. The form is the only caller that does.
- One undo restores both `when` and the connection. A re-added connection is appended to `connectionStore.connections`, so its position in the store can differ from the original. That doesn't change behavior.

Out of scope, not fixed:
- Custom expression → none/presence can orphan connections on ports the custom expression referenced, in the same way.
- The action removes connections through `connectionStore.removeConnection`, like `RemoveStepAction`. That skips `Terminal.resetMappingIfNeeded`, so map-over could go stale if a mapped-over boolean fed the `when` port.

## Tests (red → green)

- `Actions/actions.test.ts` "updateStep drops connections its input_connections no longer lists, undoably". Red before the fix (`expected [ Array(1) ] to have a length of +0 but got 1`: ghost connection left in the connection store). Green after; it also asserts the undo/redo snapshots match, connection-store maps included.
- `Forms/FormConditional.test.ts` "drops the boolean gate's connection when switching to presence/none". Both were red before (`input_connections` undefined). Also added an assertion that changing the presence input doesn't touch `input_connections`.
- `NODE_OPTIONS=--no-experimental-webstorage npx vitest run src/stores src/components/Workflow/Editor src/components/Form`: 112 files, 1140 tests passed.
- `npx vue-tsc --noEmit`: clean. eslint: no errors (4 `no-explicit-any` warnings, all from before this change). prettier: clean.
- E2E not run.

## Git

Amended into the single commit and force-pushed to `jmchilton/optional_input_gating`: `ef89d9be771` → `dac9c04b5820ba5126fdd433994888c63a6d2684`.
