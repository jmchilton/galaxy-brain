You will be given a BRANCH_DIRECTORY with relevant implementation details and WORKING_DIRECTORY with the Galaxy changes.

This branch should contain new or modified E2E tests. If it doesn't stop processing. Write the debrief note described below with on a top-line of "No E2E tests found to be polished."

If E2E/Selenium tests are found please read "vault/research/Component - E2E Tests - Writing.md" and "vault/research/Component - E2E Tests Smart Components.md" for context.

- Please replace CSS/DOM selectors with navigation.yml abstractions.
- Please create shared abstractions if they are used more than once.
- Replace sleeps with waits throughout - if a sleep must remain it should have a comment. If you need to create new navigation.yml targets for the waiting - that is fine. 
- If this is the only test or set of tests over a component - make sure they are capturing screenshots.

Prepare a debrief with a one sentence top-line summarizing the work that was done.

Write a debrief to the branch directory in `polish_e2e_tests_debrief.md`.
