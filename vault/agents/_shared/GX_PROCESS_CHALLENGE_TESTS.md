You will be given a BRANCH_DIRECTORY with relevant implementation details and WORKING_DIRECTORY with the Galaxy changes.

Review doc/source/dev/writing_tests.md in galaxy.

Challenge each unit test in this branch:
- Is just testing the implementation directly - if so drop.
- Is it silly for any reason? If so, please drop.
- Are the unit tests only testing something that is also tested by an API/Integration/Selenium test? If so, drop.
- Are the unit tests something that could easily be tested by an API/Integration/Selenium test? If so, please rewrite it at that layer.
- Can any mocks be replaced with noop impls, reusable test utility mock classes? If so, please rewrite the unit test.
- Can any mocks or SimpleNamespace kind of constructs be replaced with simple dataclasses to make the code read better (even if a bit longer)? If so please, rewrite the unit test.
- Can any of the mocks be replaced if the code is restructured? If yes, please restructure and clean up the test. Examples below are not exhaustive:
	- Often class methods can be rewritten to use helper functions that don't relay on the class and that can really improve unit testing.

Challenge a lack of E2E/Selenium tests! Should this feature have an E2E test - if so please implement. Read "vault/research/Component - E2E Tests - Writing.md" and "vault/research/Component - E2E Tests Smart Components.md" before writing Selenium tests.

Write a debrief about the test challenges to `BRANCH_DIRECTORY/test_challenges_debrief.md` before completing.
