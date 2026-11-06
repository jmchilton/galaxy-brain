

<details><summary>Automated Review Details</summary>

Reviewed with [John's Galaxy Brain Review Factory](https://galaxy-brain.jmchilton.net/factory/galaxy-reviews/).

- Review profile [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) was run via Opus 5.5 at medium effort.
- Review profile [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) was run via Opus 5.5 at low effort.
- Review profile [gx_risk_assessment](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_risk_assessment.md) was run via Opus 5.5 at low effort.
- Review profile [gx_performance_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_performance_challenger.md) was run via Opus 5.5 at medium effort.
- Review profile [learning_galaxy](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/gx_reviews/reviewers/learning_galaxy.md) was run via Opus 5.5 at medium effort.
- Verification was run as documented [here](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/PROCESS_INITIAL_REVIEW.md) via Opus 5.5 at medium effort.

</details>

<details><summary>Risks</summary>

Risks are low and this is largely a two-way door: there is no API, schema, or tool/workflow contract change and the locks can be reverted cleanly, leaving only the copies' `visible`/`deleted` handling as a behavior that a later change could come to depend on.

<details><summary>Risk Details</summary>

- All new locks are in `copy_from`, `copy_from_job`, and `copy()`, so reverting them needs no data migration. HDAs already repointed to a cached dataset stay valid after a revert.
- Purging the replaced dataset already happens today. A copy that escapes the locks, such as in the expression tool gap the PR describes, still ends up on a purged dataset as it does now.
- Propagated copies now keep their own `visible` and `deleted` values on every `copy_from` path, including expression tools and deferred materialization, not just late cache hits. Copies that were previously re-shown or undeleted by a swap now stay as they were.
- `copy_from` now holds row locks until the cache hit commits, including non-immediate post job actions. Open transactions that reference an output can delay job preparation, and those transactions' own locks can queue behind it.
- One deadlock ordering remains, as the PR notes. PostgreSQL aborts one side, so a request or job that used to succeed can fail with an error under that overlap.
- `SELECT ... FOR UPDATE` and `FOR KEY SHARE` have no effect on SQLite, so that behavior is only exercised by the PostgreSQL tests and the new `unit-postgres` workflow step.
- `copy()` can now reload unmodified attributes of the source HDA mid-operation when the dataset changed underneath it, which callers holding that object could observe.

</details>

<details><summary>Risk Review Advice</summary>

Consider whether `copy_from` should preserve `visible` and `deleted` on every caller, since that is the one behavior that applies beyond the race being fixed. Expression tool and deferred materialization paths get it as a side effect, and on a release branch it should be intended there too.

Also consider lock duration on busy servers: the `FOR UPDATE` is held across post job actions and recurses through copies of copies, so judge whether job preparation stalls or the remaining deadlock are an acceptable trade for no longer leaving items stuck in `queued`.

</details>

</details>

## Automated Review Findings

<details><summary>About findings</summary>

These are broken into P1 (must fix), P2 (should fix), and P3 (smaller nits). These ratings are agent defined and the priority to John may be different and called out above. If anything is rated P3 and not called out as important by John above - please don't feel compelled to act on them or respond to them.

You're contributing to a repository John cares about and you deserve a human response. If any of these don't make sense or are missing important context - please push back and accept John's apology.

</details>

<details><summary>Review Verification Branch Details</summary>

This [review branch](https://github.com/jmchilton/galaxy/tree/pr_24673_review_0) contains work the verification agent did to help verify findings and make sure suggestions make sense and are actionable. This doesn't necessarily represent production ready code. Feel free to include any commits in the PR but they should be reviewed by a human.

<details><summary>Branch and Commit Details</summary>

# Review branch [`pr_24673_review_0`](https://github.com/jmchilton/galaxy/tree/pr_24673_review_0)

Branch [`pr_24673_review_0`](https://github.com/jmchilton/galaxy/tree/pr_24673_review_0) sits on top of the reviewed commit `7db61c5f53a`. Six of its eight commits only touch tests. They run the HDA copy module with production's `autoflush=False`, build its engine from the shared fixtures, and pin claims the PR makes but no test held: a copy doesn't block ordinary updates of its source, `copy_from_job` locks outputs in id order, copies keep `deleted`, and the swap reaches copies of copies. The API regression test also asserts the element's state and visibility. The two model changes are small: `_lock_and_load_copies` loads copies through the relationship after the lock instead of restating its join, and `copy()` takes the source lock once per transaction. Nothing on the branch changes the lock protocol.

- [`54a8eef5e85`](https://github.com/jmchilton/galaxy/commit/54a8eef5e85758371a0abdbe0fe6dc75c4b69b1d) Run HDA copy tests with autoflush off, as production sessions do. Switches the module to a `_session` helper using `autoflush=False`.
- [`c7204844402`](https://github.com/jmchilton/galaxy/commit/c7204844402ff3174592de84666731880d539c5d) Build the HDA copy test engine from the shared model test fixtures. Reuses `url` and `disposing_engine`, drops the redundant registry load, and restores the global object store on teardown.
- [`8f60d93267a`](https://github.com/jmchilton/galaxy/commit/8f60d93267a8ba2231a0bad12fc0cf14fd270266) Test that an open HDA copy does not block updates of its source. Adds `test_open_copy_does_not_block_updates_of_source`, which goes red with `FOR SHARE`.
- [`f76a5cc10fa`](https://github.com/jmchilton/galaxy/commit/f76a5cc10faa5e4c4832d63f62d0a8df2c7e7704) Test that a late cache hit locks job outputs in id order. Adds `test_copy_from_job_locks_outputs_in_id_order`, which deadlocks without the ordered lock.
- [`73568f20f96`](https://github.com/jmchilton/galaxy/commit/73568f20f966e6d04af5f8024846d50a5f35bb16) Test deleted copies and copies of copies under a late cache hit. Strengthens `test_copy_from_keeps_visibility_of_copies` and adds `test_copy_from_reaches_copies_of_copies`, both red without their restores.
- [`e5e3ba8704a`](https://github.com/jmchilton/galaxy/commit/e5e3ba8704a4b729585524335a25ca34ea1ca7db) Load HDA copies through the relationship after taking the swap lock. Replaces the restated query and merge with an expire and reload, and the concurrent test now loads the collection before the lock so it goes red without the expire.
- [`5d9d6dd37d8`](https://github.com/jmchilton/galaxy/commit/5d9d6dd37d8b0ddfeea6a917c48667ce0cdfa6af) Lock the source of an HDA copy once per transaction. Remembers the locking transaction on the HDA and adds `test_repeat_copies_lock_source_once_per_transaction`, taking a 100 x 100 cross-product loop from 20,000 lock statements to 200.
- [`84df9eb8a7a`](https://github.com/jmchilton/galaxy/commit/84df9eb8a7ae7438c682fe2d06d807789ecacbd6) Assert the state and visibility of the cached build list element. Strengthens `test_run_cat1_use_cached_job_build_list`.

</details>

</details>

### P2 1: No test that an open copy leaves ordinary source updates unblocked (implementation verified)

The description says `KEY SHARE` never blocks job finishing or metadata updates, and no test holds it to that. Weakening the lock to `FOR SHARE` passes all of the PR's tests and would stall job finishing behind any open copy transaction.

Add a PostgreSQL test that holds an uncommitted `source.copy()`, updates a non-key column of the source from another session, and asserts the update finishes while the copier is still open. Review branch: `test_open_copy_does_not_block_updates_of_source`.

<details><summary>Evidence</summary>

The new test passes on PostgreSQL 16.2 and goes red when the lock is changed to `FOR SHARE`.

</details>

Fixed on the review branch in [`8f60d93267a`](https://github.com/jmchilton/galaxy/commit/8f60d93267a8ba2231a0bad12fc0cf14fd270266).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at low effort. Verified via Opus 5.5 at medium effort.

</details>

### P2 2: `Job.copy_from_job` and its id-ordered locks are never exercised (implementation verified)

The tests call `HistoryDatasetAssociation.copy_from` directly, so deleting the ordered `FOR UPDATE` block in the production entry point passes everything, despite the description's no-deadlock claim.

Add a PostgreSQL test with a two-output job whose outputs are visited higher id first: the copier holds the lower output's copy, the runner blocks in `copy_from_job`, then the copier copies the higher output and commits. Review branch: `test_copy_from_job_locks_outputs_in_id_order`.

<details><summary>Evidence</summary>

The test passes at the PR's code. With the ordered lock removed, it fails with `psycopg2.errors.DeadlockDetected`, so the claim holds and the ordered lock is what delivers it.

</details>

Fixed on the review branch in [`f76a5cc10fa`](https://github.com/jmchilton/galaxy/commit/f76a5cc10faa5e4c4832d63f62d0a8df2c7e7704).

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

Fixed on the review branch in [`5d9d6dd37d8`](https://github.com/jmchilton/galaxy/commit/5d9d6dd37d8b0ddfeea6a917c48667ce0cdfa6af).

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

Fixed on the review branch in [`e5e3ba8704a`](https://github.com/jmchilton/galaxy/commit/e5e3ba8704a4b729585524335a25ca34ea1ca7db).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 3: Tests leave `deleted` retention and copies of copies unguarded (implementation verified)

`test_copy_from_keeps_visibility_of_copies` asserts only `visible`, so removing `deleted` from the restore still passes. The description's "copies of copies follow the same rule" has no test: every test uses one level of copy.

Assert a deleted copy stays deleted, and add a chain (copy of a copy, hidden at the second level) swapped from a fresh session. Both run on SQLite too. Review branch: `test_copy_from_keeps_visibility_of_copies`, `test_copy_from_reaches_copies_of_copies`.

<details><summary>Evidence</summary>

Each assertion goes red when its restore is removed.

</details>

Fixed on the review branch in [`73568f20f96`](https://github.com/jmchilton/galaxy/commit/73568f20f966e6d04af5f8024846d50a5f35bb16).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort and [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at low effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 4: Tests run with `autoflush=True`, production with `autoflush=False` (implementation verified)

The tests use `Session(engine)`, while production sessions come from `sessionmaker(autoflush=False)` (`lib/galaxy/model/base.py`). So the lock and copy queries flush the parent's swap before recursing, which production never does, and the unflushed path goes untested.

Use `autoflush=False` throughout the module. All tests pass that way on PostgreSQL, so this closes the gap and found no bug.

Fixed on the review branch in [`54a8eef5e85`](https://github.com/jmchilton/galaxy/commit/54a8eef5e85758371a0abdbe0fe6dc75c4b69b1d).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 5: `engine` fixture repeats shared fixtures and leaks a global object store (implementation verified)

The fixture's Postgres-or-SQLite branch and unique database name duplicate the module-scoped `url` fixture in `model_testing_utils`, which reads the same `GALAXY_TEST_DBURI`, and `disposing_engine` covers the engine lifetime. Its registry load repeats what importing `test_galaxy_mapping` already does. The global object store stays set after the module in a shared process; no cross-test failure was seen.

Build the fixture from `url` and `disposing_engine`, drop the registry load, and restore the object store on teardown. `url` needs a module-scoped `tmp_directory`, so the module defines one.

<details><summary>Evidence</summary>

The module passes on PostgreSQL and on SQLite, where the concurrent tests skip.

</details>

Fixed on the review branch in [`c7204844402`](https://github.com/jmchilton/galaxy/commit/c7204844402ff3174592de84666731880d539c5d).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort and [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at low effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 6: Existing API regression test asserts little (implementation verified)

`test_run_cat1_use_cached_job_build_list` only checks that the element's content is truthy. Also assert the element is `ok` and `visible is False`. Both hold however the race lands, and the hidden check covers the user-visible symptom the description calls out.

<details><summary>Evidence</summary>

The test passes on PostgreSQL. It failed on `visible` in the one run made with the copy's `visible` restore removed; a late hit is racy, so a run could also miss this.

</details>

Fixed on the review branch in [`84df9eb8a7a`](https://github.com/jmchilton/galaxy/commit/84df9eb8a7ae7438c682fe2d06d807789ecacbd6).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at low effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 7: `visible` save/restore around `copy_from` now lives in three call sites

`copy_from` (the new recursion), `Job.copy_from_job` and `ExpressionTool.exec_after_process` each save `visible`, call `copy_from`, then restore it. Only `DatasetCollection.replace_elements_with_copies` and `deferred.py` still take the overwrite, so most callers now work around it.

Move this into `copy_from` on `dev`, for example with a way to keep the target's own values. It isn't on the review branch: the recursion also keeps `deleted` while the other two sites take it from the source, so one keyword would change behavior at those sites, and that is more than this release fix should carry.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort.

</details>
