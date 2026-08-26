<!-- Suggested title: Stop exposing flat nested inputs in workflow when expressions -->

This is PR 1 of 3 in a stack that prepares for and then adds editor support for running workflow steps only when an optional input is present. This first PR is independently useful and contains the backend compatibility correction tracked in #23333.

Galaxy builds the `inputs` object used by workflow `when` expressions from tool execution state plus extra step connections. A connected parameter nested inside a tool conditional was already available in its normal nested shape, but Galaxy also exposed the same value under its flat, pipe-prefixed connection name:

```javascript
inputs.cond.param
inputs["cond"]["param"]
inputs["cond|param"]
```

The last spelling leaks an internal workflow-connection representation into the expression API. It is undocumented, the workflow editor cannot generate it, and no use was found in the public Galaxy, IWC, GTN, or gxformat2 workflow corpora.

This PR stops copying recognized nested tool inputs into the expression context under their pipe-prefixed aliases. It preserves:

- nested dot and chained-bracket access;
- ordinary top-level inputs; and
- genuine extra expression inputs such as the conventional `inputs.when` boolean and arbitrary probe connections.

The new framework-workflow fixture exercises both supplied and omitted optional nested inputs. It also verifies, in the same expression, that dot and chained-bracket access agree, top-level and extra inputs remain available, and the flat nested alias is absent.

This is an intentional compatibility change for hand-authored private workflows that use `inputs["cond|param"]`. The supported replacement is `inputs.cond.param` or `inputs["cond"]["param"]`; the release note calls this out.

Closes #23333.

## Stack

1. **This PR:** normalize the backend `when` expression context.
2. `when_expression_analysis`: make the workflow editor reason about expression input paths structurally.
3. `optional_input_gating`: add optional-input presence conditions to the workflow editor.

Each PR is intended to be reviewed against the branch immediately below it.

## How to test the changes?

- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).
- [ ] This is a refactoring of components with existing test coverage.
- [ ] Instructions for manual testing are as follows:

The focused framework-workflow test can be run with:

```shell
pytest lib/galaxy_test/workflow/test_framework_workflows.py \
    -k when_expression_nested_tool_inputs -m workflow
```

## License

- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
