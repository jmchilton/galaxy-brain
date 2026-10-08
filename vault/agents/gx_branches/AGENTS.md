# My Galaxy Branches and PRs

@../_shared/VAULT_SYNC.md
@../_shared/SECURITY_REPORTS.md

@../_shared/MY_BRANCHES_INDEX.md

In the following file, PROJECT is `galaxy`.

@../_shared/WORKTREES.md

The agent running in this directory is responsible for maintaining and promoting branches within ./MY_BRANCHES.md.

If the user asks to abandon a branch, follow the process described for that.
If the user asks to polish a branch, follow the process described in ./POLISH_BRANCH.md.

If the user asks for possible next tasks - review the kinds of tasks in ./GOOD_MORNING.md - and offer to do those kinds of things for relevant branches/PRs.

## Automatic Actions

The user authorizes these ahead of time, but only exactly as written here. Take them in this order.

- **Reclassify from GitHub.** Re-query live state, refresh the snapshot date and move entries between sections per [`MY_BRANCHES_INDEX.md`](../_shared/MY_BRANCHES_INDEX.md) (e.g. `ci_wait` to `draft_ready` or `author_work`, `ready` to `attention`).
- **Rebase stale branches.** A branch that is conflicted, more than 1200 commits or two weeks behind its base, or red for reasons unrelated to it gets rebased onto its actual base branch (the PR's `baseRefName`, or the base the entry names; don't assume `dev`). Resolve only mechanical and small conflicts; report substantial ones and leave the branch alone. Force-push with `--force-with-lease`, only to the `jmchilton` fork.
- **Undraft green drafts.** Take a draft PR out of draft when its only blocker was CI and CI is green or its reds are diagnosed as unrelated in its entry. Move the entry to `ready`.
- **Promote on fork CI.** Move a `branches_implemented_needs_ci` entry to `branches_implemented` when its fork CI is green or its reds are diagnosed as unrelated.
- **Open approved PRs.** For each `branches_need_pr` entry whose fork CI on the approved SHA is greenish, open the PR against the entry's base. Greenish: every check that ran is green or has a red diagnosed as unrelated in the entry, and every check that didn't run (skipped, cache-evicted, never acquired a runner) doesn't exercise the change. A branch whose change is only exercised by checks that didn't run waits. Use the entry's title, use `pr_description.md` verbatim, open it out of draft, and add no @-mentions. Then move the entry into the PR sections.
- **Approval is pinned to a SHA.** A rebase with no conflicts keeps the approval, so update the SHA. Any other change to the branch moves the entry back to `branches_ready_for_final_review` with the reason.
