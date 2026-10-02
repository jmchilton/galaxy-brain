<!-- Suggested title: Reject obsolete flat nested inputs in workflow `when` expressions -->

Since #23409, a nested tool input connected as `cond|input1` is available to a `when` expression only as `inputs.cond.input1` (or `inputs["cond"]["input1"]`), not `inputs["cond|input1"]`. Workflow import still accepts the old spelling, and at run time it usually fails silently: `undefined !== null` is true in JavaScript, so `$(inputs["cond|input1"] !== null)` always runs the step.

This PR rejects the old spelling at import. For tool steps, every statically resolvable `inputs` path in the `when` expression is checked, and a pipe in the root segment raises an error naming the step, the reference, and the nested form to use instead.

The check is conservative:

- computed properties, template literals, and unparseable expressions are allowed;
- a static path is still checked when the same expression also has dynamic access;
- subworkflow steps are skipped, because a subworkflow input label containing `|` is a real input name.

The analysis is a Python port of the client analyzer from #23816 (`galaxy.workflow.when_expression`); nothing evaluates user JavaScript on the server. Both implementations run the same `when_expression_spec.yml` cases, shared through a package-data symlink the way `navigation.yml` is. The 26.2 release note now mentions the import error.

Closes #23424. Depends on #23816 and is based on that branch; until it lands, review the top three commits only.

## How to test the changes?

- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).
- [ ] This is a refactoring of components with existing test coverage.
- [ ] Instructions for manual testing are as follows:

```shell
pytest -q test/unit/workflows/test_when_expression.py
pytest -q lib/galaxy_test/api/test_workflows.py::TestWorkflowsApi \
    -k 'import_rejects_flat_nested_tool_when_reference or import_allows_dynamic_tool_when_reference or import_allows_nested_tool_when_references or import_allows_flat_subworkflow_when_reference'
```

## License

- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
