# Gating a workflow step on optional-input presence — Galaxy implementation plan

## Summary

Galaxy can already run a workflow step only when an optional dataset was supplied, but the workflow
editor refuses the necessary connection: it will not connect an optional workflow output to a
required tool input. As a result, authors cannot build this valid workflow in the editor, and an
equivalent workflow imported from gxformat2 is treated as having an invalid connection.

After #23333 lands, make presence gating a first-class authoring mode. The step form's existing
"conditionally skip step" control, which today knows only the boolean-parameter gate, gains a *"run
this step only when this input is provided"* mode that writes a `when` expression checking the input
for `null`; dropping an optional output onto a required input offers the same thing inline. When the
dataset is present, the step runs normally; when it is absent, the step is skipped, and its output
can be merged with a fallback using `pick_value`. One shared, path-aware helper recognizes the same
guard everywhere the editor reasons about it — connection validity, gate mode, and probe terminals —
including inputs nested inside tool conditionals. Add runtime and editor regression tests for this
behavior and document the authoring pattern.

## Prerequisite

Build this work on
[galaxyproject/galaxy#23333](https://github.com/galaxyproject/galaxy/issues/23333), which removes
flat pipe-prefixed tool-input aliases such as `inputs["cond|input1"]` from the workflow `when`
expression context while preserving genuine extra inputs such as `inputs.when` and `inputs.probe`.
This plan assumes that issue has landed: workflow connection names remain pipe-prefixed internally,
but expressions address nested tool state only through normal JavaScript paths such as
`inputs.cond.input1` or `inputs["cond"]["input1"]`.

Experimental evidence is preserved on the explicitly non-upstream
[`jmchilton/galaxy:optional_inputs_experiments`](https://github.com/jmchilton/galaxy/tree/optional_inputs_experiments)
branch, based on this work's `optional_inputs` branch. The immutable evidence snapshot is
[`a32e1044fb`](https://github.com/jmchilton/galaxy/commit/a32e1044fbf52d813b4566ebd15fa7dce71bcb3d);
see its
[`OPTIONAL_INPUT_GATING_EXPERIMENTS.md`](https://github.com/jmchilton/galaxy/blob/optional_inputs_experiments/OPTIONAL_INPUT_GATING_EXPERIMENTS.md)
for the full exploratory findings.

---

## Evidence base

The evidence branch archives six exploratory cases as workflow/test pairs, including the discarded
input-laundering branch. This plan carries forward the five relevant cases below. All twelve tests
pass on `optional_inputs_experiments` with:

```shell
PATH="$PWD/.venv/bin:$PATH" .venv/bin/pytest \
    lib/galaxy_test/workflow/test_framework_workflows.py -k exp_ -m workflow
```

| Fixture                | Establishes                                                                                                                                                                                                                     |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`exp_a_toplevel`](https://github.com/jmchilton/galaxy/blob/optional_inputs_experiments/lib/galaxy_test/workflow/exp_a_toplevel.gxwf.yml) ([tests](https://github.com/jmchilton/galaxy/blob/optional_inputs_experiments/lib/galaxy_test/workflow/exp_a_toplevel.gxwf-tests.yml)) | `when: $(inputs.input1 !== null)` gates on a required top-level data param fed by an omitted optional workflow input. Step skips, `pick_value` falls back. |
| [`exp_a_nested_dot`](https://github.com/jmchilton/galaxy/blob/optional_inputs_experiments/lib/galaxy_test/workflow/exp_a_nested_dot.gxwf.yml) ([tests](https://github.com/jmchilton/galaxy/blob/optional_inputs_experiments/lib/galaxy_test/workflow/exp_a_nested_dot.gxwf-tests.yml)) | Same, param nested in a tool `<conditional>`, dot spelling `$(inputs.cond.input1 !== null)`. |
| [`exp_a_nested_bracket`](https://github.com/jmchilton/galaxy/blob/optional_inputs_experiments/lib/galaxy_test/workflow/exp_a_nested_bracket.gxwf.yml) ([tests](https://github.com/jmchilton/galaxy/blob/optional_inputs_experiments/lib/galaxy_test/workflow/exp_a_nested_bracket.gxwf-tests.yml)) | Prototype proving today's flat prefixed spelling `$(inputs["cond\|input1"] !== null)` resolves. Do **not** land this expectation: after #23333, replace it with chained bracket access, `$(inputs["cond"]["input1"] !== null)`. |
| [`exp_nogate`](https://github.com/jmchilton/galaxy/blob/optional_inputs_experiments/lib/galaxy_test/workflow/exp_nogate.gxwf.yml) ([tests](https://github.com/jmchilton/galaxy/blob/optional_inputs_experiments/lib/galaxy_test/workflow/exp_nogate.gxwf-tests.yml)) | Control. Identical topology minus the `when`: tool request state `validation_failed`, job errors `Parameter 'input1': specify a dataset of the required format`. |
| [`exp_twin_probe`](https://github.com/jmchilton/galaxy/blob/optional_inputs_experiments/lib/galaxy_test/workflow/exp_twin_probe.gxwf.yml) ([tests](https://github.com/jmchilton/galaxy/blob/optional_inputs_experiments/lib/galaxy_test/workflow/exp_twin_probe.gxwf-tests.yml)) | A non-tool-param data connection works as a pure `when` probe on both copies of a twin dispatch, gating `$(inputs.probe !== null)` / `=== null`. |

Three consequences drive the implementation.

1. **Beyond #23333, no server work is required for the core feature.** gxformat2 import and the
   runtime both accept an optional workflow input wired straight into a required tool data param.
   The refusal is client-only, in two sibling `attachable` implementations: data inputs reject at
   [`terminals.ts:379`](https://github.com/jmchilton/galaxy/blob/optional_inputs_experiments/client/src/components/Workflow/Editor/modules/terminals.ts#L379)
   ("Cannot connect an optional output to a non-optional input") and parameter inputs reject at
   [`terminals.ts:585`](https://github.com/jmchilton/galaxy/blob/optional_inputs_experiments/client/src/components/Workflow/Editor/modules/terminals.ts#L585)
   ("Cannot attach an optional output to a required parameter"). The direct form trips the first;
   the probe form trips the second, because synthesized probe ports are parameter terminals.
2. **The skip is caused by the `when` expression**, not by upstream null propagation. `exp_nogate`
   is the control that proves it; keep it.
3. **Twin dispatch is already expressible.**
   [`modules.py:~3137`](https://github.com/jmchilton/galaxy/blob/optional_inputs_experiments/lib/galaxy/workflow/modules.py#L3137)
   resolves
   unknown step-input names via `replacement_for_connection(..., is_data=True)` into
   `extra_step_state` — the same mechanism the `id: when` convention rides, except it carries
   datasets, not just booleans.

## Supported workflow shapes

Direct form — the common case, where absent means "don't run this step":

```yaml
steps:
  trim:
    tool_id: ivar_trim
    in:
      input_bam: {source: mapped}
      primer|input_bed: {source: primer_scheme_optional}
    when: $(inputs.primer.input_bed !== null)
  merge:
    type: pick_value
    in:
      input_0: {source: trim/output_bam}
      input_1: {source: mapped}
    state: {mode: first_non_null}
```

Here `pick_value` merges the gated output with a fallback. It is not an input-side adapter.

Twin form — where the tool must run either way in different `<conditional>` states. Tool state is
frozen per step, so two copies are unavoidable; the probe is what makes the negative branch
expressible at all.

```yaml
  with_ref:
    tool_id: some_tool
    in:
      ref: {source: maybe}
      probe: {source: maybe}
    when: $(inputs.probe !== null)
  without_ref:
    tool_id: some_tool
    in:
      probe: {source: maybe}
    when: $(inputs.probe === null)
```

---

## Phase 0 — land the fixtures as the regression floor

The prototypes pass against today's runtime and pin behavior nobody has documented or guarded.
After #23333 lands, update the obsolete flat-bracket fixture and land this phase before any editor
behavior changes, so later phases have something to break.

- Rename `exp_*` → `optional_input_gating_*`; the `exp_` prefix was only for `-k` filtering.
- Replace `exp_a_nested_bracket`'s flat pipe-prefixed expression with
  `$(inputs["cond"]["input1"] !== null)` before landing it. The removed spelling belongs in
  #23333's compatibility coverage, not in this feature's regression floor.
- Keep `exp_nogate` as the control proving that the gate, rather than upstream null propagation,
  skips the step.
- Give each test case a `doc` naming what it proves.

Exit: green in CI, no production code touched.

## Phase 1 — unblock the direct form in the editor

This phase contains one correctness fix (1a), the authoring surface (1b), and a shortcut into it
(1c). Land them in that order; each is shippable alone.

**1a. False "invalid connection" marking (correctness, do first).**

`attachable` is not only drag validation.
[`getInvalidConnectedTerminals()`](https://github.com/jmchilton/galaxy/blob/optional_inputs_experiments/client/src/components/Workflow/Editor/modules/terminals.ts#L438)
calls it over *already-connected* terminals and routes failures to
`connectionStore.markInvalidConnection`; the output-terminal equivalent is at
[`terminals.ts:764`](https://github.com/jmchilton/galaxy/blob/optional_inputs_experiments/client/src/components/Workflow/Editor/modules/terminals.ts#L764),
and the check runs from
[`useTerminal.ts:23`](https://github.com/jmchilton/galaxy/blob/optional_inputs_experiments/client/src/components/Workflow/Editor/composables/useTerminal.ts#L23)
on every terminal.
So an API- or gxformat2-authored direct-form workflow is expected to be marked invalid when opened
in the editor, even though it runs correctly.

- **Verify first.** Import `exp_a_toplevel.gxwf.yml` and observe the invalid marking, and
  `exp_twin_probe.gxwf.yml` for the parameter-terminal equivalent. Also confirm that
  `destroyInvalidConnections` still has no production caller. If the marking does not appear, drop
  1a and retain 1b.
- Fix, in both `attachable` implementations: accept optional→required when the input's step has a
  `when` that references this input and is not known to run when the input is absent. Reuse the path
  analysis described below for both this decision and Phase 2; do not write a second substring
  matcher.
- Synthesized probe inputs (Phase 2) are exempt from the null-behavior test. Nothing consumes them,
  so the inverse gate `$(inputs.probe === null)` is as valid as the positive one; requiring a
  presence guard there would mark half of `exp_twin_probe` invalid.

*Test (red-to-green):* both rules already have coverage —
[`rejects optional data -> required data`](https://github.com/jmchilton/galaxy/blob/optional_inputs_experiments/client/src/components/Workflow/Editor/modules/terminals.test.ts#L528)
and
[`rejects optional integer to required parameter connection`](https://github.com/jmchilton/galaxy/blob/optional_inputs_experiments/client/src/components/Workflow/Editor/modules/terminals.test.ts#L558).
Add a case per terminal class building an input terminal whose step carries
`when: "$(inputs.input1 !== null)"` and assert `attachable(optionalOutput).canAccept` is true; both
fail today. Add the negatives: same terminals, step `when` undefined, still refused.

### Expression analysis contract

The editor has Galaxy's pipe-prefixed connection names (`cond|input1`), while #23333 leaves the
expression with a nested JavaScript path (`inputs.cond.input1`). Compare paths, not substrings and
not pipe-joined strings:

```typescript
type ReferenceAnalysis = {
    staticPaths: string[][];
    hasDynamicInputsAccess: boolean;
};

function expressionReferencesInput(expression: string | undefined, inputName: string): boolean {
    if (!expression) {
        return false;
    }

    const targetPath = inputName.split("|");
    const references = analyzeInputReferences(expression);

    if (references.hasDynamicInputsAccess) {
        // The candidate is already a real connection. Prefer showing a real edge
        // when static analysis cannot disprove the reference.
        return true;
    }

    return references.staticPaths.some((referencedPath) => isPathPrefix(targetPath, referencedPath));
}
```

Implement `analyzeInputReferences` as a small property-access tokenizer, not a general JavaScript
evaluator. It recognizes dot, chained-bracket, and mixed static access (including single quotes)
while ignoring strings and comments:

```text
inputs.cond.input1         -> ["cond", "input1"]
inputs["cond"]["input1"] -> ["cond", "input1"]
inputs.cond["input1"]     -> ["cond", "input1"]
inputs["cond|input1"]     -> ["cond|input1"]
```

The last path has one segment and therefore does not match the internal connection path
`["cond", "input1"]`. Prefix matching means a nested access references both `cond` and
`cond|input1`, while exact segment comparison prevents `input1` from matching `input10`. A bare or
dynamically indexed access such as `inputs[name]` sets `hasDynamicInputsAccess`; for terminal
display it deliberately matches every candidate real connection rather than hiding an edge.

Presence analysis should be three-valued internally so the compatibility policy is explicit:

```typescript
type NullBehavior = "false-when-null" | "true-when-null" | "unknown";

function expressionGuardsInputPresence(expression: string | undefined, inputName: string): boolean {
    if (!expressionReferencesInput(expression, inputName)) {
        return false;
    }

    const nullBehavior = classifyWhenInputIsNull(expression, inputName);

    if (nullBehavior === "true-when-null") {
        // This is a known inverse gate: the required input will be absent when the step runs.
        return false;
    }

    // Proven presence guard, or too complex to disprove. Prefer allowing a questionable
    // connection to falsely marking a valid imported connection as invalid.
    return true;
}
```

`classifyWhenInputIsNull` likewise recognizes only structurally obvious null checks and boolean
combinations; it does not execute user JavaScript. Unsupported expressions are `unknown`, not
rejected. The runtime remains authoritative: this predicate controls editor compatibility marking,
not workflow execution.

| Expression, for target `cond\|input1` | References target? | Behavior when target is `null` | Relax optional→required? |
| --- | ---: | --- | ---: |
| `$(inputs.cond.input1 !== null)` | yes | false | yes |
| `$(inputs["cond"]["input1"] != null)` | yes | false | yes |
| `$(!!inputs.cond.input1)` | yes | false | yes |
| `$(inputs.cond.input1 === null)` | yes | true | no |
| `$(inputs.cond.input1 === null \|\| inputs.force)` | yes | true | no |
| `$(helper(inputs.cond.input1))` | yes | unknown | yes, deliberately permissive |
| `$(inputs[name] !== null)` | dynamic/possible | unknown | yes, deliberately permissive |
| `$(inputs.cond.input10 !== null)` | no | n/a | no |
| `$(inputs["cond\|input1"] !== null)` | no | n/a | no |
| `$(inputs.other !== null)` | no | n/a | no |

Tests should cover every row in this table. Test the path analyzer directly, then keep the two
terminal-level assertions above to prove that its result is actually used by `attachable`.

**1b. Gate modes in the step form.**

[`FormConditional.vue`](https://github.com/galaxyproject/galaxy/blob/dev/client/src/components/Workflow/Editor/Forms/FormConditional.vue)
is the only place `step.when` is authored today, and it recognizes exactly one expression. It
renders for tool steps
([`FormTool.vue`](https://github.com/galaxyproject/galaxy/blob/dev/client/src/components/Workflow/Editor/Forms/FormTool.vue))
and subworkflow steps
([`FormDefault.vue`](https://github.com/galaxyproject/galaxy/blob/dev/client/src/components/Workflow/Editor/Forms/FormDefault.vue),
under `isSubworkflow`) — both of the step types that can carry a gate. Its current contract is
actively hostile to any expression it did not write:

- `conditionalDefined = Boolean(step.when)`, so a presence gate makes the boolean toggle read *on*.
- `onSkipBoolean(false)` sets `when: undefined` for **any** expression. One click silently deletes a
  presence gate or a hand-authored expression, with no confirmation.
- `onSkipBoolean(true)` unconditionally writes `input_connections: {..., when: undefined}`, which is
  wrong for a step whose gate rides a data probe.

Writing a `when` from anywhere else therefore requires touching this component regardless. Replace
the boolean toggle with a gate mode, classified by the analyzer from 1a — its third consumer, after
`attachable` and `findStepExtraInputs`.

| Mode | Expression | Behavior |
| --- | --- | --- |
| No condition | none | Selecting it is the only way to clear a gate; confirm first when the expression is not one this form generated. |
| Boolean parameter | `$(inputs.when)` | Today's behavior verbatim, including the `when` connection reset. This is the `id: when` convention the whole IWC corpus uses; do not disturb it. |
| Input provided | `$(inputs.<path> !== null)` | Select over the step's connected optional inputs. Generate dot access for JavaScript-safe identifiers and chained bracket access otherwise: `inputs.cond.input1` but `inputs["segment-with-dashes"]`. |
| Custom | anything else | Read-only display of the expression — the template already carries a disabled text field for this, commented out. Never silently rewrite or clear it. |

Mode writes go through one `setPresenceGate(stepId, inputName)` helper so 1c produces identical
state.

Also settle gate lifecycle here, because this is the surface that makes it recoverable. Deleting the
gating connection leaves a tool-param gate evaluating false forever — the tool state key survives as
null — while a probe gate makes `do_eval` raise into a handler that deliberately suppresses the
message. Surface the dangling gate rather than letting either happen quietly.

The best-practices panel is where that surfacing belongs. Add a `getDanglingGates` sibling to
[`getDisconnectedInputs`](https://github.com/galaxyproject/galaxy/blob/dev/client/src/components/Workflow/Editor/modules/linting.ts)
that flags a step whose `when` references an input with no connection, a state type in the
`LintState` union in
[`lintingTypes.d.ts`](https://github.com/galaxyproject/galaxy/blob/dev/client/src/components/Workflow/Editor/modules/lintingTypes.d.ts),
a `LintSection` in the critical group of
[`Lint.vue`](https://github.com/galaxyproject/galaxy/blob/dev/client/src/components/Workflow/Editor/Lint.vue),
and coverage in
[`Lint.test.ts`](https://github.com/galaxyproject/galaxy/blob/dev/client/src/components/Workflow/Editor/Lint.test.ts).
Two details shape it:

- `getDisconnectedInputs` walks `step.inputs` and not `getCombinedStepInputs`, which is why a
  disconnected `when` port goes unflagged today. The new check covers the synthesized ports the
  existing one cannot see, boolean gates included; the equivalent boolean case is already marked
  `TODO: hook up best practice panel, disable save when "when" not connected` in
  [`test_editor_create_conditional_step`](https://github.com/galaxyproject/galaxy/blob/dev/lib/galaxy_test/selenium/test_workflow_editor.py).
- Set `autofix: false`. The disconnected-input autofix routes to `fixDisconnectedInput` and an
  `ExtractInputAction` refactor, which has no sensible meaning for a synthesized gate port.

There is no companion lint for an optional input feeding a required param with no gate. That case is
a live connection, so 1a already refuses it and the invalid-connection marking is the report.

*Test (red-to-green):* `FormConditional.vue` has no vitest;
[`FormPickValue.test.ts`](https://github.com/galaxyproject/galaxy/blob/dev/client/src/components/Workflow/Editor/Forms/FormPickValue.test.ts)
is the sibling precedent. Cover round-tripping each mode, and assert that loading a custom
expression neither rewrites nor clears it.

Cover the save round-trip too. Phase 0 proves import-and-run; nothing yet proves that an expression
authored in the editor survives a save. Add an assertion in the selenium flow that after selecting
the mode, `assert_workflow_has_changes_and_save()` followed by `_download_current_workflow()` yields
the expected `when` on the step — the pattern
[`test_pick_value_grow_on_connect`](https://github.com/galaxyproject/galaxy/blob/dev/lib/galaxy_test/selenium/test_workflow_editor.py)
already uses for `tool_state` and `input_connections`.

Migration: the selenium selector `step_when` resolves to `//div[@id='form-element-__conditional']//input`
in
[`navigation.yml`](https://github.com/galaxyproject/galaxy/blob/dev/client/src/utils/navigation/navigation.yml),
a checkbox. Both it and `test_editor_create_conditional_step` need updating alongside the mode
control.

**1c. The drop shortcut.**

Chicken-and-egg: at drop time there is no `when` yet, so the acceptance rule from 1a cannot
authorize the initial connection. The drop handler intercepts the refusal and offers the remedy.

- Offer: *"Run this step only when <input label> is provided."* Accepting calls `setPresenceGate`
  and makes the connection in one undo step, via the `undoRedoStore.action().onRun().onUndo()`
  pattern already used for connections in
  [`terminals.ts`](https://github.com/jmchilton/galaxy/blob/optional_inputs_experiments/client/src/components/Workflow/Editor/modules/terminals.ts#L100).
- Minimum viable slice, if 1c slips: keep the refusal but name 1b's mode in the message. There is
  precedent at
  [`terminals.ts:707`](https://github.com/jmchilton/galaxy/blob/optional_inputs_experiments/client/src/components/Workflow/Editor/modules/terminals.ts#L707)
  ("consider using the 'Split Paired and Unpaired' tool"). Cheap, shippable alone, and strictly
  better than the current dead-end string.

## Phase 2 — probe terminal typing

[`findStepExtraInputs`](https://github.com/jmchilton/galaxy/blob/optional_inputs_experiments/client/src/stores/workflowStepStore.ts#L476)
synthesizes ports for
connections that are not tool params, hardcoded to `input_type: "parameter", type: "boolean"`. A
data probe (`exp_twin_probe`) renders as a boolean port receiving a dataset.

- Infer `input_type`, `type`, and `optional` from the connection's source output rather than
  hardcoding. `optional` matters as much as `type`: a probe fed by an optional workflow input is
  otherwise a required parameter terminal, which is the second refusal site from Phase 1a.
- Replace `step.when?.includes(inputName)` with `expressionReferencesInput(step.when, inputName)`.
  Over-match remains benign — every candidate is already a real connection, so a spurious match
  only makes a real edge visible. **Under**-match is the lossy direction: it hides a real connection
  and makes the imported graph misleading. This is why dynamic or unrecognized `inputs` access is
  treated permissively.

*Test (red-to-green):* no vitest currently covers this function; `getCombinedStepInputs` is
exported and `stepStore.getStepExtraInputs` is reachable. Add a store test with a data-sourced probe
connection and assert the synthesized terminal is an optional dataset terminal. Fails today.

## Deferred — twin dispatch affordance

The hand-authored `exp_twin_probe` shape works today, but a first-class affordance would require one
editor node to manage two tool copies, complementary gates, and an output merge. That is a separate
editor abstraction. Reconsider it only if usage shows the direct form is insufficient.

## Phase 3 — documentation

Discoverability caused the original failure: without a documented presence-gating pattern, the
workflow input was made required instead.

- Galaxy training: extend the workflow-conditionals material with presence gating. It currently
  covers only user-boolean gates, which is why all 79 gated steps in IWC use `id: when`.
- Document *gate, then merge*. A gated step's outputs are optional — the editor derives that from
  the presence of `when` — so feeding one straight into a required downstream input is refused, and
  correctly so. The fix is to merge with a fallback right after the gate rather than to chain gated
  outputs. This is already how the corpus works: of the 61 connections leaving a gated step in IWC,
  50 land on `pick_value`, whose `pick_from` values are all `optional="true"`. Four chain gated step
  to gated step; say plainly that this is the shape to avoid.
- Reconcile the two `pick_value` spellings. The corpus uses the toolshed tool
  `iuc/pick_value`; this plan's examples use the native `pick_value` module, which is the better
  forward path because it has the editor palette entry, `FormPickValue.vue`, and disconnect
  compaction. Document the native module, but name the shed tool so authors transferring from IWC
  recognize the idiom.
- Note explicitly that data inputs are available in `when` expressions.
  [`directory_index.gxwf.yml`](https://github.com/jmchilton/galaxy/blob/optional_inputs_experiments/lib/galaxy_test/workflow/directory_index.gxwf.yml)
  has quietly relied on this (`$(inputs.reference.format != "bwa_mem2_index")`) with no prose.

---

## Testing strategy

| Layer | Vehicle | Status |
| --- | --- | --- |
| Runtime semantics | [evidence branch framework-workflows](https://github.com/jmchilton/galaxy/tree/optional_inputs_experiments/lib/galaxy_test/workflow) | 12/12 exploratory tests pass; carry forward five cases, replace the flat-bracket case, and reverify on #23333 |
| Editor acceptance rules | `terminals.test.ts` vitest | infrastructure exists; both Phase 1a cases are red today |
| Gate modes in the step form | new vitest against `FormConditional.vue` | none today; `FormPickValue.test.ts` is the precedent |
| Probe terminal typing | new vitest against `workflowStepStore` | red today |
| End-to-end editor authoring | Playwright, extending [`test_editor_create_conditional_step`](https://github.com/galaxyproject/galaxy/blob/dev/lib/galaxy_test/selenium/test_workflow_editor.py) | infrastructure exists; that test already drives the conditional flow, including `assert_connection_invalid` on a gated output |
| Editor save round-trip | same selenium flow, `_download_current_workflow()` | new; proves an editor-authored `when` survives save |
| Dangling gate lint | `Lint.test.ts` vitest | new check, new coverage |

Red-to-green throughout: every phase's first commit is the failing test. Phase 0 is the exception
and deliberately so — those fixtures assert existing behavior and must be green on arrival.

## Risks and dependencies

- **No corpus uptake of non-boolean gates.** All 79 gated steps in IWC spell their condition
  `$(inputs.when)`. The presence gate is greenfield: no body of existing workflows to regress, and
  no field evidence about its ergonomics.
- **The merge half is not greenfield, and that helps.** 50 of the 61 connections leaving a gated
  step in IWC land on `pick_value`. Authors already know gate-then-merge; what they lack is a way to
  spell the gate as anything but a boolean parameter. The uptake is on the toolshed tool rather than
  the native module, so documentation has to bridge the two spellings.

## Non-goals

Do not add implicit null propagation, `valueFrom` authoring, or a presence-to-boolean module. This
plan keeps skipping explicit in `when`; `exp_nogate` protects that boundary.
