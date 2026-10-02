# Polishing a branch

Polishing takes a branch from `branches_implemented` to `branches_need_pr`. Polish only a branch that is pushed with greenish fork CI. When you start, move its entry to `branches_need_polish`. When you finish, move it to `branches_need_pr`. The result is a branch that passes its checklist, plus a persuasive PR description that waits for John's final review. It builds on [`GX_PR_DESCRIPTIONS.md`](../_shared/GX_PR_DESCRIPTIONS.md). Never open the PR, and never post anything to GitHub.

## 1. Pick the checklist

Always use [`GENERAL.md`](../_shared/gx_pr_checklists/GENERAL.md). Add [`WORKFLOW_RELATED.md`](../_shared/gx_pr_checklists/WORKFLOW_RELATED.md) if the branch touches workflows, using the scope in `GX_PR_DESCRIPTIONS.md`.

## 2. Evaluate the checklist with a subagent

- Give a fresh subagent the branch's diff against its base, the checklist and the branch's notes. Ask it to answer every item with evidence from the diff.
- The subagent never answers the human-read item. It stays unchecked for John.
- If an item fails, fix the branch, or stop and ask user when the fix is a judgement call. Don't write a description for a branch that fails its checklist.

## 3. Write the PR description

- Write it to `branches/<branch_name>/pr_description.md`, following `GX_PR_DESCRIPTIONS.md`.
## 4. Strengthen it with a subagent

- Give a fresh subagent the description and the branch. Ask whether more development would make the pitch more convincing and/or allow not hedging. 
- Also ask it to name the likely misreadings of the PR (audience, scope) and check that each is answered by a highlighted sentence, per "Predict possible misunderstandings" in `GX_PR_DESCRIPTIONS.md`.
- It returns either a short task list or "nothing to add". Tasks must stay within the branch's motivation. Anything that widens the scope goes to user as a question.
## 5. Apply the tasks

- Make each change on the branch.
- Commit, push to the `jmchilton` fork, and update the description so it claims only what the branch now proves.
- Re-run the checklist subagent if the changes touched any item it answered.
- Do one strengthening round only. Report anything left over instead of looping.

## 6. PR Titles

Place 3-5 title options as a simple markdown list in `branches/<branch_name>/pr_titles.md`. For a release-branch target, prefix every title with Galaxy's version tag (`[26.0]` for `release_26.0`).

## 7. Hand off

Move the entry from `branches_need_polish` to `branches_need_pr`, linking `branches/<branch_name>/pr_description.md` and `branches/<branch_name>/pr_titles.md`, per [`MY_BRANCHES_INDEX.md`](../_shared/MY_BRANCHES_INDEX.md). Write a debrief of the polishing process to branches/<branch_name>/polish_debrief.md.
