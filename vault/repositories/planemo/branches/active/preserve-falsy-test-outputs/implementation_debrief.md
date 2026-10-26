# Implementation debrief

Planemo's RunResponse.structured_data used truthiness to test whether a requested output existed. False, 0, 0.0, empty strings and empty arrays were reported as missing even when directly comparing them with the expected values would pass. This is Planemo report construction, not upstream Galaxy behavior, and is independent of the collection expression.json fix in #1760.

The fix uses `output_value is None`, matching the existing get_output convention. Absent outputs and None still fail with the same missing-output diagnostic. Null assertions remain outside this change. The existing value comparator and file/collection checkers are unchanged.

Added regression coverage in the existing test checker suite: matching falsy values and truthy controls, incorrect expectations with exact mismatch diagnostics, and absent/None output controls. Reused MockRunResponse and the real TestCase/structured report path. The test module initializes Galaxy configuration as normal startup does to avoid its existing import cycle when running this test file in isolation.

Red-to-green: with base implementation and regression tests, 10 failed and 8 passed. Failures were the five valid falsy matches and the five wrong missing-output diagnostics. With the fix, all 29 tests across test_test_checker.py, test_collect_outputs.py and test_output_schema.py pass. make lint passes. No live Galaxy workflow was run.

The implementation is one changed condition plus 45 added test/import lines. The >50-line hardening threshold is not met; this is not intricate plumbing. Normal review and polish are recorded separately.
