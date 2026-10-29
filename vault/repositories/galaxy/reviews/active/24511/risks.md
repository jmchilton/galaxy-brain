Profile: gx_risk_assessment · Model: Claude Opus 5.5 · Effort: low · Reviewed commit: 46102a0d363

The main one-way risk is a quota policy change on a release branch. Copies of other users' datasets, cached-job outputs, and imported histories now count toward a user's quota as soon as they're added, so users on quota-enforcing servers may suddenly hit their limit after a point upgrade. Rolling the code back won't undo usage values already written.

<details><summary>Risk Details</summary>

- Policy change: users are now charged for copies of others' datasets (shared or published histories, workflow inputs, collection copies), cached-job outputs, and model store or archive imports. This matches what a recalculation already counted, but admins and users will see quota changes after a point upgrade.
- Job `finish()` and `fail()` now charge every user who holds an output, not just `job.user`. Failed jobs' partial outputs now count too. This is a new accounting rule that later code will build on.
- On Postgres, a recalculation now applies a delta (recalculated value minus the snapshot value) instead of overwriting the stored value. It is correct only if every adjustment uses the new atomic `coalesce(disk_usage,0)+delta` path. Any code that still assigns `disk_usage` directly, including plugins or downstream forks, could now drift without being corrected. SQLite keeps the overwrite, so the two backends now behave differently.
- `User.disk_usage` can now hold a pending SQL expression (`ClauseElement`) until the next flush. Code that reads `user.disk_usage` directly, rather than `get_disk_usage()`, can get an expression object instead of a number.
- Every non-default quota source adjustment now takes a new `SELECT ... FOR UPDATE` lock on the `galaxy_user` row, and job finish locks the holders' rows in id order. This adds lock contention on the user row for busy users and shared datasets.
- History purge now marks HDAs purged and adjusts usage synchronously in the request before the Celery tasks run. Purging a large history makes the request slower, and the purge ordering changes.
- The PR does not repair usage that is already wrong. Admins must run `scripts/set_user_disk_usage.py` or users must press Refresh. Usage written incorrectly by the old or new code stays in the database after any rollback.
- The PR is large (16 files, ~800 lines) for a `release_25.1` backport and touches job finish, purge, copy, import, and login paths together.

</details>

<details><summary>Risk Review Advice</summary>

Maintainers should confirm that charging recipients for copied, cached, and imported data is acceptable in a 25.1 point release rather than only on dev. If it is, it needs a release note telling quota-enforcing admins to recalculate usage. The PR body flags this behaviour change, but the release target is the real decision.

Technically, focus on the Postgres delta-style recalculation SQL and the new pending `disk_usage` expression in `User.adjust_total_disk_usage`. Look for any remaining direct reads or writes of `disk_usage`, and check the lock ordering (user row, then quota source rows; holders sorted by id) against job handlers running concurrently. `dataset_holders()` reads unflushed session state, so its correctness depends on the session not autoflushing. That assumption deserves a second look.

</details>
