# Reserve pipes in workflow input names and correct legacy editor labels

Galaxy uses `|` to delimit nested input paths. This change rejects pipes in
workflow input names on import and update, including legacy data-input names
stored in tool state.

For the workflow currently being edited, legacy input labels are converted from
pipes to underscores in the editor response. Numeric suffixes avoid collisions
with existing step labels, including older names still carried in tool state.
Upgrade messages explain the replacement; the stored workflow is not changed
merely by requesting the editor representation.

This version does not upgrade parent subworkflow input interfaces or connections,
create hidden copies of referenced workflows, or rewrite `when` expressions or
other expression text. Nested migration remains separate author work.

## Tests

- Input-name validation, collision handling, and legacy tool-state coverage.
- Editor serialization of corrected current-workflow labels.
- Regression assertions that nested interfaces, connections, and expressions
  remain unchanged and referenced subworkflows are not copied.
- Retained API regressions for invalid names on update and nested import.
- Local focused unit tests pass; fork CI and the API regressions have not been
  rerun for this comparison branch.

## How to test the changes?

- [x] I have included appropriate automated tests.

## License

- [x] I agree to license these and all my past contributions to the core Galaxy
  codebase under the MIT license.
