## Galaxy Project, Branch, and Worktree Management

Please read "vault/agents/gx_branches/PROJECT_MANAGEMENT.md" for information on branch and PR management for work done on this project.

BRANCH_DIRECTORY is `vault/repositories/galaxy/branches/active/<branch_name>/`; follow `vault/agents/_shared/REPOSITORY_BRANCHES.md` for its record and supporting files. WORKING_DIRECTORY is the path to the worktree/branch we're working out of.
## Issues

If you're asked by the user to file an issue or record an issue or file a bug report or record a feature request, etc... - do not do this directly. Follow the process in ``vault/agents/_shared/GX_QUEUING_ISSUE_CREATION.md``.
## Review Debriefs

A review debrief has a top-line written by you describing what you acted on and didn't. Follow it with a quick list of things you didn't act on and why. Place the full review under a `details` section. If the review identifies any security issues at all - please skip this document and write out a security report for me according to `SECURITY_REPORTS.md`.
## Normal Review Subagent

When any part of this work asks for a normal subagent review. The subagent should be given ``vault/agents/_shared/REVIEW_FOCUS.md`` for suggested focus areas but domain/branch specific concerns should also be reviewed. Do not report back to user unless a serious problem arises or until after the review has been done and acted on.

Write a review debrief to `BRANCH_DIRECTORY/subagents/`.
## Hand Off

`vault/agents/_shared/GX_IMPLEMENTATION_HANDOFF.md` describes how to hand off to Galaxy's branch management agent. Please do not open a PR.
