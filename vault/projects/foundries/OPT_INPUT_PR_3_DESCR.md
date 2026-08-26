<!-- Suggested title: Support optional-input workflow conditions in the editor -->

This is PR 3 of 3. It adds the user-facing optional-input authoring behavior on top of the normalized runtime expression context from PR 1 and the structural editor analysis from PR 2.

Galaxy can already evaluate a step condition such as:

```javascript
$(inputs.primer.input_bed !== null)
```

This makes it valid for an optional workflow input to feed a required tool or subworkflow input: the step runs when the value is supplied and is skipped before required-input validation when the value is absent. The workflow editor previously refused or marked that connection invalid, however, and offered no direct way to author the condition.

This PR makes that workflow shape first-class in the editor.

### Authoring conditions

The existing **Conditionally skip step?** control becomes a mode selector with:

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

## Stack

1. `issue_23333`: normalize the backend `when` expression context.
2. `when_expression_analysis`: add structural input-path and expression-reference analysis.
3. **This PR:** add optional-input presence-condition authoring and validation.

This PR should be reviewed against `when_expression_analysis`, not against `dev`.

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
