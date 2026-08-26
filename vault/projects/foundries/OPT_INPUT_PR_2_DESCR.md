<!-- Suggested title: Analyze workflow when input references structurally -->

This is PR 2 of 3. It is a frontend cleanup built on the expression-context normalization in PR 1 and provides the path-aware analysis used by the optional-input authoring feature in PR 3. It does not add a new workflow-editor control by itself.

The workflow editor previously decided whether a `when` expression referenced an extra connection with a substring check:

```typescript
step.when?.includes(inputName)
```

That is not sufficient once nested tool inputs have two intentionally different representations:

- workflow connections use flattened names such as `cond|input1`;
- expressions use property paths such as `inputs.cond.input1`; and
- repeat members add an indexed mapping such as `queries_0|input2` to `inputs.queries[0].input2`.

Substring matching can also confuse `input1` with `input10`, count input-like text inside strings or comments, and mistake a literal property containing `|` for a nested path.

This PR adds two small, focused modules:

- `workflowInputPath.ts` translates connection names into segmented expression paths, resolves repeat indices through tool state, and declines ambiguous names rather than guessing.
- `whenExpression.ts` tokenizes the supported JavaScript-like property-access shapes without executing user code. It recognizes dot, bracket, mixed, numeric, and optional-chain access; ignores strings, comments, and regular-expression contents; and treats computed or otherwise unsupported access conservatively as dynamic.

The workflow step store now uses this structural analysis when synthesizing extra input terminals for a `when` expression. This fixes false matches while preserving dynamically addressed expressions when static analysis cannot disprove the reference.

The expression cases live in declarative YAML so supported syntax and conservative failure boundaries can be reviewed as data. Separate path tests cover nested conditionals, repeats, nested repeats, literal names that resemble repeat members, and genuinely ambiguous flattened names.

## Stack

1. `issue_23333`: normalize the backend `when` expression context.
2. **This PR:** add structural input-path and expression-reference analysis in the editor.
3. `optional_input_gating`: consume this analysis for optional-input presence conditions.

This PR should be reviewed against `issue_23333`, not against `dev`.

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
