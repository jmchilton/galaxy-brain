---
upstream_base_branch: dev
---

# Invocation rerun lineage (#24174)

- [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:issue_24174_invocation_rerun_lineage?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/issue_24174_invocation_rerun_lineage)

## Status

Polishing in progress (`branches_need_polish`), after closing hardening gaps; rebased onto dev at `2f12501a61d`.

No PR.

Fork CI pending on `2f12501a61d`.

## Decisions

- Issue: https://github.com/galaxyproject/galaxy/issues/24174. Targets dev: it adds a database migration.
- Direct-lineage MVP: an indexed nullable self foreign key (`rerun_of_invocation_id`), source access validation, access-filtered source/latest direct-rerun links, both run forms, and rerun markers in both lists. Request exports remain independent; model-store imports discard lineage. No transitive grouping, edited-step metadata, or import remapping ([scope evaluation](scope_evaluation.md)).
- 2026-11-04: John chose to rebase, run the missing hardening steps (baseline refactor, performance challenge, Codex review, check branch), then polish.
- Worktree: `~/projects/worktrees/galaxy/branch/issue_24174_invocation_rerun_lineage`.

## Notes

[Implementation and handoff](implementation_debrief.md) · [Plan](plan.md) · [Initial implementation](initial_implementation_debrief.md) · [Testing environment](testing_environment.md)

[Backend review](subagents/backend_review.md) · [Backend implementation](subagents/backend_implementation.md) · [Client review](subagents/client_review.md) · [Client implementation](subagents/client_implementation.md) · [Helper revision review](subagents/helper_revision_review.md)

[Test challenges](test_challenges_debrief.md) · [E2E polish](polish_e2e_tests_debrief.md) · [Strict review](thermo_nuclear_review.md) · [Scope evaluation](scope_evaluation.md) · [Screenshot index](screenshot_debrief.md)

## History

- 2026-10-16: fixed five branch-specific CI typing errors (migration return annotations, Alembic context import, SQLAlchemy result views in the migration regression); behavior unchanged.
- 2026-11-04: rebased onto dev (one conflict in `services/workflows.py`, resolved by keeping dev's scheduler/tool/on-complete checks before resolving the rerun source). The Alembic chain stayed linear (`64d49ad328d4` is still dev's head), so the migration needed no re-parenting. Migration round-trip, model-store lineage, both lineage API tests and 143 related client tests pass locally.
