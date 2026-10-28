# Polishing a branch

Polishing takes a branch from `branches_implemented` or `branches_implemented_needs_ci` to `branches_ready_for_final_review`. When you start, move its entry to `branches_need_polish`. When you finish, move it to `branches_ready_for_final_review`. The result is a branch that passes its checklist, plus a persuasive PR description that waits for John's final review. It builds on [`GENERIC_PR_DESCRIPTIONS.md`](../_shared/GENERIC_PR_DESCRIPTIONS.md).

BRANCH_DIRECTORY is `vault/repositories/PROJECT/branches/active/<branch_name>/`, following [`REPOSITORY_BRANCHES.md`](../_shared/REPOSITORY_BRANCHES.md). Read its `index.md` and supporting notes before starting; update its workflow status alongside the queue without moving the directory.

## 1. Write the PR description

- Write it to `BRANCH_DIRECTORY/pr_description.md`, following `GENERIC_PR_DESCRIPTIONS.md`.

## 2. Strengthen it with a subagent

- Give a fresh subagent the description and the branch. Ask whether more development would make the pitch more convincing and/or allow not hedging.
- Also ask it to name the likely misreadings of the PR (audience, scope) and check that each is answered by a highlighted sentence, per "Predict possible misunderstandings" in `GENERIC_PR_DESCRIPTIONS.md`.
- It returns either a short task list or "nothing to add". Tasks must stay within the branch's motivation. Anything that widens the scope goes to John as a question.

## 3. Apply the tasks

- Make each change on the branch.
- Commit, push to the `jmchilton` fork, and update the description so it claims only what the branch now proves.
- Do one strengthening round only. Report anything left over instead of looping.

## 4. PR Titles

Place 3-5 title options as a simple markdown list in `BRANCH_DIRECTORY/pr_titles.md`. For a release-branch target, prefix every title with Galaxy's version tag (`[26.0]` for `release_26.0`).

## 5. PR Tags

Recommend labels in `BRANCH_DIRECTORY/pr_tags.md`.

## 6. Hand off

Move the entry from `branches_need_polish` to `branches_ready_for_final_review`, linking the branch's `index.md`, per [`MY_BRANCHES_INDEX.md`](../_shared/MY_BRANCHES_INDEX.md). Write a debrief of the polishing process to `BRANCH_DIRECTORY/polish_debrief.md` and link it, the description, titles, and tags from `index.md`.
