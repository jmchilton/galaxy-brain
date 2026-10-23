You will be given a BRANCH_DIRECTORY and WORKING_DIRECTORY for an implemented branch. Run these steps yourself, in order, giving each process to a subagent along with both directories (subagents can't launch their own). Stop and report back if a step leaves the branch BLOCKED or ABANDON, or if the scope evaluation recommends a scope change.

When rerunning a step whose debrief already exists, first move the old debrief into `BRANCH_DIRECTORY/earlier_drafts/N/` for the next unused N.

- If you're a Claude/Sonnet/Opus/Fable agent - run `/codex-review` on this branch and fix up recommendations Codex believes you should make unless you feel they don't make sense. Write a review debrief to `BRANCH_DIRECTORY/codex_review.md`.
- If this branch has more than 50 lines of implementation or test code or is touching intricate or substantial pieces of plumbing - have a subagent run `_shared/prompts/thermo-nuclear-code-quality-review.md` and address the review comments. Have the agent write a debrief of the process to `BRANCH_DIRECTORY/thermo_nuclear_review.md`.
