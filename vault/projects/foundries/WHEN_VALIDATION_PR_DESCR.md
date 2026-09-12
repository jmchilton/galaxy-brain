<!-- Suggested title: Reject obsolete flat nested inputs in workflow `when` expressions -->

Galaxy no longer exposes nested tool inputs in workflow `when` expressions under its internal pipe-delimited connection names. After #23409, a nested value connected as `cond|input1` is available as `inputs.cond.input1` or `inputs["cond"]["input1"]`, but not as `inputs["cond|input1"]`.

Workflow import still accepts the removed spelling. This is especially dangerous in presence checks: JavaScript evaluates `undefined !== null` as true, so an expression such as `$(inputs["cond|input1"] !== null)` can silently run a step when the author intended to skip it. Other expressions fail only later, during invocation, with a generic expression-evaluation message.

This PR rejects that obsolete spelling when the workflow is imported. For tool steps with a string `when` expression, import now statically analyzes every resolvable `inputs` path and rejects a pipe-delimited root property. The error identifies the workflow step by order index and label, quotes the invalid reference, and shows the supported nested form.

The validation is deliberately narrow and conservative:

- each statically resolved path is checked even when the same expression also contains a dynamic access;
- computed properties, template literals, and syntax the analyzer cannot resolve remain allowed;
- a pipe in the root segment is rejected even when the expression continues through a child property; and
- subworkflow steps are excluded because a subworkflow input label containing `|` is a valid literal input name.

The client-side reference analyzer is ported to `galaxy.workflow.when_expression` rather than evaluating user JavaScript on the server. Both implementations run against the same declarative YAML cases through a package-data symlink, keeping dot, bracket, optional-chain, numeric, comment, string, regular-expression, and dynamic-access behavior aligned across languages.

API coverage exercises the rejected flat spelling, mixed static and dynamic references, and access through a child property. Negative controls cover fully dynamic access, the supported nested spellings, and valid pipe-containing subworkflow input labels. The 26.2 release note now states that imports reject the removed spelling.

Closes #23424.

Depends on the forthcoming `when_expression_analysis` PR and is based on that branch. Until it lands, review the top commit only.

## How to test the changes?

- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).
- [ ] This is a refactoring of components with existing test coverage.
- [ ] Instructions for manual testing are as follows:

Run the shared analyzer specification:

```shell
pytest -q test/unit/workflows/test_when_expression.py
```

Run the focused workflow-import API coverage:

```shell
pytest -q lib/galaxy_test/api/test_workflows.py::TestWorkflowsApi \
    -k 'import_rejects_flat_nested_tool_when_reference or import_allows_dynamic_tool_when_reference or import_allows_nested_tool_when_references or import_allows_flat_subworkflow_when_reference'
```

## License

- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
