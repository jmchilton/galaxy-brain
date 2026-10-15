# Backend implementation: invocation rerun lineage

Implementation is complete and has passed targeted API, migration, and model-store tests, including the final expanded regression run.

## Decisions

- `workflow_invocation.rerun_of_invocation_id` is a nullable indexed self foreign key with `ON DELETE SET NULL`; relationship `rerun_of_invocation` resolves its source. Migration `6f9a3b2c1d80` follows current dev head `64d49ad328d4`.
- Invoke payload accepts optional encoded `rerun_of_invocation_id`. The workflow service decodes it and uses the existing `WorkflowsManager.get_invocation` accessible-history check before building any run configurations. No same-workflow constraint is imposed: editing a workflow before rerunning remains supported.
- All expanded batch configurations retain the same validated source. Only top-level invocations are linked; recursively created subworkflow requests retain their own semantics.
- Collection and invocation-create responses expose `is_rerun`, derived from FK presence without loading lineage relationships. This remains a useful marker if access to the original history later changes.
- Element responses expose access-filtered `rerun_of_invocation_id` and `latest_rerun_invocation_id`. Every linked invocation is checked against its own history's access policy. Latest direct successors are ordered by creation time and ID, read in batches, and filtered until the first accessible invocation is found. Collection views do not run this query.
- The serializer receives context for show, element index, cancellation and model-store import response paths. Normal review caught the initially omitted element-index context, and it was corrected.
- Invocation request export deliberately has no lineage metadata, so replaying it does not inherit an earlier source. Existing model-store serialization does not export lineage, and its import whitelist ignores nonportable source identifiers.

## Validation

- `PYTHONPATH=lib .venv/bin/python -m pytest test/unit/workflow/test_invocation_rerun_migration.py test/unit/data/model/test_model_store.py::test_import_export_invocation -q -p no:cacheprovider`: **2 passed**.
- Two selected API tests against the isolated local Galaxy server on port 8417: **2 passed**. The launcher `/tmp/run_backend_api_24174.py` reads the ignored local test configuration, sets the external-server environment and runs `TestWorkflowsApi::test_workflow_invocation_rerun_lineage` and `::test_workflow_invocation_rerun_access`; it does not print configuration values.
- Migration coverage includes existing-row preservation/null defaults, index/FK inspection, FK enforcement against missing targets, raw source deletion with foreign keys enabled (`SET NULL`), and downgrade preserving surviving rows.
- API coverage includes normal invocation, source/detail link, successor link, request export and independent replay, collection marker, element-index links, batch shared source, latest sibling ordering, malformed/missing source rejection, cross-user source denial, public-history source acceptance, and source-access revocation.
- Expanded final tests additionally cover selecting an older accessible successor when a newer successor is private, and model-store import explicitly containing an unrelated local source ID. The final API rerun passed both tests (5.90s); the expanded model-store rerun passed (0.96s).
- Black/isort applied to all changed Python files; `git diff --check` passes.

## Remaining broader work

Coordinator owns UI/E2E work and the remaining finalization reviews. No backend implementation blocker identified. PostgreSQL-specific migration execution has not been performed by this phase; the migration uses existing database-aware helpers and SQLite round-trip coverage.
