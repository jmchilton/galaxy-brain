# Foundry #564: annotation import failures

Investigated 2026-09-17. Tracking issue: https://github.com/galaxyproject/foundry/issues/564.

## Finding

The strongest lead is a Galaxy database/index bug, not a gxformat2 string-length contract.
Current Galaxy declares `WorkflowStepAnnotationAssociation.annotation` as `TEXT`, with a
B-tree index on the entire annotation. The index's `mysql_length=200` option limits the
indexed prefix on MySQL; it does not limit the PostgreSQL index.

Current source checked:

- Galaxy dev `18bb36a9f49071da5e502b162c9a6905d7b78aae`:
  https://github.com/galaxyproject/galaxy/blob/18bb36a9f49071da5e502b162c9a6905d7b78aae/lib/galaxy/model/__init__.py#L12324
- Current import path sanitizes the step annotation and stores it without a length limit:
  https://github.com/galaxyproject/galaxy/blob/18bb36a9f49071da5e502b162c9a6905d7b78aae/lib/galaxy/managers/workflows.py#L2036
- galaxy-tool-util-ts main `7f89ab24acf0161c58c9a2746ecb69772e691df7`: the workflow lint
  implementation has annotation-presence checks but no annotation-length check. The format2
  types allow string or string-array `doc` values.
- Foundry main `157510fe2bed4fbc44c31b2c51fef7581e18628e`: authoring and repair instructions
  do not explicitly require short, stable step documentation. The obligations ledger tracks
  unmet requirements, and the feedback ledger tracks Foundry defects; neither is a general
  archive of every successful authoring decision.

## Reproduction

Used isolated PostgreSQL 17.5 via `@electric-sql/pglite@0.3.14`. Created a `TEXT` column and
the same named default B-tree index as Galaxy, then inserted parameterized values. This is
a database-level reproduction, not a complete Galaxy API import test.

| Annotation | With index | Without index |
| --- | --- | --- |
| 2,000 ASCII characters from deterministic SHA-256 hashes | Pass | Pass |
| 2,700 ASCII characters from deterministic SHA-256 hashes | Fail | Pass |
| 3,500 / 3,900 / 3,999 / 4,168 / 6,272 characters from those hashes | Fail | Pass |
| 100,000 repeated ASCII characters | Pass | Pass |
| 2,000 varied CJK characters, 6,000 UTF-8 bytes | Fail | Pass |

Representative server exception:

```text
SQLSTATE 54000
index row size 2712 exceeds btree version 4 maximum 2704 for index "ix_workflow_step_ann_assoc_annotation"
```

All 12 cases passed after dropping the annotation index. PostgreSQL compression explains
why character count alone is a poor predictor. The reported approximately 4,000-character
boundary could be specific to the original narrative's compressibility. That connection
remains an inference: we do not have the original workflow or usegalaxy.org traceback.

Reproduction and results:

- `/tmp/foundry-564-investigation/probe.mjs`
- `/tmp/foundry-564-investigation/probe-results.json`
- Run: `node /tmp/foundry-564-investigation/probe.mjs`

## Fix ownership

1. **Galaxy model and migration:** remove the unsafe annotation B-tree index if it has no
   justified query consumer, or replace it with an index suited to the actual query. Check
   query use before choosing a replacement. Update both model metadata and existing
   databases through a migration. Audit the other annotation tables, which use the same
   index pattern, before deciding the upstream scope.
2. **Galaxy regression coverage:** exercise incompressible ASCII and multibyte annotations
   on PostgreSQL, for fresh databases and migration upgrades. Verify annotation persistence
   and import/export preservation, and include nested workflow steps and edit paths. A
   repeated `x` fixture or SQLite-only test would miss this bug. A full Galaxy import test
   remains outstanding.
3. **galaxy-tool-util:** do not add a universal 3,500- or 4,000-character schema error. Both
   would reject some successful annotations and miss shorter failures. An advisory warning
   about unusually long documentation can be a separate authoring-quality rule. A
   compatibility check for affected servers needs explicit scope and should disclose that
   it cannot predict PostgreSQL index compression exactly.
4. **Foundry:** document that step `doc` describes the step for its user. Later passes should
   revise that summary, rather than append another full decision narrative. Detailed tool
   comparisons and repair history need an appropriate separate run artifact. This is an
   independent authoring-quality improvement, not the fix for the server crash. Do not
   silently truncate existing documentation or overload the obligations/feedback ledgers.

Recommended first implementation: the Galaxy index fix plus PostgreSQL regression tests.
Keep #564 as the Foundry tracking issue for the upstream fix and the separate authoring
improvement.

## Independent review and upstream report

A subagent independently reproduced the same PostgreSQL failure with a separate 3,000-character
ASCII payload and a 2,000-character CJK payload, and reviewed the issue recommendation for
correctness and clarity. The annotation lookup helper filters by user and item foreign key,
not annotation text, supporting consideration of index removal while leaving the full query
audit to the upstream fix. History, history-dataset, stored-workflow, page, and visualization
annotations share this indexed-text pattern; collection annotations do not have this value index.

Filed the reviewed upstream report, with a standalone SQL reproduction and explicit limits:
https://github.com/galaxyproject/galaxy/issues/23579.
