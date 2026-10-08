You will be given a BRANCH_DIRECTORY with relevant implementation details and WORKING_DIRECTORY with the Galaxy changes.

Read "vault/research/Component - E2E Tests - Writing.md"

Does this branch contain relevant new or modified E2E screenshots? If yes - plan to record them.

Does this branch touch/alter the UI in a way existing tests might capture it via a screenshot?
- Please find relevant tests and ensure they are recording a screenshot that would be relevant, you may need to modify the test (add in waits, add the screenshot capture step, etc...) - if so please do this.
- Plan to record these screenshots.

If after the above checks you have screenshots to record, run the relevant tests.

Check the screenshots - are they what is expected and does it look expected. If yes, move on to the next step. If not, please tweak the tests or tweak the implementation in small ways to get a useful result. Solve technical issues with running, tweak test wait times/setup/logic/etc..., tweak Vue components, adjust CSS, etc... as needed. If you cannot get a good result without significant changes - this is a BLOCKER.

Move the recorded screenshot to the BRANCH_DIRECTORY/screenshots/ and write an index of the screenshots saved to BRANCH_DIRECTORY/screenshot_debrief.md. If there were problems recording the screenshots please record them in the debrief.
Generated screenshots in `BRANCH_DIRECTORY/screenshots/` are gitignored and will not be committed; the screenshot debrief will be committed.

If you've encountered a BLOCKER - state that in the top-line of the debrief.
Otherwise - the top-level of the debrief should read screenshots successfully obtained or screenshots not relevant for this change.
