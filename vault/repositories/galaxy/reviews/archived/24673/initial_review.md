# Default review: #24673

Profile: `default` (`_shared/reviewers/default.md`). Model: Opus 5.5 (`claude-opus-5-5`). Effort: medium. Reviewed commit: `7db61c5f53a00485aa058a02ce0cd2533034ce3b`.

**Verdict: no blockers. No P1 or P2.** The lock protocol held up when traced against the code. Remaining findings are P3: duplication and test gaps, which suit a release-branch fix being kept small.

**Static review only.** Docker's daemon was down and no local Postgres exists, so nothing was run. The PR's own concurrency tests were not re-run here; the record's status says CI has no failures. PostgreSQL behavior below comes from reading the code against documented lock semantics, not from an experiment.

## Findings

### P3 1: `visible` save/restore around `copy_from` now lives in three call sites

`lib/galaxy/model/__init__.py` `copy_from` (the new recursion), `Job.copy_from_job` and `ExpressionTool.exec_after_process` (`lib/galaxy/tools/__init__.py`) each save `visible`, call `copy_from`, then restore it. The second commit adds the third, and also does the same for `deleted`. Only `DatasetCollection.replace_elements_with_copies` and `deferred.py` (a brand new HDA) still get the overwrite, and most callers now work around it.

Suggested fix: move this into `copy_from`, for example a keyword that keeps the target's own `visible`/`deleted`, or set them only for a new instance. On a release branch this is fine as a dev follow-up.

### P3 2: `_lock_and_load_copies` restates the relationship's join

The new query repeats the `copied_to_history_dataset_associations` primaryjoin (`copied_from_history_dataset_association_id` plus `dataset_id`), then merges its rows with a relationship load taken before the lock. `copy()` only sets the foreign key id, never the relationship collection, and the only relationship assignments elsewhere are in the model store import, so the collection holds nothing the query misses.

Suggested fix: load after the lock, reusing the relationship and dropping one query and the merge. Not run; `test_copy_committed_after_swap_starts_follows_swap` would prove it.

```python
if self.id is not None:
    session = required_object_session(self)
    session.execute(select(HistoryDatasetAssociation.id).where(HistoryDatasetAssociation.id == self.id).with_for_update())
    session.expire(self, ["copied_to_history_dataset_associations"])
return list(self.copied_to_history_dataset_associations)
```

### P3 3: Tests leave `deleted` retention and copies of copies unguarded

`test_copy_from_keeps_visibility_of_copies` asserts only `visible`, and nothing in `test/unit/data/test_hda_copy_from.py` asserts `deleted`, so removing `deleted` from the restore would still pass. The description's "copies of copies follow the same rule" has no test either: every test uses one level of copy.

Suggested fix: assert a deleted copy stays deleted in the existing test, and add a two-level chain (copy of a copy, hidden at the second level) on SQLite. A concurrent chain case on Postgres is optional.

### P3 4: Tests run with `autoflush=True`, production with `autoflush=False`

The tests use `Session(engine)`, while production sessions come from `sessionmaker(autoflush=False)` (`lib/galaxy/model/base.py:73`). So in the tests the lock and copy queries in `copy_from` flush the parent's swap before recursing, which production never does. I traced the unflushed path and found no bug, because `dataset_id` stays at the old value in memory and in the database until commit, but the tests don't exercise that path.

Suggested fix: use `Session(engine, autoflush=False)` throughout the new test module. Any flush the tests then need should be explicit, as `runner.flush()` already is.

### P3 5: `engine` fixture hand-rolls the URL selection in `model_testing_utils`

The fixture's Postgres-or-SQLite branch and unique database name duplicate the module-scoped `url` fixture in `lib/galaxy/model/unittest_utils/model_testing_utils.py`, which reads the same `GALAXY_TEST_DBURI`. `disposing_engine` from the same module covers the engine lifetime.

Suggested fix: build the fixture from those. `IS_POSTGRES` is still needed for the skip marker.

## Concurrency claims checked

| Claim | Result |
|---|---|
| `FOR KEY SHARE` and `FOR UPDATE` conflict; ordinary `UPDATE`s don't block on `KEY SHARE` | Holds. HDA's only unique key is its primary key, and the swap's non-key `UPDATE`s take `FOR NO KEY UPDATE`. |
| Copy first: the swap waits, then finds the copy | Holds. The copy is added in the same transaction as the lock, and the query after the lock takes a new READ COMMITTED snapshot. |
| Swap first: the copier sees the new `dataset_id` | Holds. The state check reads the old dataset, which stays swappable because `full_delete` changes only `deleted`/`purged`. So the copier always reaches the lock. |
| Copies of copies | Holds. Recursion locks each level, and a copier of a mid-chain HDA locks that same row. |
| Every copier goes through `copy()` | Holds for history copies, collection copies and tool copies. `to_library_dataset_dataset_association` reads `self.dataset` without a lock, but library copies were never propagated, so that is pre-existing. The one other HDA built on a shared dataset, the early cache hit in `tools/actions/__init__.py`, takes it from a completed job's output, which isn't swappable. A grep found no Core inserts into the HDA table. |
| Locks stay held until the swap is complete | Holds. No commit between `copy_from_job`'s locks and the `commit()` in `prepare`, and `job_execution/actions/post.py` has no direct `commit()`, though I didn't trace the helpers its actions call. `_next_hid` uses its own connection but touches only `history`. |
| A deadlock gives an error, not a stuck item | Holds, with caveats below. |

Caveats and context, none raised as findings:

- **Deadlock recovery takes a second pass.** After a deadlock in `session.execute`, the `fail()` in `prepare_job` should itself raise, because `refresh` runs on the aborted transaction. `run_next` then logs it, closes the session and requeues `fail_job`, so the job does fail, but with a generic "Job failed" rather than the deadlock message. A workflow scheduling pass logs the exception and retries on a later pass. Read, not run.
- **Descending order is more reachable than the description implies.** It lists list building as id-ordered, but `__BUILD_LIST__` copies in request order (`incoming["datasets"]`). Copies are also locked outside the id-ordered pass, so a single-output job can deadlock with a transaction that copies a copy and then its source. The failure is loud and the description accepts the risk, so this isn't re-raised, but its "several outputs" scope is narrower than the code.
- **Undetectable wait, very narrow.** `_next_hid` runs on a separate connection while the runner holds its row locks. A transaction that had already updated the `history` row and was then waiting on one of those locks would form a cycle Postgres can't see. It needs a late hit that adds to the history plus a mid-transaction `history` update, so it looks rare.
- **Job finish also takes the lock.** `ExpressionTool.exec_after_process` calls `copy_from` on a persisted output, so finish now takes `FOR UPDATE` and waits on any open transaction with a `KEY SHARE` on that output, such as a scheduling pass's foreign key inserts. It then holds the lock until finish commits, which can include inline `set_meta` when Celery is off. The description's blast radius covers lock cost only for cache hits. Other transactions wait briefly and I found no cycle, so the risk looks low.
- **Tags depend on the ordering.** Callers evaluate `copy_tags=x.tags` before `copy()`, so a swap-first copy keeps the pre-swap tags while a copy-first copy gets the cached output's tags through propagation. `copy_tags_from` also appends rather than replaces. That is pre-existing, and the effect is cosmetic.
