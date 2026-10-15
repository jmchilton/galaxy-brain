# Implementation debrief

**STATUS: READY.** Issue [#24174](https://github.com/galaxyproject/galaxy/issues/24174), pushed to [`jmchilton/issue_24174_invocation_rerun_lineage`](https://github.com/jmchilton/galaxy/tree/issue_24174_invocation_rerun_lineage). Head `fae0d714906`, six commits on `dev` at `88127f42979`. Awaiting CI and human review.

## Requested revision

The two rerun lineage API tests now reuse existing populator helpers: `get_invocation`, `invocation_to_request`, `history_invocations`, and `update_history`. The explicit element-view listing stays direct because the history-list helper does not accept a view parameter. The history-update response still has its explicit 200 assertion. No helper implementation or production behavior changed.

Both affected API tests passed against a fresh Galaxy instance (**2 passed**, 40.33 seconds). All commit hooks and diff checks passed. [Normal revision review](subagents/helper_revision_review.md) found no issues and verified helper return values, defaults, status checks, and switched-user authentication. Previous debrief archived at [earlier draft 4](earlier_drafts/4/implementation_debrief.md).

## Final implementation and scope

A nullable indexed self foreign key stores each invocation's immediate rerun source, with a reversible migration and `ON DELETE SET NULL`. Source access is validated before creating runs; batch runs share the source. Element responses expose accessible source/latest direct-rerun links, collection responses expose a rerun marker, and both workflow run forms and both invocation lists carry/display lineage.

Request exports remain independent replay templates; model-store imports discard database-local lineage. The [scope evaluation](scope_evaluation.md) recommends keeping direct lineage without transitive grouping, edited-step metadata, or import remapping.

## Validation and handoff

Prior feature validation remains applicable: **2 SQLite migration/model-store tests**, **29 client tests across 4 files**, type checking, and **1 Playwright E2E** passed. [Six inspected screenshots](screenshot_debrief.md) are retained; this revision changed only two API tests and did not require fresh screenshot or test-challenge stages.

The complete initial finalize procedure is recorded in the [initial implementation](initial_implementation_debrief.md), [backend review](subagents/backend_review.md), [client review](subagents/client_review.md), [test challenges](test_challenges_debrief.md), [E2E polish](polish_e2e_tests_debrief.md), [strict review](thermo_nuclear_review.md), [scope evaluation](scope_evaluation.md), and [screenshots](screenshot_debrief.md). The new normal review completes the revision procedure.

The existing `branches_implemented_needs_ci` queue entry remains current. CI and PostgreSQL migration execution remain pending. Worktree and [testing setup](testing_environment.md) are retained; no PR was opened by this implementation session.
