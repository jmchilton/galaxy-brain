### P2 1: No test that an open copy leaves ordinary source updates unblocked (implementation verified)

The description says `KEY SHARE` never blocks job finishing or metadata updates, and no test holds it to that. Weakening the lock to `FOR SHARE` passes all of the PR's tests and would stall job finishing behind any open copy transaction.

Add a PostgreSQL test that holds an uncommitted `source.copy()`, updates a non-key column of the source from another session, and asserts the update finishes while the copier is still open. Review branch: `test_open_copy_does_not_block_updates_of_source`.

<details><summary>Evidence</summary>

The new test passes on PostgreSQL 16.2 and goes red when the lock is changed to `FOR SHARE`.

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at low effort. Verified via Opus 5.5 at medium effort.

</details>

### P2 2: `Job.copy_from_job` and its id-ordered locks are never exercised (implementation verified)

The tests call `HistoryDatasetAssociation.copy_from` directly, so deleting the ordered `FOR UPDATE` block in the production entry point passes everything, despite the description's no-deadlock claim.

Add a PostgreSQL test with a two-output job whose outputs are visited higher id first: the copier holds the lower output's copy, the runner blocks in `copy_from_job`, then the copier copies the higher output and commits. Review branch: `test_copy_from_job_locks_outputs_in_id_order`.

<details><summary>Evidence</summary>

The test passes at the PR's code. With the ordered lock removed, it fails with `psycopg2.errors.DeadlockDetected`, so the claim holds and the ordered lock is what delivers it.

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at low effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 1: Repeat copies of one source re-issue the lock on a row the transaction already holds (implementation verified)

`copy()` runs `_lock_source_of_copy` on every call. `CrossProductFlatCollectionTool` and `CrossProductNestedCollectionTool` copy each source once per pair and `DuplicateFileToCollectionTool` copies one HDA `number` times, all on in-flight inputs. After the first copy, each of those lock statements does nothing, and the PR's stated cost of one extra `SELECT` per copied HDA doesn't mention that these paths multiply it.

Skip the lock when this object already took it in the current transaction. `lib/galaxy` has no `begin_nested`, so no savepoint rollback can release the lock early. Review branch: `_copy_lock_transaction`, with `test_repeat_copies_lock_source_once_per_transaction`.

<details><summary>Evidence</summary>

A 100 x 100 cross-product loop of queued HDAs on PostgreSQL 16.2 over loopback, one run each, model methods only:

| | Statements | Lock statements | Seconds |
|---|---|---|---|
| Review branch with the skip disabled | 20,220 | 20,000 | 7.57 |
| Review branch | 420 | 200 | 4.20 |

The new test also checks the lock is taken again after a commit.

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_performance_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_performance_challenger.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 2: `_lock_and_load_copies` restates the relationship's join (implementation verified)

The new query repeats the `copied_to_history_dataset_associations` primaryjoin, then merges its rows with a relationship load taken before the lock. `copy()` sets only the foreign key id, never the collection, so the collection holds nothing a reload misses.

Expire the relationship after taking the lock and load it, which drops one query and the merge.

```python
if self.id is not None:
    session = required_object_session(self)
    session.execute(select(HistoryDatasetAssociation.id).where(HistoryDatasetAssociation.id == self.id).with_for_update())
    session.expire(self, ["copied_to_history_dataset_associations"])
return list(self.copied_to_history_dataset_associations)
```

<details><summary>Evidence</summary>

All tests in `test_hda_copy_from.py` pass on PostgreSQL. `test_copy_committed_after_swap_starts_follows_swap` now loads the collection before the lock, and goes red without the expire.

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 3: Tests leave `deleted` retention and copies of copies unguarded (implementation verified)

`test_copy_from_keeps_visibility_of_copies` asserts only `visible`, so removing `deleted` from the restore still passes. The description's "copies of copies follow the same rule" has no test: every test uses one level of copy.

Assert a deleted copy stays deleted, and add a chain (copy of a copy, hidden at the second level) swapped from a fresh session. Both run on SQLite too. Review branch: `test_copy_from_keeps_visibility_of_copies`, `test_copy_from_reaches_copies_of_copies`.

<details><summary>Evidence</summary>

Each assertion goes red when its restore is removed.

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort and [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at low effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 4: Tests run with `autoflush=True`, production with `autoflush=False` (implementation verified)

The tests use `Session(engine)`, while production sessions come from `sessionmaker(autoflush=False)` (`lib/galaxy/model/base.py`). So the lock and copy queries flush the parent's swap before recursing, which production never does, and the unflushed path goes untested.

Use `autoflush=False` throughout the module. All tests pass that way on PostgreSQL, so this closes the gap and found no bug.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 5: `engine` fixture repeats shared fixtures and leaks a global object store (implementation verified)

The fixture's Postgres-or-SQLite branch and unique database name duplicate the module-scoped `url` fixture in `model_testing_utils`, which reads the same `GALAXY_TEST_DBURI`, and `disposing_engine` covers the engine lifetime. Its registry load repeats what importing `test_galaxy_mapping` already does. The global object store stays set after the module in a shared process; no cross-test failure was seen.

Build the fixture from `url` and `disposing_engine`, drop the registry load, and restore the object store on teardown. `url` needs a module-scoped `tmp_directory`, so the module defines one.

<details><summary>Evidence</summary>

The module passes on PostgreSQL and on SQLite, where the concurrent tests skip.

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort and [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at low effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 6: Existing API regression test asserts little (implementation verified)

`test_run_cat1_use_cached_job_build_list` only checks that the element's content is truthy. Also assert the element is `ok` and `visible is False`. Both hold however the race lands, and the hidden check covers the user-visible symptom the description calls out.

<details><summary>Evidence</summary>

The test passes on PostgreSQL. It failed on `visible` in the one run made with the copy's `visible` restore removed; a late hit is racy, so a run could also miss this.

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at low effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 7: `visible` save/restore around `copy_from` now lives in three call sites

`copy_from` (the new recursion), `Job.copy_from_job` and `ExpressionTool.exec_after_process` each save `visible`, call `copy_from`, then restore it. Only `DatasetCollection.replace_elements_with_copies` and `deferred.py` still take the overwrite, so most callers now work around it.

Move this into `copy_from` on `dev`, for example with a way to keep the target's own values. It isn't on the review branch: the recursion also keeps `deleted` while the other two sites take it from the source, so one keyword would change behavior at those sites, and that is more than this release fix should carry.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort.

</details>
