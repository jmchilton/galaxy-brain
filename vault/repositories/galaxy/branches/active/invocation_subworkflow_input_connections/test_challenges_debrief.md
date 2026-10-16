Fresh test challenge: retain the API coverage and the three runtime regression cases; no rewrites or deletions are warranted. No test or implementation changes were required.

Reviewed `doc/source/dev/writing_tests.md` and challenged the full branch test diff, including the scope expansion.

- The API negative helper centralizes repeated invocation submission/assertions and uses existing workflow/dataset populators and history-job helpers. Assertions cover observable status, error code/context and persistence effects rather than private helper structure.
- The parameterized runtime cases distinguish no connection (existing behavior control), a ready sibling (previous misleading output attribution), and a pending sibling (previous delay hiding a structural failure). The unchanged baseline produced 2 failures and 1 passing control; these cases are not vacuous copies of the implementation.
- These units cannot be replaced by ordinary API submission tests: the new early guard rejects the malformed graph before runtime. A server integration that inserts malformed persisted invocations could test the same fallback, but would still bypass normal submission and require scheduler/persistence harness code unrelated to this diagnostic. Real ORM graphs persisted by the established unit application directly exercise the canonical fallback with less scaffolding.
- Existing `MockApp`/`MockModuleInjector` test utilities are reused. The missing-input detector and connection resolver are real; no monkeypatch or bespoke namespace is introduced. The injected noop bookkeeping is not the behavior under test.
- Whole-object diagnostic assertions verify the failing subworkflow step and prevent fabricated output/dependency attribution. API and runtime cases cover distinct entry points.
- Positive optional, default, falsy default and connected API cases are retained. No existing assertions were weakened.
- Browser E2E adds no necessary coverage for a backend saved-graph validation/fallback change; no UI code changed.

Independent workflow-progress run: 12 passed, log `/private/tmp/subworkflow-rescope-review-units.log`. Reviewed implementation logs: baseline 2 failed/1 passed, complete workflow units 197 passed/1 skipped, API selection 10 passed. No new test execution is claimed beyond the independent 12-case module run.
