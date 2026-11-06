# Caveat experiments: #24673

Run on PostgreSQL 16.2 at `7db61c5f53a` with [caveats.py](caveats.py), model methods only. The database came from `create_all`, so Galaxy's audit triggers weren't installed.

## Undetected hang through `_next_hid`

A transaction flushes an update to the `history` row and stays open. A late hit that adds to that history blocks in `_next_hid` on its second connection, holding its output lock on the first. The first transaction then copies that output and blocks on the lock. PostgreSQL sees no cycle because the runner's first connection is idle. Both were still stuck 12 s later, with `deadlock_timeout` at 1 s, until I terminated the backends. The PR sets no `lock_timeout`.

The runner side needs `requires_addition_to_history`: discovered primary outputs, or output collections that have elements to add. The experiment used a discovered primary output and forced `history.genome_build` plus a flush on the other side.

No production path to that first step was found:

- `update_audit_table.py` triggers only insert into `history_audit`. By its foreign key that takes `KEY SHARE` on `history`, which doesn't conflict, and the triggers don't update `history`. This was read, not run.
- No `with_for_update` in `lib/galaxy` targets `History`.
- `History.update()` has no callers matched by grep.
- `hid_counter` updates commit on their own connection, on PostgreSQL.
- The `genome_build` setters are in `add_dataset`/`add_datasets`, called from upload, dereference and the async controller. None was shown to flush and then copy an in-flight HDA in one transaction.

These were greps of `lib/galaxy`, not a trace of every flow.

## Deadlock on a single output

A copier copies a copy and then its source while a one-output late hit swaps in between. PostgreSQL aborted the runner after 1 s. The description scopes this deadlock to jobs with several outputs. `replace_elements_with_copies` locking outside the id-ordered pass (performance debrief) is the same class; not separately tested.

## Deadlock recovery

After that deadlock `session.refresh` raises `InFailedSqlTransaction`, and `JobWrapper.fail` starts with a refresh. From reading `run_next`, the job then fails through a requeued `fail_job` with a generic message. That part was not run.
