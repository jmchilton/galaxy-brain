# Reserve pipes for nested workflow input paths

## Summary

Galaxy uses `|` to separate components of nested workflow input paths. Allowing
the same character in a workflow input label makes those paths ambiguous, so new
and updated workflows now reject input names containing pipes.

Existing workflows may already contain these names. When Galaxy serializes a
legacy workflow for the editor, it replaces pipes with underscores and appends a
numeric suffix when needed to avoid another step label. For nested workflows, the
upgrade also updates the parent step's input interface, input connections, and
static bracket references in `when` expressions.

Stored subworkflows are copied to a hidden upgraded workflow when necessary,
leaving the original workflow unchanged. The compatibility path also recognizes
older data-input names that are still stored in tool state instead of the step's
label column.

## Tests

Automated coverage includes:

- rejecting pipe-containing workflow input names through the update API;
- rejecting pipe-containing inputs in imported nested workflows;
- deterministic replacement names and collision handling;
- editor serialization of legacy top-level and nested inputs;
- rewriting nested input connections and `when` references;
- copying stored subworkflows before upgrading their interfaces; and
- legacy input names stored only in tool state.

Local validation:

- `test/unit/workflows/test_workflow_input_names.py`: 7 passed.
- Two focused `TestWorkflowsApi` regressions: 2 passed.
- Ruff, flake8, isort, Black, and full mypy pass.

## How to test the changes?

- [x] I've included appropriate automated tests.

## License

- [x] I agree to license these and all my past contributions to the core Galaxy
  codebase under the MIT license.
