# Test challenges

Retain the parametrized API regression unchanged. Applied _shared/GX_PROCESS_CHALLENGE_TESTS.md and Galaxy doc/source/dev/writing_tests.md guidance.

There are no unit tests or mocks to replace. The test submits real workflow invocation requests and checks the public response, exercising request parsing, service validation, and registry lookup together. Omission and default preserve acceptance controls while the unknown-name case reproduces the defect. An input-only optional workflow avoids irrelevant tool dependencies.

No browser test is warranted for an API scheduler selector with no UI change. Custom scheduler configuration coverage would require a larger integration setup and is optional; the implementation reads the existing registry directly. Empty-string and explicit-null policy changes are outside this narrow extraction.

No test changes were made. Verified test_run_batch retains both original tool skip decorators. Coordinator owns the red/green execution; no duplicate API server/test run launched here.
