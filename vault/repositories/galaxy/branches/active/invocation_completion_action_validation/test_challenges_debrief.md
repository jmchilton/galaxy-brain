# Test challenge

Keep the new API regression test. It exercises a real invocation request rather than implementation details, has no mocks, and checks the visible error plus both relevant side effects: no invocation and no requested new history. The implementation agent reports baseline red with HTTP 200; green validation is being run separately.

Existing completion API tests are the right positive controls: export configuration remains accepted, including its existing target URI handling, and a request with no completion actions completes with the ordinary response shape and empty hooks list. These tests also exercise service construction against the singleton registration, so a mock-only DI test would add little. The hook registry already owns plugin discovery; using its available-hook list avoids hardcoding the built-in names in request validation.

There are no added unit tests to remove or rewrite, and no assertions were weakened. A test of every dictionary-loop iteration would mirror the implementation without adding a distinct behavioral contract. No browser/E2E test is needed: this is an API validation and backend service-wiring change with no UI modification. Existing hook tests are being run by the implementation agent; final runtime outcomes belong in the handoff. Reviewer did not modify code or duplicate running suites.

Final validation reported by the implementation agent: new unknown-action API regression passed (1); existing registered-export and no-hook API controls passed (2); full existing hook tests passed. No review action remains.
