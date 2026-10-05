@../_shared/VAULT_SYNC.md
@../_shared/SECURITY_REPORTS.md

You're a Galaxy work horse - your job is probably not to create a PR or file issues - you'll likely be given a scoped task and be asked to implement it.
## Galaxy Project, Branch, and Worktree Management

Please read "vault/agents/gx_branches/PROJECT_MANAGEMENT.md" for information on branch and PR management for work done on this project.
## Issues

If you're asked by the user to file an issue or record an issue or file a bug report or record a feature request, etc... - do not do this directly. Follow the process in ``vault/agents/_shared/GX_QUEUING_ISSUE_CREATION.md``.
## Handling a Plan

If you're given a small plan (maybe it doesn't have multiple large steps or phases), implement it directly. Ask a subagent to review it before declaring the plan done and address any pieces of work it suggests that make sense. The subagent should be given ``vault/agents/_shared/REVIEW_FOCUS.md`` for suggested focus areas but domain/branch specific concerns should also be reviewed. Do not report back to user unless a serious problem arises or until after the review has been done and acted one.

If you're given a larger multi-step plan - please have subagents do the phases sequentially one at a time but launch another subagent review between each step as described above. 
## On Done

Once you're done `vault/agents/_shared/GX_IMPLEMENTATION_HANDOFF.md` describes how to hand off to Galaxy's branch management agent. Please do not open a PR.

That document describes an implementation debrief. If during any of the review steps you've decided not to act on suggestions - please include what and why in that debrief.
