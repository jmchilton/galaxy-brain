Read @MY_BRANCHES.md and make sure it is up to date.

If any PRs are in draft and only waiting on CI, take them out of draft if the CI is green-ish.

If any of the branches are:
- conflicted
- behind origin/dev by more than 20 commits
- red for reasons not related to the PR

Then:
- Rebase onto the PR's actual base branch. Check the base with `gh pr view --json baseRefName`; don't assume dev.
- Resolve mechanical and small conflicts and to report any substantial ones.
- Force-push with --force-with-lease only to my fork.

If any branches exist in - branches_need_polish - polish these branches according ./POLISH_BRANCH.md.

If any branches exist in - branches_implemented, branches_need_decision, or branches_need_pr - report these decision points to the user.

