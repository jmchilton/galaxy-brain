Run via Opus 5.5 at medium effort.

One problem found and fixed: pgcleanup's per-file guard. It was fast per query, but it left a transaction open through object store deletes and could fall back to a sequential scan. The guard now runs one query per removal batch. `cleanup_datasets.py` and the set-metadata path didn't need changes.

## Setup

Measured on a local Postgres 16 container, on a synthetic `metadata_file` table with the model's column types and indexes:

- 20.4M rows, 2.4 GB, of which 90% are dead.
- Duplicate-uuid families of 3 rows (2,000 families), 2,000 rows (20 families) and 200,000 rows (one all live, one all dead).

The client ran on the same host, so round trips are cheap. This isn't production data and the family sizes are my guesses. The object store was local disk or a stub, so S3-side numbers below are reasoning, not measurement.

## The index exists on upgraded databases

`ix_metadata_file_uuid` is declared on the model. The migration that added the column (0152) didn't create it, but 0169 `add_missing_indexes` did, so instances upgraded from that era have it too. I read this from git history; I didn't check a production database.

## pgcleanup: fixed

Before and after, driving the real `RemovesMetadataFiles` over 1,800 rows and a 3-row family with a stub object store. psycopg2 and psycopg gave the same counts and states.

| | Per file (before) | Per batch (now) |
|---|---|---|
| Queries for a batch of about 800 objects | about 800 | 1 |
| Connection state during deletes | `idle in transaction` | `idle` |
| 1,000 lookups, warm cache | 250 ms | 12 ms |
| 1,000 lookups, cold cache | 1,931 ms (psycopg2) | 1,087 ms (psycopg2) |
| Lookup for an all-dead 200k family | 4.2 s, seq scan | 123 ms alone, 1.3 s in a 1,000-uuid batch |

Why it was worth changing:

- **Open transaction.** `_update` commits before `handle_results`, so before this branch pgcleanup held no transaction during deletes. The guard's first `SELECT` opened one that stayed open until the next commit, potentially the rest of the action. I measured `idle in transaction` with an `AccessShareLock` on `metadata_file`, and no xid or xmin, so it doesn't hold back vacuum. The risk is DDL: an `ALTER TABLE metadata_file` would queue behind it, and other queries would queue behind that. On a slow object store this could last hours (reasoning, not measured). The check now finishes and rolls back before any delete.
- **Cost relative to deletes.** On local disk, 1,000 `get_filename` + `delete` calls took 28 ms, so the per-file guard was roughly 10 to 70 times the delete cost. At a million files it added roughly 4 to 30 minutes. On S3 the delete would dominate instead.
- **`LIMIT 1` plan.** For the 200k all-dead family the planner chose a seq scan expecting an early match, and found none: 4.2 s per check, and `EXISTS` did the same at 5.2 s. The 200k live family stayed on the index with a similar cost estimate, so 200k rows (about 1% of this table) looks near the flip point. Families that large aren't realistic, since one job's outputs bound them. The batched query has no `LIMIT` and used a bitmap scan.

Behaviour of the new query:

- It excludes every row in the batch rather than each row's own id. On a real run those rows are already committed as deleted, so the result is the same.
- In `--dry-run` the updates are rolled back, so batch-mates look live. Excluding them makes the log match what a real run would do, unless a family spans two batches. Then a dry run logs "keeping" for a file a real run would remove. Nothing is deleted in a dry run either way.

**Type trap.** `metadata_file.uuid` is `CHAR(32)`. Comparing it with a `text` value casts the column and loses the index: a 10.4 s seq scan when I compared against `md5(...)`. Literals sent as untyped strings use the index, and I confirmed that for `text()` with `:uuid` under both drivers. An `= ANY(:array)` form should hit this trap, because the array binds as `text[]` (I didn't run that form), so the query uses an expanding `IN` with a comment saying why. Its plan is a bitmap index scan, and its timings under both drivers show the index in use.

## cleanup_datasets.py: left alone

`_metadata_file_named_by_live_row` is 0.7 ms per file through the ORM, on the index, under both drivers. That loop already commits twice per file and queries per HDA. It commits straight after the check, so it leaves no transaction open. The `EXISTS` form has the same seq scan risk for an all-dead family around 1% of the table, which I'm accepting as unrealistic. Batching here would mean restructuring a loop built around per-row commits, for little gain.

## Set-metadata path: left alone

`_shares_dataset` in `from_external_value`, counted on the unit test's mock app (SQLite) with expired objects:

| Output | Statements |
|---|---|
| Normal output with its own file, helper stubbed | 3 |
| Normal output with its own file, real helper | 3 |
| Output resolving to its input's file | 4 |

The helper adds no statements in the normal case, because `update_from_file` loads the same objects straight after. The extra single-row load only applies to outputs needing repair, which are about to write a new file anyway. No flush added. I didn't re-measure `make_copy`; the first round's numbers are in `earlier_drafts/1/performance_challenges_debrief.md`, and its new branch returns without any query of its own beyond what `_shares_dataset` loads.

## Tests

- Added `test_purge_deleted_hdas_removes_metadata_file_when_every_row_naming_it_goes`, covering the batch-exclusion behaviour.
- `test/integration/test_scripts_pgcleanup.py` passes on Postgres: 11 passed. `cleanup_datasets.py` and `metadata.py` didn't change, so I didn't rerun their tests.
- No query-count test committed. Importing pgcleanup into a test needs an object store and an app stand-in, which isn't cheap. The counts above came from a scratch harness that isn't on the branch, and it also confirmed the rollback is safe while `handle_results` is still iterating its cursor, across a batch boundary.
