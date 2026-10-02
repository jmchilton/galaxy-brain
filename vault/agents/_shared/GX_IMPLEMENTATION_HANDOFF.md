If you're an agent building a Galaxy feature, fixing a bug, doing a refactoring, etc... - John does not want you to write a PR description, open a PR, etc...

When the unit of work is "done" - John wants a branch on their remote with work reviewed and a single line in vault/agents/gx_branches/MY_BRANCHES.md describing the branch under either the branches_implemented section if things are mostly in a shippable state section or the ``branches_need_decision`` if things need more work of the development unveiled significant design issues, preconditions, etc... Even if the goal is to abandon the work - please register this in ``branches_need_decision`` with a suggested action of abandoning the work. The branch management agent will go through the de-brief process on that - you as the implementer should not.

Place an implementation debrief in vault/agents/gx_branches/<branch_name>/implementation_debrief.md
