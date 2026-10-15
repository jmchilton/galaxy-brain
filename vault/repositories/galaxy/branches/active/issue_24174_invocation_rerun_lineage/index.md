# Invocation rerun lineage (#24174)

- Issue: https://github.com/galaxyproject/galaxy/issues/24174
- Branch: `issue_24174_invocation_rerun_lineage`
- Working directory: `/Users/jxc755/projects/worktrees/galaxy/branch/issue_24174_invocation_rerun_lineage`
- Status: implementing
- [Plan](plan.md)

Use an indexed nullable self foreign key on workflow invocations, with source access validation, explicit import dropping, source and successor links in the invocation UI, and rerun propagation through both forms. No edited-step marker or full lineage grouping in this change.

- [Initial implementation](initial_implementation_debrief.md)
- [Backend phase review](subagents/backend_review.md)
- [Backend implementation and tests](subagents/backend_implementation.md)
- [Client phase review](subagents/client_review.md)
- [Testing environment](testing_environment.md)
