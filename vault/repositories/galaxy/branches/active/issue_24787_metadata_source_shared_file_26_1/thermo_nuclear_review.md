Run via Opus 5.5 at medium effort.

`badfe530121` is correct but was built the long way round. I restructured it and committed `8c9d6135164`: the guard now takes files out of the batch up front, so `remove_object` matches the base again, and it uses the script's existing `_update`, so `Action` no longer holds a connection. I found no blocker under the review's approval bar and no behaviour bug. I kept the two guards separate and made them point at each other. No `lib` changes in this pass. Not pushed.

## Changed

**`RemovesMetadataFiles` (`8c9d6135164`).** The batch commit added four things a reader had to hold together: a `_conn` on every `Action`, hand-written `bindparam` expansion, a manual `rollback`, and a `_uuids_in_use` attribute set in `remove_objects` and read in `remove_object`. The first three duplicated `Cleanup._update`, which already expands list params and ends the transaction. The action's main query and the disk usage recalculation already run through it. The fourth was state that only exists because the check and its effect sat in different methods.

- `_keep_files_named_by_live_rows` runs before `super().remove_objects()` and discards in-use files from `objects_to_remove`.
- `remove_object` and `Action.__init__` are back to their base form, so neither appears in the branch diff any more.
- Each uuid conversion now happens once in each direction, instead of converting to hex again per file in `remove_object`.
- The `id NOT IN` clause looks redundant, so the docstring now says what it's for (below).

Cost: `_update` logs its usual "Flushing transaction" lines to the script's main log, or "Update resulted in no changes, rolling back transaction", once per removal batch. That wording is odd for a `SELECT`. I accepted it to keep one path for ending a transaction. "keeping" lines now come before the batch's "removing" lines rather than in id order.

**Guard cross-references.** Each guard's docstring now names the other script.

## The two guards

Compared clause by clause, they apply the same rule: only uuid-named files with a non-NULL uuid, and live means `deleted IS NOT TRUE AND purged IS NOT TRUE`. `cleanup_datasets.py` excludes only the row itself, which is enough because it commits each row as purged before checking the next. The last row of a family therefore removes the file.

I didn't merge them. The only shared home is `galaxy.model`, because `scripts/cleanup_datasets/` isn't importable from either script.

- That would add a public symbol to `lib` on a release branch to share one `WHERE` clause.
- It removes about as many lines as it adds.
- A SQLAlchemy select can't go through `_update`, which takes SQL text, so the `_conn` plumbing would come back. It would also bring back the `CHAR(32)` binding question under both drivers.
- These scripts already restate every cleanup rule twice, once in SQL and once in the ORM. A single shared rule wouldn't change that.

The drift risk is covered by the docstrings and by a test per script using the same fixture. The move that really deletes both guards is repairing existing duplicate rows so uuids become unique, which is `dev` work and was already reported as open.

## Reviewed and left alone

- **`id NOT IN :ids`.** On a real run the batch is already committed as deleted, so this clause only affects `--dry-run`. Removing it passes every integration test, but in the harness a dry run then logged "keeping" for every uuid-named file with a uuid. It stays. No committed test pins it, because `_scripts_check_output` doesn't capture the stderr that dry-run logging goes to. Adding that felt out of proportion for a log line.
- **`--dry-run` across a batch boundary.** Observed at batch size 2: a family that spans batches logs "keeping" where a real run removes it. Nothing is deleted either way, and it was already known.
- **`metadata.py`.** I found nothing new beyond the previous round's review. `_shares_dataset` earns its two callers, and `from_external_value`'s condition is one clause.
- **`_delete_dataset` nesting.** The guard pushes the `try` one level deeper. Extracting a helper would move the same lines without removing any.
- **File size.** `pgcleanup.py` was already over 1,000 lines on the base. `cleanup_datasets.py` and `metadata.py` stay under.

## Noted, not done

Unrelated, and a release branch isn't the place for them.

- `_delete_dataset`'s trailing `log.info(metadata_file.get_file_name())` recreates an empty file after removing it. `test_cleanup_keeps_metadata_file_a_live_row_names` has to allow for that.
- The guard calls `get_store_by` for each file and `remove_object` calls it again. It's a lookup when `object_store_id` is set. A distributed store with a NULL id may have to search its backends, which I read in the code and didn't measure.
- From the previous round, still standing: `make_copy`'s unreachable `target is None`, its `session(target_context.parent)` call, and `value.id` on a possible `MetadataTempFile`.
- `metadata_file` rows of API-purged HDAs keep a file on disk (rescope review). That's the safe way for the guard to fail.

## Results

All on Postgres at `127.0.0.1:55487` except where noted.

| Run | Result |
|---|---|
| `test/integration/test_scripts_pgcleanup.py`, on the tree committed as `8c9d6135164` | 11 passed (284 s) |
| Mutation: never discard from the batch | `test_purge_deleted_hdas_keeps_metadata_file_a_live_row_names` failed, the other selected test passed |
| Mutation: drop `id NOT IN` | 2 selected tests passed, so no test pins it. Harness dry run logged "keeping" for all uuid-named rows |
| ruff, black `--fast`, isort on both scripts | clean |
| mypy on both scripts | 57 errors in `pgcleanup.py`, 54 on the base copy. New ones on the changed lines read `"RemovesMetadataFiles" has no ...`, the mixin pattern the file already has throughout. |

Scratch harness (`thermo_harness.py` in the session scratchpad, not on the branch), driving real `handle_results` and `Cleanup._update` with a stub object store on an 8-row table, under psycopg2 and psycopg, real and dry, at batch sizes 1000 and 2:

- Real runs: the file with a live row was kept, and an all-dead family and the rest were removed, the same in all four combinations.
- At batch size 2, `_update` commits while `handle_results` is still iterating its cursor, and iteration continued correctly under both drivers.
- The connection was `idle` during every delete and not in a transaction afterwards.
- `EXPLAIN` under psycopg2 on 200k rows: `= ANY(list)` is a seq scan with `(uuid)::text = ANY(...::text[])`, and expanding `IN` is a bitmap index scan. This confirms the code comment, which the performance debrief had only predicted.

Not rerun: `test_scripts.py` and the `metadata.py` tests. `cleanup_datasets.py` changed only in a docstring, and `metadata.py` didn't change. `performance_challenges_debrief.md`'s statement that the query is issued through `text()` with `_conn` is now out of date, though its counts and connection states still hold: one query per batch, `idle` during deletes.
