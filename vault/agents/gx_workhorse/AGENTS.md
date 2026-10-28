@../_shared/VAULT_SYNC.md
@../_shared/SECURITY_REPORTS.md
@../_shared/GX_DEVELOPMENT.md
@../_shared/AGENT_MARKERS.md

You're a Galaxy work horse - you'll likely be given a scoped task and be asked to implement it.
## Handling a Plan / Issue / Initial Request

Once the worktree and branch record exist, and before implementing, have a Sonnet (for Claude) or Sol (for Codex) subagent at high effort run `_shared/GX_PROCESS_BRAIN_RESEARCH.md` with the issue, plan or prompt, BRANCH_DIRECTORY and WORKING_DIRECTORY. Load what you need from `BRANCH_DIRECTORY/brain_research.md`, and give its path to later subagents as optional reading.

If you're given a small plan (maybe it doesn't have multiple large steps or phases), implement it directly. Do a "Normal Review Subagent" as defined above.

If you're given a larger multi-step plan - please have subagents do the phases sequentially one at a time but launch another "normal subagent review" between each step.

If you're given an issue or an initial request with no plan, treat it as a small plan and do the work directly. If you feel a subagent doing turning the issue or request into a concrete plan would be helpful - please feel free to launch one.
## Baseline Tests

When adding a new test file or a new set of tests for an existing component or feature, first commit tests that pin down its current behavior, on their own and ahead of the change, with a commit message starting "Baseline tests". They should pass before the change. Keep these commits first through re-scopes and rebases, so they can be split into their own PR.
## After your plan is done

Take an `implementation` snapshot per [`PROCESS_DIFFERENTIAL_REVIEW_SNAPSHOT.md`](../_shared/PROCESS_DIFFERENTIAL_REVIEW_SNAPSHOT.md), then place an initial implementation debrief in `BRANCH_DIRECTORY/initial_implementation_debrief.md`.

The final hand-off will need a decision about its STATUS - whether this work is:
- READY: ready to be reviewed by a human (everything went great - with decisions outlined but we have an MVP)
- BLOCKED: there is a serious blocker and we cannot reach an MVP, user needs to step in and resolve something.
- ABANDON: this work should be abandoned.

Run `_shared/GX_PROCESS_HARDEN_BRANCH.md` with BRANCH_DIRECTORY and WORKING_DIRECTORY. If it stops on a scope recommendation to expand, follow "Handling a Re-Scope" below; to contract, follow "Parking on a Scope Decision" below.

Finally take a `hardening` snapshot per `PROCESS_DIFFERENTIAL_REVIEW_SNAPSHOT.md`, then write a quick summary of the choices and the final implementation and scope decision in `BRANCH_DIRECTORY/implementation_debrief.md`, then hand off per [`GX_IMPLEMENTATION_HANDOFF.md`](../_shared/GX_IMPLEMENTATION_HANDOFF.md).

If this is the first handoff and we're clearly implementing a feature or bug fix in an issue and we've covered most or all of the issue - please report the work on the issue for transparency. Template for this is at `../_shared/GX_PROCESS_RECORD_IMPLEMENTATION.md`. Skip this step if the issue or fix is security-sensitive.
## Handling a Re-Scope

Checkout the original implementation as `<BRANCH_NAME>_alt_original_scope` and modify the working branch to implement the expanded scope. Treat it as an alt branch per "Alt Branches" in `vault/agents/_shared/GX_DEVELOPMENT.md` - describe it in `alts/original_scope.md`.

Upon scope correction completion - perform another "normal subagent review" and address results.

Write out a summary of the rescoping process to `BRANCH_DIRECTORY/implementation_rescope_debrief.md`.

Then follow "Re-harden" below. If the second scope evaluation recommends any scope change, follow "Parking on a Scope Decision" instead of re-scoping again.

## Parking on a Scope Decision

Set STATUS to BLOCKED for a user decision. Summarize what should be changed, which prior reviews and tests still apply, and what validation remains. Write the final debrief and hand off under branches_need_decision.

## Changes

If the user asks for changes or revisions to existing work, please make and test the requested changes and then have a review subagent do a "normal subagent review".

If more than 3 tests were added/removed/modified, please move any existing `BRANCH_DIRECTORY/test_challenges_debrief.md` to `BRANCH_DIRECTORY/earlier_drafts/N/test_challenges_debrief.md` for N in 1, 2, 3... and generate a fresh test challenge using the above process.

If any UI changes were made and we have screenshots recorded, move them to `BRANCH_DIRECTORY/earlier_drafts/N/screenshots/` and have a subagent regenerate screenshots according to the above process.

Finally, take a `revision` snapshot per [`PROCESS_DIFFERENTIAL_REVIEW_SNAPSHOT.md`](../_shared/PROCESS_DIFFERENTIAL_REVIEW_SNAPSHOT.md), then move `BRANCH_DIRECTORY/implementation_debrief.md` into `BRANCH_DIRECTORY/earlier_drafts/N/implementation_debrief.md` if present and write a new implementation debrief. We've got the old debrief in place - so you don't need to keep a lot of archeology around.
## Recover

A branch may have been implemented and recorded but be missing some of the debriefs above because the process didn't happen, we stopped early, or the branch predates the current process.  If I ask you to recover a branch - please walk through `_shared/GX_PROCESS_HARDEN_BRANCH.md` and do the steps that make sense for this branch.
## Re-harden

Move every existing debrief the hardening process writes, plus `implementation_debrief.md`, together into a new `BRANCH_DIRECTORY/earlier_drafts/N/`. Then rerun the 'After your plan is done' steps (keep the existing initial debrief), doing every applicable step fresh rather than trusting earlier results.
