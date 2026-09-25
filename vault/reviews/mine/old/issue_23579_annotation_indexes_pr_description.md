# Remove size-limiting annotation text indexes, bound annotation length

Fixes https://github.com/galaxyproject/galaxy/issues/23579.

Two commits:

1. Remove the six whole-value B-tree indexes on history, dataset, stored-workflow, workflow-step, page, and visualization annotations from ORM metadata and existing databases through an Alembic migration.
2. Add a uniform 64KB limit on annotation length, enforced on write.

PostgreSQL can store these values in `TEXT`, but cannot necessarily fit them into a B-tree index entry; the effective limit depends on UTF-8 byte size and compressibility, not a universal character count ([PostgreSQL documentation](https://www.postgresql.org/docs/18/btree.html)). That made the ceiling both invisible and unevenly distributed across languages — a limit that bites CJK text several times sooner than ASCII.

The annotation lookups use item/user IDs, whose indexes remain intact, and the shared annotation substring filter runs in Python; no query consumer for these annotation-value indexes was found in the Galaxy code audit.

The database mechanism is reproduced independently; this does not establish the cause of the original reported usegalaxy.org failure without its traceback or workflow.

## Migration

Upgrade drops only the annotation-value indexes and preserves existing content.
Downgrade restores the original indexes, including the MySQL prefix option; on PostgreSQL this can fail if oversized annotations have been saved since upgrading, rather than modifying or deleting those annotations to make the downgrade succeed.

## Annotation length limit

`MAX_ANNOTATION_SIZE` is 65536 characters, alongside the existing `MAX_WORKFLOW_README_SIZE` and `MAX_WORKFLOW_HELP_SIZE`. It is measured in characters rather than bytes, so it applies equally regardless of script — the property the index ceiling did not have.

Enforcement is a single `@validates("annotation")` on a new `ItemAnnotationAssociation` mixin, mirroring how `ItemTagAssociation` is shared across the tag association classes. It covers all eight annotation association tables, including the two collection ones that never carried an index.

The validator raises `RequestParameterInvalidException` rather than the `ValueError` used for workflow readme and help. Readme and help are set at one call site that translates the error; annotations are written from roughly fifteen, with no single wrapper to translate at, so a bare `ValueError` would surface as a 500.

No existing annotation is truncated or rewritten, and nothing is deleted. The limit applies to writes only.

## Validation

- Real PostgreSQL 18.6 reproduction: poorly compressible ASCII and varied CJK annotations fail with the original indexed schema.
- Fresh-schema and migration-upgrade regressions cover all six previously indexed association tables, existing annotation preservation, long-text inserts, and subsequent edits.
- The full model migration test module passes on PostgreSQL and SQLite.
- Model unit tests cover the limit on all eight annotation association classes: `None`, exactly at the limit, and one character over.
- Workflow API tests pass, including ASCII/multibyte format2 import, nested step annotations, content preservation when editing, and existing annotation/subworkflow import tests; these were run against both PostgreSQL and SQLite.
- New API tests (SQLite) assert that an oversized workflow annotation and an oversized step annotation both return 400 with a usable message, rather than a 500. The limit is enforced in Python, so it is dialect-independent.
- Focused mypy and Ruff pass.

Branch: `issue_23579_annotation_indexes`, rebased on `origin/dev` at `9ba67b81398c3c9a72842559e3b593ecb945bfe3`.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
