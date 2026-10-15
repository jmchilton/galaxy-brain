# Test challenges

Retain the new four-source API regression unchanged. Applied _shared/GX_PROCESS_CHALLENGE_TESTS.md using Galaxy doc/source/dev/writing_tests.md.

There are no new unit tests, mocks, or implementation-only assertions to replace. The public invocation API checks the actual status code for each supported existing-object input source. A well-formed encoded nonexistent ID distinguishes absence from malformed identifier validation. Matching the collection workflow input for hdca avoids accidental input-type failures. An explicit existing target history keeps history-creation policy outside the regression.

No browser test is warranted: there is no UI change, and the contract is the invocation API response. Expanded matrices for malformed IDs, deleted objects, transaction side effects, and label fallbacks would broaden the task without improving coverage of this specific absence regression. Existing valid-collection coverage is being run by the testing agent as a control.

No test edits made and no duplicate API run launched. Coordinator confirmed all four cases fail on dev with the prior status codes; final green results belong to the testing agent/coordinator.
