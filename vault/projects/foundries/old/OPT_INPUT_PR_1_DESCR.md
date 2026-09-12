<!-- Suggested title: Stop exposing flat nested inputs in workflow when expressions -->

Galaxy builds the `inputs` object for workflow `when` expressions from tool execution state plus extra step connections. A parameter nested inside a tool conditional is available in its natural nested shape, `inputs.cond.param`, but Galaxy also exposes the same value under the workflow editor's internal flattened connection name, `inputs["cond|param"]`. That second spelling is an implementation detail escaping into a public expression API: it is undocumented, the editor cannot generate it, and it appears nowhere in the public Galaxy, IWC, GTN, or gxformat2 workflow corpora. This PR removes it, leaving one supported way to reach a nested input. That matters now because upcoming editor work needs to generate and read back these expressions, which is only tractable if each value has a single canonical path.

So, of these three spellings, the third stops resolving:

```javascript
inputs.cond.param
inputs["cond"]["param"]
inputs["cond|param"]
```

This PR stops copying recognized nested tool inputs into the expression context under their pipe-prefixed aliases. It preserves:

- nested dot and chained-bracket access;
- ordinary top-level inputs; and
- genuine extra expression inputs such as the conventional `inputs.when` boolean and arbitrary probe connections.

The new framework-workflow fixture exercises both supplied and omitted optional nested inputs. It also verifies, in the same expression, that dot and chained-bracket access agree, top-level and extra inputs remain available, and the flat nested alias is absent.

This is an intentional compatibility change for hand-authored private workflows that use `inputs["cond|param"]`. The supported replacement is `inputs.cond.param` or `inputs["cond"]["param"]`; the release note calls this out.

Closes #23333.

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
