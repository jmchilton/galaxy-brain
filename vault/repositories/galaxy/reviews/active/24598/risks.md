Risks are minimal - this change doesn't lock Galaxy into particular difficult to change choices (a two-way door). The one admin-visible effect is that `pgcleanup.py` runs which previously exited 0 after logging a run-sequence exception now exit 1.

<details><summary>Risk Details</summary>

- Cron jobs, systemd timers, Ansible tasks or wrapper scripts that run `pgcleanup.py` now see a failure (and may send mail or alert) where they used to see success. This is the point of the fix, but admins whose cleanup has been failing silently will start getting alerts after upgrading.
- Partial runs keep the same behavior. Actions run in order, each commits its own transaction, and the first exception stops the sequence. Earlier actions stay committed and later ones never run. Only the exit code changes, so callers can't tell "nothing ran" apart from "some actions committed".
- `sys.exit(1)` is raised inside the `with Cleanup()` block, so `__exit__` still closes the DB connection and the log file. Cleanup on the error path is unchanged.
- Failures outside `app.run()` (bad config, connection errors in `Cleanup()`/`__enter__`) already raised and exited nonzero. This PR does not change them.

</details>

<details><summary>Risk Review Advice</summary>

Decide whether this belongs in release notes as an admin-facing change ("pgcleanup now exits 1 on action failure"), since wrappers that relied on the old always-0 exit will now report errors. Rollback is a one-line revert.

</details>
