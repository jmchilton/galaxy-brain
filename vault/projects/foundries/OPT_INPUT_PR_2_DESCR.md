<!-- Suggested title: Match workflow `when` inputs by path instead of substring -->

The workflow editor decides whether to draw an input terminal for a connection that only feeds a step's `when` expression with a substring check:

```typescript
step.when?.includes(inputName)
```

This matches `input1` inside `input10` and inside strings or comments, and it misses nested inputs because the connection is named `cond|input1` while the expression reads `inputs.cond.input1`. The result is phantom terminals in some workflows and missing ones in others.

This PR replaces the substring check with structural analysis:

- `whenExpression.ts` tokenizes the expression without executing it and collects the `inputs` paths it reads: dot, bracket, numeric, and optional-chain access, ignoring strings, comments, and regex literals. Computed properties, template literals, and unparseable input are reported as dynamic, and the editor keeps the terminal in that case.
- `workflowInputPath.ts` translates connection names to expression paths, including repeats (`queries_0|input2` → `inputs.queries[0].input2`), and returns nothing for an ambiguous name.

The expression cases live in `when_expression_spec.yml` so other implementations can share them (#23424 uses them server-side). No change to expression evaluation or the workflow format. Follow-up to #23409, which made the nested path the only supported spelling.

## How to test the changes?

- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).
- [x] This is a refactoring of components with existing test coverage.
- [ ] Instructions for manual testing are as follows:

From `client/`:

```shell
pnpm exec vitest run \
    src/components/Workflow/Editor/modules/whenExpression.test.ts \
    src/components/Workflow/Editor/modules/workflowInputPath.test.ts \
    src/components/Workflow/Editor/modules/layout.test.ts \
    src/stores/workflowStepStore.test.ts
```

## License

- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
