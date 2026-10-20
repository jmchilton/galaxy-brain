You will be given a BRANCH_DIRECTORY with relevant implementation details and WORKING_DIRECTORY with the Galaxy changes or a REVIEW_DIRECTORY and a WORKING_DIRECTORY containing the pull request branch.

With a BRANCH_DIRECTORY, act: make each change below in place, then write the debrief. With a REVIEW_DIRECTORY, don't edit the PR: treat each drop, rewrite, refactor, or implement below as a recommendation in the debrief's test plan.

Review doc/source/dev/writing_tests.md in galaxy and make sure tests follow best practices.

Challenge each unit test in this branch:
- Is it just testing the implementation directly - if so drop.
- Is it silly for any reason? If so, please drop.
- Does it fake browser layout (mocked `useElementBounding`/`getBoundingClientRect`, stubbed `scrollIntoView`, hand-set sizes, asserted transforms or pixel styles)? jsdom has no layout, so it only proves a guard exists. Assert the visible result (centered, in view, scrolled to) in an E2E test and drop it.
- Are the unit tests only testing something that is also tested by an API/Integration/Selenium test? If so, drop.
- Are the unit tests something that could easily be tested by an API/Integration/Selenium test? If so, please rewrite it at that layer.
- Can any mocks be replaced with noop impls, reusable test utility mock classes? If so, please rewrite the unit test.
- Can any mocks or SimpleNamespace kind of constructs be replaced with simple dataclasses to make the code read better (even if a bit longer)? If so please, rewrite the unit test.
- Can any of the mocks be replaced if the code is restructured? If yes, restructure the code and clean up the test. Examples below are not exhaustive:
	- Often class methods can be rewritten to use helper functions that don't rely on the class and that can really improve unit testing.

A core reason to write unit tests is to improve the design of the system. If the tests would be improved by improving the implementation's design - please refactor the work toward that end.

If the test contains Vitest unit tests - please read best practices in client/README.md#client-side-unit-testing and try to make sure we're following best practices.

Challenge each API/Integration test around usage of helpers. Use existing helpers (e.g. populators) where they fit. If an HTTP method against a particular URL is used more than once, add a helper for it.

Challenge a lack of E2E/Selenium tests! Should this feature have an E2E test - if so please implement. Read "vault/research/Component - E2E Tests - Writing.md" and "vault/research/Component - E2E Tests Smart Components.md" before writing Selenium tests.

### Only relevant if given a Branch Directory

Tests added in a "Baseline tests" commit should pass without the branch's other changes. Every other new test should fail without them, at its own assertion and not because the API or fixture it calls doesn't exist yet. Fix or drop tests that don't. For E2E tests, reasoning about this is enough; don't run them to prove it.

### Finally

If given a BRANCH_DIRECTORY:
- Write a debrief about the test challenges to `BRANCH_DIRECTORY/test_challenges_debrief.md` before completing.

If given a REVIEW_DIRECTORY:
- Write a detailed review and test plan to `REVIEW_DIRECTORY/test_challenges_debrief.md` before completing.
