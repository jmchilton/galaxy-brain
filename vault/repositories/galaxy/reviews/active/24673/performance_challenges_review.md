# Performance review: PR 24673

Profile `gx_performance_challenger`, Opus 5.5 (claude-opus-5-5), medium effort. Reviewed commit `7db61c5f53a00485aa058a02ce0cd2533034ce3b`.

**Verdict: no P1 or P2 findings.** Copies of finished datasets add no statements, the new queries use indexes, and the copy-side lock adds no measurable WAL. One minor finding covers repeat locks of the same row. It shouldn't block this release fix.

Measured on PostgreSQL 16.2 over loopback, calling model methods directly rather than through a Galaxy server. Method, limits and raw data are in [performance_challenges_debrief.md](performance_challenges_debrief.md).

### P3 1: Repeat copies of one source re-issue the lock on a row the transaction already holds (measured)

`copy()` runs `_lock_source_of_copy` on every call, even when this transaction already holds the lock. `CrossProductFlatCollectionTool` and `CrossProductNestedCollectionTool` copy each source once per pair (`lib/galaxy/tools/__init__.py:3793`, `:3831`), and `DuplicateFileToCollectionTool` copies one HDA `number` times. All three accept in-flight inputs.

The PR accepts one extra `SELECT` per copied HDA. What it doesn't mention is that on these paths nearly all of those statements re-lock a row already held, so they do nothing, and wall time doubles, well outside run-to-run noise.

A loop of the same shape as the cross-product tools, 100 x 100 queued elements (20,000 copies of 200 sources), went from 420 to 20,420 statements and from 3.5 s to 6.9 s (median of three) on loopback. Only the first lock per source does anything; I didn't measure a networked database, but at an assumed 1 ms round trip the other 19,800 would add about 20 s.

Skip the lock when this object already took it in the current transaction. A prototype cut the same scenario to 620 statements, of which 200 were locks, and 3.55 s (one run). The PR's four `test_hda_copy_from.py` tests still pass on PostgreSQL, but none of them copies one source twice in a transaction, so they don't exercise the skip.

<details><summary>Details</summary>

The prototype, in `_lock_source_of_copy` after `session` is set:

```python
transaction = session.get_transaction()
if transaction is not None and self.__dict__.get("_copy_lock_transaction") is transaction:
    return
self.__dict__["_copy_lock_transaction"] = transaction
```

`session.get_transaction()` is the root transaction, so this needs no commit hook. One caveat: rolling back to a savepoint releases a lock taken inside it, and this check wouldn't notice. Check whether any copy path runs inside a savepoint before adopting it. The prototype was written to measure the saving, so treat it as a sketch.

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_performance_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_performance_challenger.md) via Opus 5.5 at medium effort.

</details>

## Checked, no finding

- **Finished datasets:** `ok` sources add zero statements.
- **Query plans, 2M HDA rows:** the lock statements use the primary key and `committed_copies` uses the `dataset_id` index, at 0.23 ms or less.
- **WAL:** about 9.44 MB for 10,000 copies on both base and head.
- **Flushes:** `no_autoflush` keeps the lock from adding flushes in `flush=False` loops.
- **Ordinary updates:** an `UPDATE` on the source took 0.01 s while a swap was waiting on it, which supports the PR's blast-radius claim.

## Data point on a called-out decision

The PR already says the swap waits for open copier transactions. A swap started 2 s into a `History.copy` of 10,000 queued HDAs waited 8.18 s (one run). Nothing is requested here; the number is for judging that trade-off.

The PR also states the cost of one extra `SELECT` per copied in-flight HDA, and the data confirms it: at n = 10,000, `History.copy` and `HDCA.copy` went from about 30,000 to 40,000 statements, with wall time up about 10-30%, close to run-to-run noise. No change is requested. If production later shows long scheduling passes on in-flight collections, a possible follow-up is to lock the sources in one `SELECT id, dataset_id ... WHERE id = ANY(...) ORDER BY id FOR KEY SHARE` before the loop. In raw SQL over 10,000 rows of a 2M row table, that statement took 0.013 s against 0.67-0.72 s for per-row locks. That times only the lock statement, not an end-to-end change.
