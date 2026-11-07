---
upstream_base_branch: dev
pr: 24786
---

# Invocation rerun lineage (#24174)

- [PR #24786](https://github.com/galaxyproject/galaxy/pull/24786)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/issue_24174_invocation_rerun_lineage)

## Status

Reviewed by John at `683e2f05365` and waiting for CI (`ci_wait`), with the same-workflow rule, the grid's expanded-row lineage line and differential-review test removals added after polish ([PR description](pr_description.md), [titles](pr_titles.md), [tags](pr_tags.md), [checklist](pr_checklist.md), [polish debrief](polish_debrief.md); [screenshots](screenshots/) with [index](screenshot_debrief.md)).

Draft PR [#24786](https://github.com/galaxyproject/galaxy/pull/24786), at John's request, until CI finishes green.

Fork CI is still running on `683e2f05365`.

## Decisions

- Issue: https://github.com/galaxyproject/galaxy/issues/24174. Targets dev: it adds a database migration.
- Direct-lineage MVP: an indexed nullable self foreign key (`rerun_of_invocation_id`), source access validation, access-filtered source/latest direct-rerun links, both run forms, a card badge, and links in the grid's expanded row. Request exports remain independent; model-store imports discard lineage. No transitive grouping, edited-step metadata, or import remapping ([scope evaluation](scope_evaluation.md)).
- 2026-11-04: John chose to rebase, run the missing hardening steps (baseline refactor, performance challenge, Codex review, check branch), then polish.
- 2026-11-04: John decided a rerun's source must be an invocation of the same stored workflow (any version); a different workflow, including an identical copy, is rejected with 400 (`9a8bf84c5ab`). John asked for a PR description without hedging.
- 2026-11-06: John decided the grid has no rerun hint on collapsed rows; lineage moves to a compact line in the expanded row, and full-page views keep their banners (`d66dcdb412b`).
- 2026-11-07: John dropped `test_invocations_lineage.py` and `test_invocation_rerun_migration.py` in differential review (`683e2f05365`).
- Worktree: `~/projects/worktrees/galaxy/branch/issue_24174_invocation_rerun_lineage`.

## Notes

[Implementation and handoff](implementation_debrief.md) · [Plan](plan.md) · [Initial implementation](initial_implementation_debrief.md) · [Testing environment](testing_environment.md)

[Backend review](subagents/backend_review.md) · [Backend implementation](subagents/backend_implementation.md) · [Client review](subagents/client_review.md) · [Client implementation](subagents/client_implementation.md) · [Helper revision review](subagents/helper_revision_review.md)

[Test challenges](test_challenges_debrief.md) · [E2E polish](polish_e2e_tests_debrief.md) · [Strict review](thermo_nuclear_review.md) · [Scope evaluation](scope_evaluation.md) · [Screenshot index](screenshot_debrief.md)

[Performance challenges](performance_challenges_debrief.md) · [Codex review](codex_review.md) · [Baseline refactor](baseline_refactor.md)

## History

- 2026-10-16: fixed five branch-specific CI typing errors (migration return annotations, Alembic context import, SQLAlchemy result views in the migration regression); behavior unchanged.
- 2026-11-04: rebased onto dev (one conflict in `services/workflows.py`, resolved by keeping dev's scheduler/tool/on-complete checks before resolving the rerun source). The Alembic chain stayed linear (`64d49ad328d4` is still dev's head), so the migration needed no re-parenting. Migration round-trip, model-store lineage, both lineage API tests and 143 related client tests pass locally.
- 2026-11-04 hardening gaps: performance challenge batched lineage resolution into two queries per serialization batch, with the history access rule in SQL (611 → 10 statements for a heavily rerun published invocation). Codex review found no defects. Baseline refactor split out a leading no-behavior-change commit (`9bf74e3ee40`, batch serialization path). Check branch: `make format` clean; mypy run as CI does (from `lib/`) flagged 9 branch typing errors in the new unit test and lineage code, fixed in `830d058c5be`.
- 2026-11-04 polish: regenerated screenshots, checklist (all pass), PR description, titles and tags. Strengthening added a differential test of the SQL access clause against `check_security` and split 400/404 invalid-source API tests (`9df72d8d97a`).
- 2026-11-04 revision: same-workflow rule for rerun sources, with `test_workflow_invocation_rerun_same_workflow` (copy rejected, newer version accepted); access test now reruns the published original workflow. Description de-hedged.
- 2026-11-04 revision: at John's request, the invocations grid's "Run type" text column became a header-less icon column before the workflow name (muted rerun icon with tooltip and screen-reader text, reruns only), via a new generic `icon` grid cell type (`cfe3e41cbd2`, E2E fix `a6e2ed29d04`). GridList vitest, vue-tsc and the lineage E2E pass; grid screenshot recaptured.
- 2026-11-06 revision: dropped those two commits and replaced the "Run type" column with a compact lineage line in the expanded row, via a `compact` prop on `WorkflowInvocationLineage` (`d66dcdb412b`). Grid and invocation state vitest (71), vue-tsc and the lineage E2E pass; grid screenshot retaken. Force-pushed. The worktree was on pre-rebase history, so it moved to the pushed line and the old commits stay on local branch `issue_24174_pre_rebase_backup_fd978a7980b`.
