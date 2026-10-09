@../_shared/VAULT_SYNC.md
@../_shared/SECURITY_REPORTS.md

You're a Galaxy work horse - your job is probably not to create a PR or file issues - you'll likely be given a scoped task and be asked to implement it.
## Galaxy Project, Branch, and Worktree Management

Please read "vault/agents/gx_branches/PROJECT_MANAGEMENT.md" for information on branch and PR management for work done on this project.
## Issues

If you're asked by the user to file an issue or record an issue or file a bug report or record a feature request, etc... - do not do this directly. Follow the process in ``vault/agents/_shared/GX_QUEUING_ISSUE_CREATION.md``.
## Normal Review Subagent

When any part of this work asks for a normal subagent review. The subagent should be given ``vault/agents/_shared/REVIEW_FOCUS.md`` for suggested focus areas but domain/branch specific concerns should also be reviewed. Do not report back to user unless a serious problem arises or until after the review has been done and acted one.

Create a debrief in the `BRANCH_DIRECTORY/subagents` that has a top-line written by you describing what you acted and on and didn't. Have a quick list of things you didn't act on and just describe them and why. Place the full review under a `details` section. If the subagent identifies any security issues at all - please skip this document and write out a security report for me according to `SECURITY_REPORTS.md`.
## Handling a Plan / Issue / Initial Request

If you're given a small plan (maybe it doesn't have multiple large steps or phases), implement it directly. Do a "Normal Review Subagent" as defined above.

If you're given a larger multi-step plan - please have subagents do the phases sequentially one at a time but launch another "normal subagent review" between each step.

If you're given an issue or an initial request with no plan, treat it as a small plan and do the work directly. If you feel a subagent doing turning the issue or request into a concrete plan would be helpful - please feel free to launch one.
## After your plan is done

Place an initial implementation debrief in `BRANCH_DIRECTORY/initial_implementation_debrief.md`.

The branch directory is at: `vault/agents/gx_branches/branches/<branch_name>/` called BRANCH_DIRECTORY below. WORKING_DIRECTORY is the path to the worktree/branch we're working out of.

The final hand-off will need a decision about its STATUS - whether this work is:
- READY: ready to be reviewed by a human (everything went great - with decisions outlined but we have an MVP)
- BLOCKED: there is a serious blocker and we cannot reach an MVP, user needs to step in and resolve something.
- ABANDON: this work should be abandoned.

If at any point in the following list STATUS becomes BLOCKED or ABANDON - please skip to the last step.

- If an implementation on a new branch has added any new test code please have a subagent run `_shared/GX_PROCESS_CHALLENGE_TESTS.md` and supply it with BRANCH_DIRECTORY and WORKING_DIRECTORY and implement the changes directly. It should write a debrief to `BRANCH_DIRECTORY/test_challenges_debrief.md`. If test changes are needed but cannot be implemented or ran correctly - status is BLOCKED.
- If you're a Claude/Opus/Fable agent - please run `/codex_review` on this branch and this time and fix up recommendations Codex believes you should make unless you feel they don't make sense. Create a `codex_review.md` in `BRANCH_DIRECTORY` that has a top-line written by you describing what you acted and on and didn't. Have a quick list of things you didn't act on and just describe them and why. Place the full review under a `details` section. If Codex identifies any security issues at all - please skip this document and write out a security report for me according to `SECURITY_REPORTS.md`.
- Have a subagent run `_shared/GX_PROCESS_SCOPE_EVALUATION.md` with BRANCH_DIRECTORY and WORKING_DIRECTORY - this should result in a scope evaluation document being written to the `BRANCH_DIRECTORY`.
- Read the first paragraph of the scoping agent's evaluation. If it recommends changing the scope of the problem. Set STATUS to BLOCKED for a user decision. Summarize what should be change, which prior reviews and tests still apply, and what validation remains. Write the final debrief and hand off under branches_need_decision.
- If this work touches the UI/client of Galaxy, please have a subagent run through `_shared/GX_PROCESS_SCREENSHOTS.md`. Please supply the subagent with BRANCH_DIRECTORY and WORKING_DIRECTORY. If screenshosts are expected but cannot be generated - status is BLOCKED.
- Finally write a quick summary of the choices and the final implementation and scope decision in `BRANCH_DIRECTORY/implementation_debrief.md`. Once you're done `vault/agents/_shared/GX_IMPLEMENTATION_HANDOFF.md` describes how to hand off to Galaxy's branch management agent. Please do not open a PR.

## Changes

If the user asks for changes or revisions to existing work, please make and test the requested changes and then have a review subagent do a "normal subagent review".

If more than 3 tests were added/removed/modified, please move any existing `BRANCH_DIRECTORY/test_challenges_debrief.md` to `BRANCH_DIRECTORY/earlier_drafts/N/test_challenges_debrief.md` for N in 1, 2, 3... and generate a fresh test challenge using the above process.

If any UI changes were made and we have screenshots recorded, move them to `BRANCH_DIRECTORY/earlier_drafts/N/screenshots/` and have a subagent regenerate screenshots according to the above process.

Finally, move `BRANCH_DIRECTORY/implementation_debrief.md` into `BRANCH_DIRECTORY/earlier_drafts/N/implementation_debrief.md` if present and write a new implementation debrief. We've got the old debrief in place - so you don't need to keep a lot of archeology around.

## Recover

A branch may have been implemented and recorded but be missing some of the debriefs above because the process didn't happen, we stopped early, or the branch predates the current process.  If I ask you to recover a branch - please walk through the "after the plan" steps above and do the ones that make sense for this branch.