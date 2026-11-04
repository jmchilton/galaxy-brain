# Focused test challenge: polished-fix reconciliation

The carried-forward tests are appropriate for this reconciliation; no new test rewrite is required. Read the shared test-challenge instructions and Galaxy's `doc/source/dev/writing_tests.md` and inspected source/dev/polished test inventories and changed assertions.

## Coverage and assertion challenges

- Workflow request validation belongs at the API layer. Wrong primitive types, restrictions, suggestions, multiple-value per-entry validators, deleted/missing inputs, access restrictions, library copies, scheduler choices, and rejection before history/job creation are exercised through real API requests. These tests do not merely assert helper return values or mock collaborator calls.
- The original source's validation-unit tests had already been replaced by API tests. Reconciliation introduces no new mock-heavy unit tests. All existing dev workflow-module and landing tests survive unchanged by AST comparison.
- The existing landing ownership unit test exercises a real manager/session fixture and ownership transitions; it was not added or changed by reconciliation and was retained. Existing polished parameter form/serialization tests are likewise retained instead of being deleted because API coverage now exists elsewhere.
- `test_run_with_unknown_scheduler` is redundant with the polished `test_run_with_scheduler` parametrization and is correctly removed. The replacement includes successful default/omitted/empty requests and the unknown scheduler failure.
- `test_subworkflow_missing_input_connection_error` changes from inspecting a failed invocation to checking HTTP 400, the error code/message, zero invocations, and unchanged job count. This is justified by earlier validation. Partial and nested disconnected-input cases complement it, while existing default/optional cases remain available as positive controls.
- The per-entry length-validator doctest is retained to distinguish a list of four valid short values from a single too-long value. Current shared text/integer/float normalization coverage remains available and production reconciliation reuses those classes.
- No browser test is warranted for this server request-validation reconciliation. No client behavior or UI rendering changed; API assertions expose the contract directly.

## Validation boundary

Parent is running the focused API and polished generator selections; implementation agent is running workflow units and parameter doctests. This review deliberately did not duplicate those suites or mutate code under running tests. Runtime results must be recorded by the parent in the implementation handoff. Known valid-collection request failures already present on the original source should remain explicitly identified as preexisting limitations, rather than hidden through skipped tests or relaxed assertions.

No tests were removed or weakened by the reviewer, no implementation edits were made, and no additional standalone feature scope was introduced.
