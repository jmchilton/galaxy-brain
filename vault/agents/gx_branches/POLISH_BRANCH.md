# Polishing a branch

Polishing takes a branch from `branches_implemented` or `branches_implemented_needs_ci` to `branches_ready_for_final_review`. When you start, move its entry to `branches_need_polish`. When you finish, move it to `branches_ready_for_final_review`. The result is a branch that passes its checklist, plus a persuasive PR description that waits for John's final review. It builds on [`GX_PR_DESCRIPTIONS.md`](../_shared/GX_PR_DESCRIPTIONS.md). Never open the PR from polishing, and never post anything to GitHub.

BRANCH_DIRECTORY is `vault/repositories/galaxy/branches/active/<branch_name>/`, following [`REPOSITORY_BRANCHES.md`](../_shared/REPOSITORY_BRANCHES.md). Read its `index.md` and supporting notes before starting; update its workflow status alongside the queue without moving the directory.
## 1. Check CI

Check CI for issues with this branch before continuing with the polish. If some checks are still running that is fine - but check the current failures for evidence they are related to this branch. Fix the branch before continuing.
## 2. Pick the checklist

Always use [`GENERAL.md`](../_shared/gx_pr_checklists/GENERAL.md). Add [`WORKFLOW_RELATED.md`](../_shared/gx_pr_checklists/WORKFLOW_RELATED.md) if the branch touches workflows, using the scope in `GX_PR_DESCRIPTIONS.md`.

## 3. Evaluate the checklist with a subagent

- Give a fresh subagent the branch's diff against its base, the checklist and the branch's notes. Ask it to answer every item with evidence from the diff.
- The subagent never answers the human-read item. It stays unchecked for John.
- If an item fails, fix the branch, or stop and ask user when the fix is a judgement call. Don't write a description for a branch that fails its checklist.

## 4. Write the PR description

- Write it to `BRANCH_DIRECTORY/pr_description.md`, following `GX_PR_DESCRIPTIONS.md`.
## 5. Strengthen it with a subagent

- Give a fresh subagent the description and the branch. Ask whether more development would make the pitch more convincing and/or allow not hedging. 
- Also ask it to name the likely misreadings of the PR (audience, scope) and check that each is answered by a highlighted sentence, per "Predict possible misunderstandings" in `GX_PR_DESCRIPTIONS.md`.
- It returns either a short task list or "nothing to add". Tasks must stay within the branch's motivation. Anything that widens the scope goes to user as a question.
## 6. Apply the tasks

- Make each change on the branch.
- Commit, push to the `jmchilton` fork, and update the description so it claims only what the branch now proves.
- Re-run the checklist subagent if the changes touched any item it answered.
- Do one strengthening round only. Report anything left over instead of looping.

## 7. PR Titles

Place 3-5 title options as a simple markdown list in `BRANCH_DIRECTORY/pr_titles.md`. For a release-branch target, prefix every title with Galaxy's version tag (`[26.0]` for `release_26.0`).

## 8. Hand off

Move the entry from `branches_need_polish` to `branches_ready_for_final_review`, linking the branch's `index.md`, per [`MY_BRANCHES_INDEX.md`](../_shared/MY_BRANCHES_INDEX.md). Write a debrief of the polishing process to `BRANCH_DIRECTORY/polish_debrief.md` and link it, the description, and titles from `index.md`.
