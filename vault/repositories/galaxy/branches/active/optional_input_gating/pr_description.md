Follow-up to 🔀 #20647 - let workflow authors make a step run only when an optional input is provided, directly in the editor.

Galaxy already runs this shape: a condition such as `$(inputs.primer.input_bed !== null)` skips the step before its required input is validated (fixed in #20647). The editor won't let anyone build it, though. An optional output connected to a required input is marked invalid, and the only built-in condition is a boolean. IWC's virology workflow (`pe-illumina-simple-virus-calling-and-consensus.ga`) works around this with two helper steps: `map_param_value` turns the optional primer scheme into a boolean for `ivar trim`'s `when`, and a one-option `pick_value` passes the dataset on to `primer|input_bed`. With this PR, that step needs neither helper.

| Drag an optional output over a required input | Drop and confirm the condition |
| --- | --- |
| ![Accepted drop preview with explanation](screenshots/workflow_editor_drop_optional_output_preview.png) | ![Confirm dialog after dropping an optional output](screenshots/workflow_editor_drop_optional_output_confirm.png) |

| The step is gated and the connection is valid |
| --- |
| ![Connection accepted and step gated](screenshots/workflow_editor_drop_optional_output_gated.png) |

| New condition modes | Gated on an optional input |
| --- | --- |
| ![Conditionally skip step? mode options](screenshots/workflow_editor_step_gate_mode_options.png) | ![Run only when this input is provided](screenshots/workflow_editor_step_gated_on_optional_input.png) |

Dashed edges carry optional values; orange marks an invalid connection.

***This is editor-only: no server or runtime code changes, and every existing `$(inputs.when)` condition (the only form IWC uses, 186 of them) runs as before and opens as a boolean condition.***

***Nothing is skipped implicitly: a step skips only when its saved `when` says so, and the editor writes that `when` only after the author confirms it.***

***An optional output on a required input stays invalid unless the step's condition skips the step when that input is absent; dropping one only offers to write that condition.***

***The generated condition is an ordinary `when` expression the runtime already evaluates; the editor reads conditions only to judge connection validity and accepts those it can't decide, leaving the runtime as the authority.***

### What changes for authors

- **Condition modes.** **Conditionally skip step?** becomes a selector: always run, run when a boolean parameter is true, or run when a connected input is provided. Conditions the editor didn't write show as a read-only *Custom expression*, and replacing one asks for confirmation instead of silently clearing it.
- **Drop to gate.** An optional output dragged onto a required tool or subworkflow input previews as accepted and explains that the step will run only when the input is provided. Confirming creates the connection and the condition as one undoable action. Pause steps, steps that already have a condition and genuine type mismatches are still rejected, and the tooltip says which.
- **Imported workflows validate.** Connections that the step's condition protects from an absent value are no longer marked invalid. This applies to data, collection and parameter inputs, and to the "twin dispatch" shape where one step runs on `!== null` and another on `=== null` from the same source.

| Twin dispatch renders valid | Hand-written conditions are read-only |
| --- | --- |
| ![Twin dispatch connections valid](screenshots/workflow_editor_twin_dispatch_connections_valid.png) | ![Custom expression shown read-only](screenshots/workflow_editor_step_custom_condition_readonly.png) |

<details><summary>How the editor decides a connection is protected</summary>

- Generated conditions address the input by path: nested conditional inputs use their property path (`inputs.cond.input1`), and repeat members use indexes (`inputs.queries[0].input2`). If a flattened connection name is ambiguous, the editor declines to write a condition rather than guess.
- For existing conditions, a small evaluator binds the input to `null` and checks whether the step could still run. An inverse condition (`=== null`) on a consumed required input stays invalid. Conditions the evaluator can't decide (e.g. `inputs.a !== null || inputs.force`) are accepted.
- Expression-only probe ports take the type and optionality of whatever feeds them. The conventional `when` port remains a required boolean.
- A gated step's outputs stay optional because the step may not run. The new developer doc shows merging them with a fallback via Pick Value.

</details>

<details><summary>Commits</summary>

1. Use `select_set_value` for the pick value mode in editor tests: a test-only cleanup that replaces a sleep-and-script helper.
2. Extract shared step output helpers in the workflow editor: a refactor of existing code with no behavior change.
3. Drop connections orphaned when a step's condition changes: a fix for a bug on `dev`. Turning a boolean condition off left its `when` connection saved with no port. Any `when` change now removes connections whose condition port disappears, through the terminal path so map-over resets. One undo restores everything.
4. Add framework workflow tests for steps gated on optional input presence: these baseline tests pass on `dev`, since the runtime already supports the shape. An ungated control fails with `Parameter 'input1': specify a dataset…` when the optional input is omitted, which is why the gate matters.
5. Let workflow steps run only when an optional input is provided: the feature.

</details>

The existing workaround costs two extra steps per gate, and hand-written probe or twin-dispatch conditions are still flagged invalid. Skipping steps implicitly at runtime whenever a required input is null would silently change every existing workflow. An explicit, editor-written `when` keeps runtime semantics unchanged.

## Risks

This sets the editor-written `when` form (`$(inputs.<path> !== null)`) that new workflows will save and share, so that expression shape becomes a convention that is hard to walk back.

<details><summary>Risk Details</summary>

- Generated conditions are stored in workflows and exported to gxformat2; changing their spelling later needs migration or dual recognition.
- The evaluator is permissive for conditions it can't decide, so the editor can accept a connection that still fails at runtime when the input is absent.
- The condition control's UI changes from a checkbox to a selector, which authors have to learn.
- Changing a step's condition now removes the connections it no longer reads. Undo restores them, but no toast announces it.

</details>

<details><summary>Risk Review Advice</summary>

Review the generated expression form and path handling in `whenExpression.ts` and `presenceGate.ts`, since that's what lands in saved workflows. Check whether accepting undecidable conditions is the right default (the alternative rejects any hand-written condition the evaluator can't parse). Exercise drop → confirm → undo and changing modes on a step with connected probes. The runtime is untouched; the framework workflow tests pin that it already behaves as the editor now assumes.

</details>

## Context

Builds on 🔀 #20647 (runtime skip before required-input validation), 🔀 #23816 (matching `when` inputs by path) and 🔀 #24107 (Best Practices flags conditions whose input nothing is connected to, which covers the conditions this PR generates). Replaces the closed 🔀 #23345. Developed with [John's Galaxy Brain Branch Factory](https://jmchilton.github.io/galaxy-brain/factory/galaxy-branches/).

## Human Review

(PUBLISHING_AGENT: Please include the contents of BRANCH_DIRECTORY/human_review.md before publishing this. If that file doesn't exist please double check that this PR should be published - if user confirms yes publish without this section.)

## Agentic Checks

### ✅ [Scope Evaluation](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_SCOPE_EVALUATION.md)

<details><summary>Expanded modestly: any condition change now cleans up the connections it orphans.</summary>

The evaluation recommended generalizing the boolean-only orphan fix to every `when` transition (custom → none, probe → boolean/none/other input), with map-over reset, and that expansion is implemented. Twin dispatch and the inverse-gate evaluator stayed in scope: without them, imported twin workflows remain flagged invalid and inverse gates on consumed inputs would be accepted. Several decompositions into smaller PRs were laid out for review.

</details>

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>Gate logic was consolidated into <code>presenceGate.ts</code> and terminal methods, with no behavior change.</summary>

Building a gate expression had been written three times; it is now one helper. Drop assessment and the undoable connect-and-gate moved from `NodeInput.vue` into the terminal layer, which already owns undoable connections. Docstrings were trimmed. Deferred as wider changes: removing the `presenceGateAssumed` flag (it would thread an argument through `canAccept` and five overrides) and folding the new action into `UpdateStepAction`.

</details>

### ✅ [John's Galaxy Test Challenges](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_CHALLENGE_TESTS.md)

<details><summary>11 unit tests that passed on <code>dev</code> were dropped or merged; the rest fail without the change.</summary>

Negative checks were folded into tests that first prove the positive case, so a rejection can't pass vacuously. A new E2E test covers drag → confirm → valid connection → saved `when`. The E2E tests were then moved onto the shared `select_set_value` helper and waits, with screenshots, and pass on Playwright.

</details>

### ✅ Second Frontier Model Review

<details><summary>One bug was confirmed and fixed; one policy question is noted under Risks.</summary>

Leaving boolean mode left the `when` connection saved with no port; this is fixed in commit 3 and later generalized. The review also flagged that undecidable conditions are accepted. That is the deliberate permissive policy described above. A duplicated optionality rule in `BaseOutputTerminal` was left because it reads terminal arguments rather than step outputs.

</details>

### ✅ [Refactoring of base branch](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_REFACTOR_BASELINE.md)

<details><summary>Refactor, <code>dev</code> fix and baseline tests land ahead of the feature.</summary>

Shared step-output helpers are extracted from existing editor code with no behavior change. The orphaned-connection fix stands alone, with tests that fail before it. The framework workflow tests pass on `dev`, which pins that the runtime already supports the shape.

</details>

## John's Checklist

<details><summary>Checklist Details</summary>

- [x] What does the user see when it fails? Drop targets turn green or red with a tooltip giving the specific reason (e.g. "This step already has a condition."), gating asks for confirmation first, and hand-written conditions are read-only and need a confirm to replace. An undecidable condition that still runs without its input fails at runtime, as on `dev`.
- [x] Is the diff free of unrelated or stale generated changes? Yes! The pick-value test helper cleanup is isolated as commit 1.
- [x] Are unit tests not just testing the literal implementation? Yes. Generated expressions round-trip through the evaluator via a YAML spec, and undo/redo is compared against whole-workflow snapshots. New client tests fail on `dev` or on the pre-fix code; the framework tests pass on `dev` by design.
- [x] Are baseline tests in their own leading commits (if applicable)? Yes. The framework workflow tests come before the feature, and the fix commit carries its own red-to-green tests.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A
- [x] Which existing workflows change behavior (if any)? None at runtime. In the editor, imported presence-gated and twin-dispatch workflows stop showing invalid connections; IWC's boolean conditions open as boolean conditions.
- [x] Who hits this in practice and what is the evidence? Authors gating a step on an optional dataset. IWC's virology workflow needs `map_param_value` + `pick_value` to gate `ivar trim` on its optional primer scheme; related runtime reports are #20804 and #20182.
- [x] Were simpler or existing approaches considered? The two-step workaround and an implicit runtime skip (see above); smaller validity-only or evaluator-free splits were weighed in scope evaluation.

</details>

## How to test the changes?

- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

<details><summary>Coverage</summary>

- Framework workflows run the gate at top level and nested in a conditional and in a repeat, plus twin dispatch, each with the optional value present and absent, and an ungated control that fails without the value: `pytest lib/galaxy_test/workflow/test_framework_workflows.py -k optional_input_gating -m workflow`.
- Client tests cover condition modes, expression generation and evaluation, terminal validity for data, collection and parameter inputs, drop-to-gate with its rejection reasons and undo, orphaned-connection cleanup with map-over reset, and probe typing (`FormConditional`, `NodeInput`, `terminals`, `whenExpression`, `actions` and `workflowStepStore` tests).
- E2E covers choosing condition modes, drop-to-gate, twin dispatch validity, read-only custom conditions and the saved `when`. The mid-drag preview screenshot is taken on Playwright only.

</details>

- [x] Instructions for manual testing are as follows:

<details><summary>Manual testing</summary>

1. Add an optional workflow input and a tool with a required compatible input.
2. Drag the optional output onto the required input; the target shows as accepted with the conditional-execution explanation.
3. Drop it and confirm; the step form shows **Run when an input is provided** for that input.
4. Save and run once with the optional value and once without; the step runs in the first invocation and is skipped in the second.

</details>

## License

- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
