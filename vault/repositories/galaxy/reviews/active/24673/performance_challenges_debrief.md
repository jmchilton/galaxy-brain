# Performance challenge debrief: PR 24673

Profile `gx_performance_challenger`, Opus 5.5 (claude-opus-5-5), medium effort. Reviewed commit `7db61c5f53a00485aa058a02ce0cd2533034ce3b`, base `832962784443`. REVIEW_DIRECTORY mode: nothing in the PR was changed.

Raw data and scripts: [performance_challenges/](performance_challenges/).

## Verdict

No merge blockers. Copies of finished datasets cost nothing extra and the new queries have good plans. The cost is one extra round trip per copy of an in-flight HDA. It matters most where the same source is copied repeatedly, which is what the cross-product tools do.

## Setup

- PostgreSQL 16.2 (embedded binaries from the `pgserver` wheel, scratch data directory), TCP loopback, default durability. Docker wasn't running and I didn't start it.
- Exported `lib/` at base and head into scratch, so the PR worktree wasn't touched. Each script run printed `galaxy.model.__file__`, confirming which copy it imported.
- Python 3.14, SQLAlchemy 2.0.46 from a borrowed venv (release_25.1 pins 2.0.43). Session built with `autoflush=False`, as in `lib/galaxy/model/base.py`.
- Statements counted with a `before_cursor_execute` listener. Three runs per version at each size, alternating base and head.

Limits:

- The scenarios call model methods directly with a stub object store. No Galaxy server or real tool was run. S2 copies the loop in `CrossProductFlatCollectionTool`; it doesn't call the tool.
- Loopback flatters round trips. Anything stated for a networked database below is arithmetic, not a measurement.
- HDAs had no tags or annotations, so baselines are a lower bound on real work.

## Measured

Median wall time over three runs, n = 10,000 (n = 1,000 is in [summary.md](performance_challenges/summary.md)). Statement counts were identical across all three runs of each version.

| Scenario | Statements base | Statements head | Lock statements | Sec base | Sec head |
|---|---|---|---|---|---|
| S1 copy each of N queued HDAs (model-op shape) | 30,010 | 40,010 | 10,000 | 8.9 | 11.9 |
| S3 same with `ok` sources (control) | 30,010 | 30,010 | 0 | 8.9 | 9.5 |
| S2 cross product, 100 x 100 queued: 20,000 copies of 200 sources | 420 | 20,420 | 20,000 | 3.5 | 6.9 |
| S4 `History.copy`, all queued | 30,017 | 40,017 | 10,000 | 8.5 | 9.4 |
| S5 `HDCA.copy` to another history, queued elements | 30,028 | 40,028 | 10,000 | 10.9 | 11.9 |
| S6 `copy_from` on N elements (late hit on a collection) | 30,003 | 50,003 | 10,000 | 9.5 | 14.0 |
| S7 `copy_from` on one output with N copies | 10,007 | 30,009 | 10,001 | 10.2 | 22.3 |

Timings are noisy: the S3 control ranged from 8.7 to 13.0 s. Trust the statement counts first. S1, S4 and S5 wall-time deltas of about 10-30% sit close to that noise. S2, S6 and S7 stand clear of it.

Other measurements:

- **Control:** `ok` sources add zero statements, as the PR description says.
- **WAL:** S1 wrote about 9.44 MB on both base and head at n = 10,000 (typical runs; one base outlier at 11.4 MB). The new lock adds no measurable heap or WAL write. The likely reason is that the insert's foreign key check on `copied_from_history_dataset_association_id` already takes `KEY SHARE` on the same row in the same transaction. That explanation is inferred from the matching numbers, not traced.
- **Plans, 2M HDA rows:** the lock statements use the primary key (about 0.02 ms). `committed_copies` uses `ix_history_dataset_association_dataset_id` (0.23 ms). The id-ordered output lock returned rows in id order from a primary key index scan under `LockRows`. See [explain.txt](performance_challenges/explain.txt).
- **Popular dataset, worst case:** `committed_copies` with a `dataset_id` shared by 1M rows took 36 ms. That doesn't apply here, because an in-flight output's dataset has few sharers, and the existing relationship already filters on the same columns.
- **Batching, raw SQL, 10,000 rows of the 2M table:** per-row `FOR KEY SHARE` 0.67-0.72 s, one `id = ANY(...) ORDER BY id FOR KEY SHARE` 0.013 s.
- **Lock wait, one run each:** a swap started 2 s into a `History.copy` of 10,000 queued HDAs took 8.18 s on head and 0.05 s on base, where the fast path is the race being fixed. The copy took 10.2 s on head.
- **`UPDATE` during that wait:** a plain `UPDATE` on the same row took 0.01 s while the swap was queued, so it didn't queue behind the waiter. This supports the PR's claim that copies don't block ordinary updates.

## Assessment against past patterns

- **Per-row round trips:** yes on in-flight copies, and this is the main finding. S1, S4 and S5 go from 3 to 4 statements per element. S2 goes from about 0 to 1 per copy, because the baseline's `tags` lazy load is cached per source. Only the S2 shape changes the order of magnitude.
- **Tools that reach this path:** the tools with `require_terminal_states = False` run on in-flight inputs, including Zip, Unzip, BuildList, Merge, Flatten, Nest, Harmonize, Extract, CrossProduct and Duplicate. `DuplicateFileToCollectionTool` copies one HDA `number` times, so it has the S2 shape. So do the N x M loops in `CrossProductFlatCollectionTool` and `CrossProductNestedCollectionTool` (`lib/galaxy/tools/__init__.py:3793`, `:3831`), which copy each source once per pair.
- **Transaction scope:** a map-over commits once at the end of `lib/galaxy/tools/execute.py::execute`, so these locks accumulate across the whole execution.
- **Flush hygiene:** fine. `_lock_source_of_copy` uses `no_autoflush`, so it doesn't add flushes in `flush=False` loops.
- **Unbounded query:** none added. `committed_copies` is bounded by copies of one HDA, on an indexed predicate.
- **Async handlers, recursive CTEs, client polling:** not relevant.

## Considered and not raised as findings

- **Lock wait length.** The PR already says `copy_from` waits for open transactions and that the copier holds its lock until commit, so I'm not re-opening that decision. The 8 s above only puts a number on it. There is no `lock_timeout`, so the wait is bounded by the other transaction, and the blocked party is a job runner worker thread. Whether that starves a runner pool in practice is speculative; I didn't test it. If a long wait is a concern, add a `pg_stat_activity` check on a production-size history copy to a pre-release smoke test.
- **Extra queries in `copy_from` (S6, S7).** This goes from 1 to 3 statements per HDA: the relationship load, the `FOR UPDATE`, and `committed_copies`, which overlaps the relationship load. It's only paid on late cache hits, which should be rare, though I have no production rate. S6 and S7 hold their locks longer as a result. Dropping the overlap has to keep unflushed in-session copies, so it isn't a cheap change for this release fix.
- **`hda not in copies`** is quadratic in copies of one HDA. It's negligible at realistic copy counts, and I didn't isolate its share of S7.
- **MultiXact pressure** from concurrent `KEY SHARE` lockers on one row. Inserts referencing the row already take this lock, so the likely change is small, but I measured a single client only. Speculative.

## Noted for the bug reviewer, not verified

`copy_from_job` locks `self_io.out_data` in id order, but `replace_elements_with_copies` locks element HDAs in `zip(self.elements, replacements)` order. Elements that aren't in `out_data` may be locked outside the id-ordered pass. I didn't check whether that can deadlock.

## Recommendations

See [performance_challenges_review.md](performance_challenges_review.md): P3 1 (skip repeat locks within a transaction). Batching locks on bulk copy paths is recorded there as a possible follow-up, not a finding, because the PR already states that cost and the wall-time delta is close to noise.

Measurement plan for anything still open, on a production-size database:

1. Count `FOR KEY SHARE` statements per workflow scheduling pass for a real cross-product or map-over on in-flight lists.
2. Sample `pg_stat_activity` for `Lock` waits with the `FOR UPDATE` query text, to get real swap wait times.
3. Watch `pg_stat_slru` for MultiXact activity before and after deployment.
