<!-- Suggested title: Let workflow steps run only when an optional input is provided -->

https://github.com/user-attachments/assets/685511f7-298d-40c5-aa54-80378caeb2af

A Galaxy workflow author cannot currently connect an optional input to a required tool input in the editor — the connection is marked invalid. The runtime has supported this shape for some time: a step condition such as `$(inputs.primer.input_bed !== null)` causes the step to be skipped before required-input validation, so the step runs when the value is supplied and is cleanly skipped when it is absent. The gap is purely in authoring; expressing this today means hand-writing a `when` expression against an undocumented contract and then fighting the editor's connection validation. This PR makes the shape first-class: the **Conditionally skip step?** control becomes a mode selector including *run when a connected input is provided*, dropping an optional output on a required input previews and creates the connection plus its condition as one undoable action, and existing imported workflows using this pattern stop being flagged as invalid.

### Authoring conditions

The mode selector offers:

- always run;
- run when a boolean parameter is true;
- run when a connected input is provided; and
- a read-only custom-expression state for conditions the editor did not generate.

Generated conditions round-trip through the same analyzer used for connection validity. Nested conditional inputs use their nested property path, and repeat members use indexed expressions such as `inputs.queries[0].input2`. If a flattened connection name is ambiguous, the editor declines to generate an expression rather than silently writing the wrong one. Replacing a hand-written expression requires confirmation.

Dropping an optional output onto a required tool or subworkflow input now previews as an accepted connection and explains that the step will run only when the input is provided. Confirming the drop creates the connection and condition as one undoable action. Step types that cannot execute conditionally, such as pause steps, remain rejected and are still shown as incompatible.

### Connection validity and downstream behavior

Existing imported connections are accepted when the step's condition protects the required input from an absent value. The same rule applies to data, collection, and parameter terminals. It also handles the twin-dispatch shape where a separate probe and a consumed input share one optional source, while retaining negative controls for unrelated conditions, inverse conditions on consumed required inputs, filled terminals, and genuine type mismatches.

A conditional step's outputs remain optional because the step may not run. The accompanying documentation shows how to use a Pick Value step to merge a conditional output with a fallback before feeding required downstream inputs.

Synthesized expression-only probe ports inherit the connected source's data or parameter shape. The conventional `when` port remains a required boolean, preserving the existing validation contract.

### Feedback, tests, and documentation

The workflow-editor lint panel now reports statically resolvable condition inputs that have no connection, without warning on missing tools or expressions that cannot be resolved safely.

Regression coverage includes:

- framework workflows for top-level, nested dot, nested bracket, repeat, ungated failure, and twin-probe behavior, each tested with the optional value both present and absent where applicable;
- component and store tests for condition modes, expression generation, repeat paths, custom-expression preservation, terminal validity, drop highlighting, subworkflow support, pause-step rejection, probe typing, and dangling-condition linting; and
- Selenium coverage for selecting condition modes, clearing invalid connection marking, saving and downloading the generated expression, and validating the twin-dispatch topology.

The new developer documentation describes boolean and presence conditions, repeat syntax, conditional-output handling with Pick Value, twin dispatch, and dangling condition inputs.

Follow-up to #23333.

<!-- FILL IN: replace #PR2 below with the real number once PR 2 is opened. -->

Depends on #PR2 and is based on that branch, so the diff here shows both until it merges. Review the top commit only.

## How to test the changes?

- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).
- [ ] This is a refactoring of components with existing test coverage.
- [x] Instructions for manual testing are as follows:
  1. Add an optional workflow input and a tool or subworkflow with a required compatible input.
  2. Drag the optional output over the required input and verify that the target is shown as accepted with the conditional-execution explanation.
  3. Drop it, accept **Run only when provided**, and verify that the step form shows **Run when an input is provided** for that input.
  4. Save and run once with the optional value supplied and once without it; the step should run in the first invocation and be skipped in the second.

The focused framework-workflow coverage can be run with:

```shell
pytest lib/galaxy_test/workflow/test_framework_workflows.py \
    -k optional_input_gating -m workflow
```

The focused client tests can be run from `client/` with:

```shell
pnpm exec vitest run \
    src/components/Workflow/Editor/Forms/FormConditional.test.ts \
    src/components/Workflow/Editor/Lint.test.ts \
    src/components/Workflow/Editor/NodeInput.test.ts \
    src/components/Workflow/Editor/modules/linting.test.ts \
    src/components/Workflow/Editor/modules/terminals.test.ts \
    src/components/Workflow/Editor/modules/whenExpression.test.ts \
    src/stores/workflowStepStore.test.ts
```

## License

- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
