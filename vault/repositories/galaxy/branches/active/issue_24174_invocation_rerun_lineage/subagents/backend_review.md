Acted on: the element-serialization consistency fix, unnecessary tool-skip cleanup, and batch/latest-ordering coverage were implemented and verified by diff inspection. Deferred: the narrower inaccessible-newest/accessible-older fallback test remains optional additional coverage; existing tests cover inaccessible-only links and ordinary newest selection. No outstanding backend correctness blocker found. Review is read-only; broader validation continues with the coordinator.

# Backend normal review

Working directory: `/Users/jxc755/projects/worktrees/galaxy/branch/issue_24174_invocation_rerun_lineage`.
Compared current uncommitted backend phase with `origin/dev`; migration and migration test were included despite being untracked. Applied `_shared/REVIEW_FOCUS.md` and the private-report policy.

## Recommendations

1. Medium — propagate request context through all element serializers. `InvocationsService.show()` supplies `trans`, but `index(view=element)` and cancellation responses currently do not. Their element schema consequently returns null source/latest links for a linked invocation, contradicting the detail response. Pass optional context through `serialize_workflow_invocations()` and the index/cancel entry points; retain the element-view condition to avoid collection queries. Imported invocations naturally have null lineage, so import need not perform extra lineage work. Fixed by the backend implementer; verified index/cancel/import propagation and unchanged collection guard. Added element-index assertion.
2. Low — remove the unnecessary `@skip_without_tool("cat1")` from the new empty-step lineage test. The decorator was immediately above the inserted test and now causes needless skipping. Fixed: the lineage test no longer requires cat1, and original cached-job test decorators are restored.
3. Coverage — exercise multiple direct successors and fallback past an inaccessible newest successor to an older accessible successor. Current API assertions cover a single successor and the inaccessible-only case. Batch/latest-ordering assertions and model-store import-drop coverage have now been added. The combined inaccessible-newest/accessible-older fallback case is deferred as optional additional coverage; ordinary newest and inaccessible-only cases are covered.

No implementation recommendation remains unacted on. The extra combined fallback test is deferred for coverage depth rather than a demonstrated correctness failure. The coordinator owns final execution evidence.

## Reviewed behavior

- Model adds a nullable indexed self-reference with `ON DELETE SET NULL`; relationship identifies its remote side explicitly. `is_rerun` depends on the stored source FK, consistent with the accepted deleted-source semantics.
- Migration follows the existing head and uses the shared migration helpers. Downgrade drops index and FK before its column. Existing rows retain null source IDs.
- Request source ID is decoded once and resolved through the existing invocation manager with accessible-history checks before configuration building. Every expanded batch configuration receives the same resolved source.
- Detail source and direct successors independently use existing history access rules; inaccessible related objects become null links. Latest selection orders by creation time and ID descending, giving deterministic sibling ordering.
- Collection markers avoid lineage relationship traversal and successor queries.
- Native invocation model-store serialization explicitly builds its attributes and does not include the new source field. Import builds a new invocation through an attribute allowlist and does not assign source lineage, so raw local IDs from imported stores cannot become relations.
- Request export uses its existing dedicated schema and does not include source or marker metadata. Reinvoking an exported request therefore remains independent, as intended.
- Existing tests were not removed or weakened. New tests use API integration paths for persistence/access rather than mocking service behavior.

## Validation

Ran `.venv/bin/python -m pytest -q test/unit/workflow/test_invocation_rerun_migration.py`: 1 passed. This verifies existing-row upgrade, nullability/index/FK metadata, invalid-reference rejection with SQLite FK enforcement enabled, `SET NULL` after deleting a source, and downgrade preserving remaining invocation data. Sandbox restrictions produced a pytest-cache write warning and a process-enumeration cleanup warning after the successful test; exit code was 0.

This reviewer did not run API tests or PostgreSQL migration tests; backend implementer/coordinator validation remains authoritative. The migration unit test covers SQLite directly; the backend implementer is running broader checks. UI and E2E behavior are outside this backend-phase review.
