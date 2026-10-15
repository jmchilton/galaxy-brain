# Test challenge

Keep the parametrized API regression test as implemented. Read the shared challenge/review instructions and Galaxy's backend test guidance. No new unit tests or mocks need to be removed, converted, or restructured.

The test is an appropriate request-contract test: each of the three preferred object-store fields is supplied through the actual invocation API, must produce HTTP 400, and must leave no history bearing the requested unique name. Prefix matching accounts for workflow history naming suffixes. Its reported baseline red (200 for each field) establishes that it detects the bug.

A test using only the ordinary API configuration could otherwise pass by rejecting every explicit store choice. Existing `test_workflow_objectstore_selection` provides the needed positive control under a selectable distributed store: omitted preferences select the default store, a valid general preference selects Static Storage, and valid split preferences select separate output/intermediate stores; invocation request serialization is checked as well. The implementation agent is running that integration test with the new API test. These real behavior checks are more useful than mocked validator-call assertions.

The preexisting mutual-exclusion predicate is preserved while moved earlier. No new browser/E2E test is warranted: the changed contract and history side effect are fully exposed through the API, and no client code changed. No tests were weakened or removed, and the reviewer made no code changes or duplicate suite runs. Record the implementation agent's completed green results in the final handoff.
