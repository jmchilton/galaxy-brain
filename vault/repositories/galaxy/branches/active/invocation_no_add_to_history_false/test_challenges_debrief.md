# Test challenges

Retain the API regression unchanged. Reviewed _shared/GX_PROCESS_CHALLENGE_TESTS.md, _shared/REVIEW_FOCUS.md, and Galaxy doc/source/dev/writing_tests.md.

No new unit tests or mocks require removal or replacement. This test checks observable behavior through workflow creation, invocation, and history contents. False demonstrates the bug; omission and true protect established behavior. Distinct histories exercise copying. The input-only workflow avoids tool-execution dependencies.

A browser test is unnecessary for this JSON invocation flag: there is no UI change. Additional collection/library input matrices and explicit null coverage are optional, not prerequisites for the narrow boolean fix.

No edits made. Parent coordinator owns actual red/green API execution; no duplicate server was launched here. Its outcome must be recorded before handoff.
