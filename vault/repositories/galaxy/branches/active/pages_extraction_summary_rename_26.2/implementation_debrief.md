# Implementation debrief

STATUS: READY

The branch head is `9425d5e862b` on `release_26.2`. It makes three changes to extraction API names that are new in 26.2, before 26.2.0 freezes them:

1. `d4a265d39c3`: renames the `/api/pages/{id}/workflow_extraction_summary` route to `/extraction_summary` and drops the unused `report_title`. The commit is byte-identical to `c076821e882` on `extract_next_followups` (same patch-id).
2. `be1f46b9688`: renames `kind` → `src` on `OutputLabelHint` and `StepLabelHint`, giving the `(src, id)` convention. This is the re-scope expansion, which John approved ([implementation_rescope_debrief.md](implementation_rescope_debrief.md)).
3. `9425d5e862b`: narrows `_build_report_config`'s `title` to `str`, since `report_title` is gone. It came from the thermo-nuclear review. It is a separate commit so commit 1 stays identical.

## Decisions

- Internal names stay as they are: `OutputLabelKind`, the `kind` params in `extract.py`, and the service/client `*WorkflowExtractionSummary` functions. Nothing freezes them, and renaming them would add conflicts with the parent's `extract.py` rework.
- `extract_next_followups` was not touched. On rebase it must absorb commits 2–3. Commit 2 conflicts with its `7dd3f9c161f` (`kind: ContentKind`).
- The original scope is kept as the alt `pages_extraction_summary_rename_26.2_alt_original_scope`.

## Hardening

- Test challenge and E2E polish skipped: no new tests, only re-keyed payloads.
- Screenshots skipped: the client change is only payload keys and the route path, so nothing visible changes.
- Codex: no findings ([codex_review.md](codex_review.md)).
- Thermo-nuclear: approved, one fix (commit 3) ([thermo_nuclear_review.md](thermo_nuclear_review.md)).
- Baseline refactor: none ([baseline_refactor.md](baseline_refactor.md)).
- Scope: keep as implemented ([scope_evaluation.md](scope_evaluation.md)). The first pass is in `earlier_drafts/1/`.
- Checks:
  - `make format` is clean.
  - mypy on the changed files gives 853 errors on both the branch and `release_26.2` (environmental).
  - vue-tsc is clean after rebuilding the api-client dist.
- Tests:
  - `WorkflowExtractionForm.test.ts`: 46 passed. It went red first.
  - `test_workflow_extraction.py -k label`: 21 passed.
  - Pages extraction API tests: 12 passed, on commit 1, before the re-scope.

```
exists .../differential-review/snapshots/20261028T210041Z-hardening-9425d5e862b8.json
  hardening @ 9425d5e862b8 vs origin/release_26.2 (merge-base 0902830bfa67)
  since 20261028T205524Z-implementation-be1f46b96889:
    commits: 2 same, 0 rebased, 0 changed, 1 new, 0 dropped
    hunks:   45 carried, 0 changed, 1 new, 0 dropped
    new     9425d5e862b8 Tighten report title type now that it is always workflow_name
```
