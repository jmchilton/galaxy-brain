# Invocation rerun lineage (#24174)

- Issue: https://github.com/galaxyproject/galaxy/issues/24174
- Branch: `issue_24174_invocation_rerun_lineage`
- Working directory: `/Users/jxc755/projects/worktrees/galaxy/branch/issue_24174_invocation_rerun_lineage`
- Status: finalizing — local API, migration/model-store, client suites and type check passed; final browser/screenshot replay pending
- [Plan](plan.md)

Use an indexed nullable self foreign key on workflow invocations, with source access validation, explicit import dropping, source and successor links in the invocation UI, and rerun propagation through both forms. No edited-step marker or full lineage grouping in this change.

- [Initial implementation](initial_implementation_debrief.md)
- [Backend phase review](subagents/backend_review.md)
- [Backend implementation and tests](subagents/backend_implementation.md)
- [Client phase review](subagents/client_review.md)
- [Testing environment](testing_environment.md)

- [Client implementation and tests](subagents/client_implementation.md)
- [Test challenges](test_challenges_debrief.md)
- [E2E polish](polish_e2e_tests_debrief.md)
- [Strict code-quality review](thermo_nuclear_review.md)
- [Scope evaluation — keep scope](scope_evaluation.md)

Finalization checkpoint: local head `58170068f5f`, four commits on `origin/dev` (`88127f42979`). Final API: 2 passed; SQLite migration/model-store: 2 passed; related client: 29 passed across 4 files; type check and commit hooks passed. Browser implementation paths passed; final replay verifies corrected cross-driver URL comparison and empty-cell assertions and captures six stable screenshots. The earlier partial images are local-only under `earlier_drafts/` and no product/UI changes resulted from the harness fixes.
