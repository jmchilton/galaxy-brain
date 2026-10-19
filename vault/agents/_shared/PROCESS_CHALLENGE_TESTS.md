You will be given a BRANCH_DIRECTORY with relevant implementation details and WORKING_DIRECTORY with the changes or a REVIEW_DIRECTORY and a WORKING_DIRECTORY containing the pull request branch.

With a BRANCH_DIRECTORY, act: make each change below in place, then write the debrief. With a REVIEW_DIRECTORY, don't edit the PR: treat each drop, rewrite, refactor, or implement below as a recommendation in the debrief's test plan.

Challenge each unit test in this branch:
- Is it just testing the implementation directly - if so drop.
- Is it silly for any reason? If so, please drop.
- Can any mocks be replaced with noop impls, reusable test utility mock classes? If so, please rewrite the unit test.
- Can any mocks or SimpleNamespace kind of constructs be replaced with simple dataclasses to make the code read better (even if a bit longer)? If so please, rewrite the unit test.
- Can any of the mocks be replaced if the code is restructured? If yes, restructure the code and clean up the test. Examples below are not exhaustive:
	- Often class methods can be rewritten to use helper functions that don't rely on the class and that can really improve unit testing.

A core reason to write unit tests is to improve the design of the system. If the tests would be improved by improving the implementation's design - please refactor the work toward that end.

### Finally

If given a BRANCH_DIRECTORY:
- Write a debrief about the test challenges to `BRANCH_DIRECTORY/test_challenges_debrief.md` before completing.

If given a REVIEW_DIRECTORY:
- Write a detailed review and test plan to `REVIEW_DIRECTORY/test_challenges_debrief.md` before completing.
