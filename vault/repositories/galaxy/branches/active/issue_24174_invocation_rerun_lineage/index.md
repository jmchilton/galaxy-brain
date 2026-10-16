# Invocation rerun lineage (#24174)

Status: `branches_ready_for_final_review`. Head: `fd978a7980b2fb3c81d06c7abc8591ae790275d9`. Fork CI pending after repair.
- Issue: https://github.com/galaxyproject/galaxy/issues/24174
- Branch: [`jmchilton/issue_24174_invocation_rerun_lineage`](https://github.com/jmchilton/galaxy/tree/issue_24174_invocation_rerun_lineage)
- Head: `fd978a7980b2fb3c81d06c7abc8591ae790275d9` (pushed).
- Working directory: `/Users/jxc755/projects/worktrees/galaxy/branch/issue_24174_invocation_rerun_lineage`

[Implementation and handoff](implementation_debrief.md) · [Plan](plan.md) · [Initial implementation](initial_implementation_debrief.md) · [Testing environment](testing_environment.md)

[Backend review](subagents/backend_review.md) · [Backend implementation](subagents/backend_implementation.md) · [Client review](subagents/client_review.md) · [Client implementation](subagents/client_implementation.md)

[Test challenges](test_challenges_debrief.md) · [E2E polish](polish_e2e_tests_debrief.md) · [Strict review](thermo_nuclear_review.md) · [Scope evaluation](scope_evaluation.md) · [Screenshot index](screenshot_debrief.md)

Uses an indexed nullable self foreign key, source access validation, access-filtered source/latest direct-rerun links, both run forms, and rerun markers in both lists. Request exports remain independent; model-store imports discard lineage. Scope review recommends keeping this direct-lineage MVP without transitive grouping, edited-step metadata, or import remapping.

Final local validation: 2 API tests, 2 migration/model-store tests, 29 client tests, type check, commit hooks, and 1 Playwright E2E passed; six screenshots inspected. CI and PostgreSQL execution remain pending. No PR opened.

Helper-reuse revision: both affected API tests passed after using existing populator helpers; [normal revision review](subagents/helper_revision_review.md) is clean. [Prior implementation debrief](earlier_drafts/4/implementation_debrief.md) archived per the revision procedure.

## Morning refresh — 2026-10-16

Fork Python lint/package jobs report relevant missing return annotations in the new migration upgrade/downgrade, non-exported migrations.util.context, and Row-versus-tuple assertion typing in test_invocation_rerun_migration.py. Browser cache misses remain separate. Retain `branches_implemented_needs_ci`.

## CI typing repair — 2026-10-16

Fixed the five branch-specific CI typing errors: return annotations on migration upgrade/downgrade, importing Alembic context directly in the regression, and explicit scalar/tuple result views for its SQLAlchemy assertions. The assertions retain the same data and row-count checks; lineage behavior is unchanged. No rebase onto dev was performed.

Validation: both lineage API cases pass against a fresh self-started Galaxy server; migration round-trip and model-store lineage regression pass (**4 tests**). Black, isort and normal commit hooks pass. Targeted mypy passes. Full CI-scope mypy goes from 37 errors on the unchanged local baseline to 32 after the fix, removing exactly these five errors and introducing none; a fully green full mypy run is not claimed. The remaining errors are identical baseline diagnostics in other files.

Published `fd978a7980b2fb3c81d06c7abc8591ae790275d9` to `jmchilton/issue_24174_invocation_rerun_lineage`. Fresh fork CI is pending. Conflict resolutions or code fixes require a fresh human read; no prior SHA approval is carried forward. No PR was opened.
