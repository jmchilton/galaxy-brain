# Invocation rerun lineage (#24174)

- Status: **READY — implemented, awaiting CI and human review**.
- Issue: https://github.com/galaxyproject/galaxy/issues/24174
- Branch: [`jmchilton/issue_24174_invocation_rerun_lineage`](https://github.com/jmchilton/galaxy/tree/issue_24174_invocation_rerun_lineage)
- Head: `fae0d714906`; base: `dev` at `88127f42979`.
- Working directory: `/Users/jxc755/projects/worktrees/galaxy/branch/issue_24174_invocation_rerun_lineage`

[Implementation and handoff](implementation_debrief.md) · [Plan](plan.md) · [Initial implementation](initial_implementation_debrief.md) · [Testing environment](testing_environment.md)

[Backend review](subagents/backend_review.md) · [Backend implementation](subagents/backend_implementation.md) · [Client review](subagents/client_review.md) · [Client implementation](subagents/client_implementation.md)

[Test challenges](test_challenges_debrief.md) · [E2E polish](polish_e2e_tests_debrief.md) · [Strict review](thermo_nuclear_review.md) · [Scope evaluation](scope_evaluation.md) · [Screenshot index](screenshot_debrief.md)

Uses an indexed nullable self foreign key, source access validation, access-filtered source/latest direct-rerun links, both run forms, and rerun markers in both lists. Request exports remain independent; model-store imports discard lineage. Scope review recommends keeping this direct-lineage MVP without transitive grouping, edited-step metadata, or import remapping.

Final local validation: 2 API tests, 2 migration/model-store tests, 29 client tests, type check, commit hooks, and 1 Playwright E2E passed; six screenshots inspected. CI and PostgreSQL execution remain pending. No PR opened.

Helper-reuse revision: both affected API tests passed after using existing populator helpers; [normal revision review](subagents/helper_revision_review.md) is clean. [Prior implementation debrief](earlier_drafts/4/implementation_debrief.md) archived per the revision procedure.
