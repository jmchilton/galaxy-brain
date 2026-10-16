You will be given a BRANCH_DIRECTORY and WORKING_DIRECTORY for an implemented branch. Run these steps yourself, in order, giving each process to a subagent along with both directories (subagents can't launch their own). Stop and report back if a step leaves the branch BLOCKED or ABANDON, or if the scope evaluation recommends a scope change.

When rerunning a step whose debrief already exists, first move the old debrief into `BRANCH_DIRECTORY/earlier_drafts/N/` for the next unused N.

- If the branch added any new test code, have a subagent run `_shared/GX_PROCESS_CHALLENGE_TESTS.md` and implement the changes directly. It should write a debrief to `BRANCH_DIRECTORY/test_challenges_debrief.md`. If test changes are needed but cannot be implemented or ran correctly - status is BLOCKED.
- If the branch added any E2E/Selenium/Playwright tests (either before or after the test challenges above), have a subagent run `_shared/GX_PROCESS_POLISH_E2E_TESTS.md` and implement the changes directly. It should write a debrief to `BRANCH_DIRECTORY/polish_e2e_tests_debrief.md`.
- If you're a Claude/Opus/Fable agent - run `/codex-review` on this branch and fix up recommendations Codex believes you should make unless you feel they don't make sense. Write a review debrief to `BRANCH_DIRECTORY/codex_review.md`.
- If this branch has more than 50 lines of implementation or test code or is touching intricate or substantial pieces of plumbing - have a subagent run `_shared/prompts/thermo-nuclear-code-quality-review.md` and address the review comments. Have the agent write a debrief of the process to `BRANCH_DIRECTORY/thermo_nuclear_review.md`.
- Have a subagent run `_shared/GX_PROCESS_REFACTOR_BASELINE.md` - this should result in `BRANCH_DIRECTORY/baseline_refactor.md`.
- Have a subagent run `_shared/GX_PROCESS_SCOPE_EVALUATION.md` - this should result in `BRANCH_DIRECTORY/scope_evaluation.md`. Read its first paragraph; if it recommends expanding or contracting scope, stop and report that.
- If this work touches the UI/client of Galaxy, have a subagent run `_shared/GX_PROCESS_SCREENSHOTS.md`. If screenshots are expected but cannot be generated - status is BLOCKED.
