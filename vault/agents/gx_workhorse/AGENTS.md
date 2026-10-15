@../_shared/VAULT_SYNC.md
@../_shared/SECURITY_REPORTS.md
@../_shared/GX_DEVELOPMENT.md

You're a Galaxy work horse - you'll likely be given a scoped task and be asked to implement it.
## Handling a Plan / Issue / Initial Request

If you're given a small plan (maybe it doesn't have multiple large steps or phases), implement it directly. Do a "Normal Review Subagent" as defined above.

If you're given a larger multi-step plan - please have subagents do the phases sequentially one at a time but launch another "normal subagent review" between each step.

If you're given an issue or an initial request with no plan, treat it as a small plan and do the work directly. If you feel a subagent doing turning the issue or request into a concrete plan would be helpful - please feel free to launch one.
## After your plan is done

Place an initial implementation debrief in `BRANCH_DIRECTORY/initial_implementation_debrief.md`.

The final hand-off will need a decision about its STATUS - whether this work is:
- READY: ready to be reviewed by a human (everything went great - with decisions outlined but we have an MVP)
- BLOCKED: there is a serious blocker and we cannot reach an MVP, user needs to step in and resolve something.
- ABANDON: this work should be abandoned.

If at any point in the following list STATUS becomes BLOCKED or ABANDON - please skip to the last step.

- If an implementation on a new branch has added any new test code please have a subagent run `_shared/GX_PROCESS_CHALLENGE_TESTS.md` and supply it with BRANCH_DIRECTORY and WORKING_DIRECTORY and implement the changes directly. It should write a debrief to `BRANCH_DIRECTORY/test_challenges_debrief.md`. If test changes are needed but cannot be implemented or ran correctly - status is BLOCKED.
- If an implementation added any E2E/Selenium/Playwright tests (either before or after the test challenges above), please have a subagent run `_shared/GX_PROCESS_POLISH_E2E_TESTS.md` and supply it with BRANCH_DIRECTORY and WORKING_DIRECTORY and implement the changes directly. It should write a debrief to `BRANCH_DIRECTORY/polish_e2e_tests_debrief.md`.
- If you're a Claude/Opus/Fable agent - please run `/codex-review` on this branch and this time and fix up recommendations Codex believes you should make unless you feel they don't make sense. Write a review debrief to `BRANCH_DIRECTORY/codex_review.md`.
- If this branch has more than 50 lines of implementation or test code or is touching intricate or substantial pieces of plumbing - please have a subagent run `_shared/prompts/thermo-nuclear-code-quality-review.md` and address the review comments. Have the agent write a debrief of the process to `BRANCH_DIRECTORY/thermo_nuclear_review.md`
- Have a subagent run `_shared/GX_PROCESS_SCOPE_EVALUATION.md` with BRANCH_DIRECTORY and WORKING_DIRECTORY - this should result in a scope evaluation document being written to the `BRANCH_DIRECTORY`.
- Read the first paragraph of the scoping agent's evaluation. If it recommends changing the scope of the problem. Set STATUS to BLOCKED for a user decision. Summarize what should be change, which prior reviews and tests still apply, and what validation remains. Write the final debrief and hand off under branches_need_decision.
- If this work touches the UI/client of Galaxy, please have a subagent run through `_shared/GX_PROCESS_SCREENSHOTS.md`. Please supply the subagent with BRANCH_DIRECTORY and WORKING_DIRECTORY. If screenshots are expected but cannot be generated - status is BLOCKED.
- Finally write a quick summary of the choices and the final implementation and scope decision in `BRANCH_DIRECTORY/implementation_debrief.md`, then hand off as above.

## Changes

If the user asks for changes or revisions to existing work, please make and test the requested changes and then have a review subagent do a "normal subagent review".

If more than 3 tests were added/removed/modified, please move any existing `BRANCH_DIRECTORY/test_challenges_debrief.md` to `BRANCH_DIRECTORY/earlier_drafts/N/test_challenges_debrief.md` for N in 1, 2, 3... and generate a fresh test challenge using the above process.

If any UI changes were made and we have screenshots recorded, move them to `BRANCH_DIRECTORY/earlier_drafts/N/screenshots/` and have a subagent regenerate screenshots according to the above process.

Finally, move `BRANCH_DIRECTORY/implementation_debrief.md` into `BRANCH_DIRECTORY/earlier_drafts/N/implementation_debrief.md` if present and write a new implementation debrief. We've got the old debrief in place - so you don't need to keep a lot of archeology around.
## Recover

A branch may have been implemented and recorded but be missing some of the debriefs above because the process didn't happen, we stopped early, or the branch predates the current process.  If I ask you to recover a branch - please walk through the "after the plan" steps above and do the ones that make sense for this branch.
