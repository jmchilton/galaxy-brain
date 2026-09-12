<!-- Suggested title: Match workflow `when` inputs by path instead of substring -->

The workflow editor reconstructs input terminals for connections that exist only to supply a step's `when` expression. Those terminals are used to draw the connection on the node and lay out the graph, but today the editor decides whether to create one with a substring search:

```typescript
step.when?.includes(inputName)
```

This confuses names such as `input1` and `input10`, counts input-like text inside strings and comments, and misses nested inputs because Galaxy stores the connection as `cond|input1` while the expression reads `inputs.cond.input1`. The result is a workflow graph with phantom condition terminals in some cases and missing terminals in others.

This PR replaces the substring heuristic with structural reference analysis. It also adds the path translation needed to compare Galaxy's two representations:

- workflow connections flatten nested names, for example `cond|input1`;
- `when` expressions traverse nested tool state, for example `inputs.cond.input1`; and
- repeat members add an indexed mapping, for example `queries_0|input2` to `inputs.queries[0].input2`.

Two focused modules keep those responsibilities separate:

- `whenExpression.ts` tokenizes the supported JavaScript-like property-access forms without executing the expression. It recognizes dot, bracket, mixed, numeric, and optional-chain access while ignoring strings, comments, and regular-expression contents.
- `workflowInputPath.ts` translates flattened connection names into segmented expression paths, resolves repeat indices against tool state, and returns no result when a name has more than one valid interpretation.

The step store now synthesizes an extra terminal only when the connection path is structurally referenced by the expression. Analysis remains deliberately conservative: computed properties, template literals, unsupported syntax, and tokenization failures are treated as dynamic, so the editor keeps a real connection when it cannot prove that the expression is unrelated.

The expression cases live in declarative YAML so the supported syntax and conservative boundaries can be reviewed as data and reused by other implementations. Path tests separately cover nested conditionals, repeats, nested repeats, literal names that resemble repeat members, and ambiguous flattened names.

This is a client-side follow-up to #23409, which removed the runtime's pipe-prefixed alias for nested tool inputs and left the nested property path as the canonical spelling. It does not change expression evaluation or the workflow format. The analyzer and shared cases are also the foundation for #23424's import-time validation and the follow-up editor work for running a step only when an optional input is present.

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
